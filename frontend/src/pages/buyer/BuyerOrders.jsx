import OrderTools from '../../components/OrderTools';
import RunnerUpOffers from '../../components/RunnerUpOffers';
import { latestPayment, auctionDate, useAuctionSync, canPayForAuction } from '../../utils/auctionLifecycle';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { getAllPages, paymentLabel } from '../../api/transactions';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './BuyerOrders.module.css';
import extras from './BuyerOrdersExtras.module.css';

const TABS = ['All', 'Under Review', 'Awaiting Payment', 'Payment Confirmed', 'In Delivery', 'Delivered', 'Cancelled'];

const rand = (value) =>
    `R${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

function newestPayment(list) {
    return [...list].sort((a, b) => {
        const timeDifference =
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime();

        return timeDifference ||
            String(b.id).localeCompare(String(a.id));
    })[0];
}

function buyerNextStep(delivery, payment) {
    if (delivery) {
        switch (delivery.status) {
            case 'PENDING':
                return 'The seller has booked collection. Waiting for a driver to accept.';
            case 'ACCEPTED':
                return 'A driver has accepted and will collect your parcel from the seller.';
            case 'PICKED_UP':
            case 'IN_TRANSIT':
                return 'Your parcel is on its way. Give the delivery code to the driver only after you have received it.';
            case 'DELIVERED':
                return 'Delivered. If something is not right, report a problem below.';
            default:
                return null;
        }
    }

    if (payment?.status === 'HELD') {
        return 'Payment confirmed. The seller is preparing your order and will book a driver.';
    }

    return null;
}

export default function BuyerOrders() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [wins, setWins] = useState([]);
    const [payments, setPayments] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offers, setOffers] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [paymentTimers, setPaymentTimers] = useState({});
    const [notice, setNotice] = useState(null);
    const [payingId, setPayingId] = useState(null);

    const fetchData = useCallback(async () => {
        const offerRequest = axiosInstance.get('/api/auctions/offers').then(r => setOffers(r.data)).catch(e => console.error('Offers unavailable', e));
        try {
            const [winsRes, paymentsRes, deliveriesRes, orderRecordsRes] = await Promise.all([
                getAllPages('/api/auctions/my-wins'),
                axiosInstance.get('/api/payments/my-payments'),
                axiosInstance.get('/api/deliveries/my-purchases'),
                axiosInstance.get('/api/orders/mine'),
            ]);
            setWins(orderRecordsRes.data.map(o => {
                const current = winsRes.data.find(a => a.orderId === o.id);
                return {
                    ...(current || {}),
                    id: o.auctionId,
                    orderId: o.id,
                    title: o.title,
                    description: o.description,
                    currentPrice: o.agreedPrice,
                    active: false,
                    orderStatus: o.status,
                    paymentDeadline: o.paymentDeadline,
                    canPay: current?.canPay === true,
                    paymentEligibility: current?.paymentEligibility,
                    isBuyNow: o.saleFormat === 'BUY_NOW',
                    quantity: o.quantity,
                    unitPrice: o.unitPrice,
                };
            }));
            setPayments(paymentsRes.data);
            setDeliveries(deliveriesRes.data);
        } catch (err) {
            console.error('Failed to fetch orders', err);
        } finally {
            await offerRequest;
            setLoading(false);
        }
    }, []);

    const clock = useAuctionSync(fetchData);

    // Payment deadline timers, keyed by order so Buy Now orders do not share one.
    useEffect(() => {
        const updated = {};
        wins.forEach(a => {
            if (!a.paymentDeadline) return;
            const diff = auctionDate(a.paymentDeadline) - new Date();
            updated[a.orderId] = diff <= 0 ? 'EXPIRED'
                : `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`;
        });
        setPaymentTimers(updated);
    }, [wins, clock]);

    // Auction cancellation works by auction id. Buy Now cancellation is not available online yet.
    const handleCancelPayment = async (auctionId) => {
        if (!window.confirm('Cancel before pickup? Delivery will stop and a refund will be requested. It is confirmed only after the provider processes it.')) return;
        try {
            await axiosInstance.put(`/api/payments/${auctionId}/cancel`);
            setNotice({
                type: 'success',
                text: 'Cancellation requested. Your refund is confirmed only after the provider processes it.',
            });
            fetchData();
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Failed to cancel order.',
            });
        }
    };

    // Starts the PayFast checkout for a Buy Now order.
    const handlePayBuyNow = async (orderId) => {
        if (payingId) return;

        setPayingId(orderId);
        setNotice(null);

        try {
            const response = await axiosInstance.post(`/api/payments/initiate-order/${orderId}`);
            const target = typeof response.data === 'string' ? response.data.trim() : '';

            if (!/^https:\/\//i.test(target)) {
                throw new Error('Unexpected payment response');
            }

            window.location.assign(target);
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Payment could not be started. Please try again.',
            });
            setPayingId(null);
        }
    };

    // Build combined order objects
    const orders = wins.map(auction => {
        const payment = auction.isBuyNow
            ? newestPayment(payments.filter(p => p.orderId === auction.orderId))
            : latestPayment(payments, auction);

        // Match the delivery by order. The auction fallback is only for old deliveries without an order.
        const delivery = deliveries.find(d => d.orderId === auction.orderId)
            || (auction.id
                ? deliveries.find(d => !d.orderId && d.auctionId === auction.id)
                : undefined);

        return { auction, payment, delivery };
    });

    // Determine order status for tab filtering
    const getOrderStatus = ({ auction, payment, delivery }) => {
        if (['DISPUTED','RETURNING'].includes(auction.orderStatus)) return 'Under Review';
        if (auction.orderStatus === 'CANCELLED' || ['REFUND_REQUESTED','REFUNDED'].includes(payment?.status)) return 'Cancelled';
        if (!payment || ['PENDING', 'FAILED'].includes(payment.status)) return 'Awaiting Payment';
        if (payment.status === 'REFUNDED' || delivery?.status === 'CANCELLED') return 'Cancelled';
        if (delivery?.status === 'DELIVERED') return 'Delivered';
        if (payment.status === 'HELD' && delivery) return 'In Delivery';
        if (payment.status === 'HELD') return 'Payment Confirmed';
        if (['RELEASE_REQUESTED','RELEASED'].includes(payment.status)) return 'Delivered';
        return 'Awaiting Payment';
    };

    // Auction orders use the server's payment eligibility. Buy Now orders are checked here,
    // and the server still refuses payment that is not allowed.
    const isPayable = (auction, payment) => {
        if (!auction.isBuyNow) return canPayForAuction(auction, payment);

        return auction.orderStatus === 'AWAITING_PAYMENT'
            && Boolean(auction.paymentDeadline)
            && Date.now() < auctionDate(auction.paymentDeadline).getTime()
            && (!payment || ['PENDING', 'FAILED'].includes(payment.status));
    };

    const filtered = activeTab === 'All'
        ? orders
        : orders.filter(o => getOrderStatus(o) === activeTab);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Awaiting Payment': return styles.statusAmber;
            case 'Payment Confirmed':        return styles.statusBlue;
            case 'In Delivery':      return styles.statusPurple;
            case 'Delivered':        return styles.statusGreen;
            case 'Cancelled':        return styles.statusGray;
            default:                 return styles.statusAmber;
        }
    };

    const getDeliveryStep = (status) => {
        const steps = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
        return steps.indexOf(status);
    };

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading your orders...</div>
            </div>
            <BottomNav role={user?.role} />
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <RunnerUpOffers offers={offers} refresh={fetchData} />

                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>My Orders</h1>
                            <p className={styles.pageSubtitle}>
                                {orders.length} order{orders.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>

                    {notice && (
                        <div
                            className={`${extras.notice} ${
                                notice.type === 'error' ? extras.noticeError : extras.noticeSuccess
                            }`}
                            role="status"
                        >
                            <span>{notice.text}</span>
                            <button
                                type="button"
                                className={extras.noticeClose}
                                aria-label="Dismiss message"
                                onClick={() => setNotice(null)}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                <span className={styles.tabCount}>
                                    {tab === 'All'
                                        ? orders.length
                                        : orders.filter(o => getOrderStatus(o) === tab).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Orders list */}
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📦</div>
                            <h3 className={styles.emptyTitle}>No orders here</h3>
                            <p className={styles.emptySub}>
                                {activeTab === 'All'
                                    ? "You don't have any orders yet."
                                    : `No orders with status "${activeTab}".`}
                            </p>
                            <div className={extras.emptyButtons}>
                                <button
                                    className={styles.browseBtn}
                                    onClick={() => navigate('/buyer/browse')}
                                >
                                    Browse auctions
                                </button>
                                <button
                                    className={extras.secondaryBtn}
                                    onClick={() => navigate('/buyer/browse?mode=buy-now')}
                                >
                                    Browse Buy Now
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {filtered.map(({ auction, payment, delivery }) => {
                                const status = getOrderStatus({ auction, payment, delivery });
                                const paymentTimer = paymentTimers[auction.orderId];
                                const paymentPending = !payment || ['PENDING', 'FAILED'].includes(payment.status);
                                const canPay = isPayable(auction, payment);
                                const deliveryStep = delivery ? getDeliveryStep(delivery.status) : -1;
                                const beforePickup = !delivery ||
                                    delivery.status === 'PENDING' ||
                                    delivery.status === 'ACCEPTED';
                                const canCancel = !auction.isBuyNow && payment?.status === 'HELD' && beforePickup;
                                const buyNowCancelNote = auction.isBuyNow && payment?.status === 'HELD' && beforePickup;
                                const quantity = auction.quantity || 1;
                                const priceText = auction.isBuyNow && quantity > 1
                                    ? `${quantity} × ${rand(auction.unitPrice)} = ${rand(auction.currentPrice)}`
                                    : rand(auction.currentPrice);
                                const hint = buyerNextStep(delivery, payment);
                                const paying = payingId === auction.orderId;

                                return (
                                    <div key={auction.orderId} className={styles.orderCard}>
                                        {/* Order header */}
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderHeaderLeft}>
                                                {auction.imageUrl ? (
                                                    <img
                                                        src={auction.imageUrl}
                                                        alt={auction.title}
                                                        className={styles.orderImage}
                                                    />
                                                ) : (
                                                    <div className={extras.placeholder}>📦</div>
                                                )}
                                                <div>
                                                    <h3 className={styles.orderTitle}>
                                                        {auction.title}
                                                        <span className={`${extras.chip} ${auction.isBuyNow ? '' : extras.chipAuction}`}>
                                                            {auction.isBuyNow ? 'Buy Now' : 'Auction'}
                                                        </span>
                                                    </h3>
                                                    <p className={styles.orderPrice}>{priceText}</p>
                                                </div>
                                            </div>
                                            <span className={`${styles.statusBadge} ${getStatusColor(status)}`}>
                                                {status}
                                            </span>
                                        </div>

                                        {/* Payment countdown */}
                                        {canPay && (
                                            <div className={styles.urgentBanner}>
                                                <span>⏱</span>
                                                <span>
                                                    Pay within <strong>{paymentTimer || 'the deadline'}</strong>
                                                    {auction.isBuyNow ? ' to complete your order' : ' before the deadline'}
                                                </span>
                                                <button
                                                    className={styles.payNowBtn}
                                                    disabled={paying}
                                                    style={{ opacity: paying ? 0.6 : 1, cursor: paying ? 'not-allowed' : 'pointer' }}
                                                    onClick={() => (
                                                        auction.isBuyNow
                                                            ? handlePayBuyNow(auction.orderId)
                                                            : navigate(`/payment/${auction.id}`)
                                                    )}
                                                >
                                                    {paying ? 'Opening PayFast...' : 'Pay Now'}
                                                </button>
                                            </div>
                                        )}

                                        {paymentPending && paymentTimer === 'EXPIRED' && (
                                            <div className={styles.expiredBanner}>
                                                ⚠️ {auction.paymentEligibility === 'PAYMENT_PROCESSING' ? 'Payment confirmation is still pending. Do not pay again; contact support if needed.' : 'Payment window expired. Check the order status or contact support.'}
                                            </div>
                                        )}

                                        {/* Payment details */}
                                        {payment && !['PENDING','FAILED'].includes(payment.status) && (
                                            <div className={styles.paymentDetails}>
                                                <div className={styles.paymentRow}>
                                                    <span className={styles.paymentLabel}>Total paid</span>
                                                    <span className={styles.paymentValue}>{rand(payment.totalAmount)}</span>
                                                </div>
                                                <div className={styles.paymentRow}>
                                                    <span className={styles.paymentLabel}>Status</span>
                                                    <span className={styles.paymentValue}>
                                                        {paymentLabel(payment.status)}
                                                    </span>
                                                </div>
                                                {payment.status === 'HELD' && delivery && (
                                                    <div className={styles.paymentRow}>
                                                        <span className={styles.paymentLabel}>Settlement eligibility</span>
                                                        <span className={styles.paymentValue}>Confirmed delivery and review; payout requires provider confirmation</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Delivery code: the server only sends it while the parcel is in transit */}
                                        {delivery?.deliveryCode && (
                                            <div className={extras.codeBox}>
                                                <p className={extras.codeLabel}>Your delivery code</p>
                                                <p className={extras.code}>{delivery.deliveryCode}</p>
                                                <p className={extras.codeHint}>
                                                    Give this code to the driver only after you have received your
                                                    parcel and checked it. Do not share it earlier or by message.
                                                </p>
                                            </div>
                                        )}

                                        <OrderTools auction={auction} payment={payment} delivery={delivery} refresh={fetchData} />

                                        {/* Delivery tracker */}
                                        {delivery && (
                                            <div className={styles.deliveryTracker}>
                                                <p className={styles.trackerTitle}>Delivery status</p>
                                                <div className={styles.trackerSteps}>
                                                    {[
                                                        { key: 'ACCEPTED', label: 'Driver assigned' },
                                                        { key: 'PICKED_UP', label: 'Picked up' },
                                                        { key: 'IN_TRANSIT', label: 'In transit' },
                                                        { key: 'DELIVERED', label: 'Delivered' },
                                                    ].map((step, i) => (
                                                        <div key={step.key} className={styles.trackerStep}>
                                                            <div className={`${styles.trackerDot} ${
                                                                i <= deliveryStep ? styles.trackerDotDone : ''
                                                            }`}>
                                                                {i <= deliveryStep ? '✓' : i + 1}
                                                            </div>
                                                            <p className={`${styles.trackerLabel} ${
                                                                i <= deliveryStep ? styles.trackerLabelDone : ''
                                                            }`}>
                                                                {step.label}
                                                            </p>
                                                            {i < 3 && (
                                                                <div className={`${styles.trackerLine} ${
                                                                    i < deliveryStep ? styles.trackerLineDone : ''
                                                                }`} />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {delivery.driverEmail && (
                                                    <p className={styles.driverInfo}>
                                                        🚗 Driver: {delivery.driverEmail}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {hint && <p className={extras.nextStep}>{hint}</p>}

                                        {/* Actions */}
                                        {canCancel && (
                                            <div className={styles.orderActions}>
                                                <button
                                                    className={styles.cancelBtn}
                                                    onClick={() => handleCancelPayment(auction.id)}
                                                >
                                                    Cancel order
                                                </button>
                                            </div>
                                        )}

                                        {buyNowCancelNote && (
                                            <p className={extras.cancelNote}>
                                                To cancel this Buy Now order before pickup, contact support.
                                                Online cancellation is not available for Buy Now yet.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role={user?.role} />
        </div>
    );
}