import { latestPayment, useAuctionSync } from '../../utils/auctionLifecycle';
import OrderTools from '../../components/OrderTools';
import { getAllPages } from '../../api/transactions';
import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerOrders.module.css';

const TABS = [
    'All',
    'Awaiting Delivery',
    'In Progress',
    'Delivered',
    'Cancelled',
];

const PAYMENT_LABELS = {
    PENDING: '⏳ Awaiting payment confirmation',
    FAILED: 'Payment attempt failed',
    HELD: '🔒 Payment confirmed',
    RELEASE_REQUESTED: '⏳ Payout awaiting provider confirmation',
    RELEASED: '✅ Payout confirmed',
    REFUND_REQUESTED: '⏳ Refund awaiting provider confirmation',
    REFUNDED: '↩️ Refund confirmed',
    REVIEW_REQUIRED: 'Payment under review — contact support',
};

function getPaymentLabel(status) {
    return PAYMENT_LABELS[status] || 'Payment status unavailable';
}

function newestPayment(payments) {
    return [...payments].sort((a, b) => {
        const timeDifference =
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime();

        return timeDifference ||
            String(b.id).localeCompare(String(a.id));
    })[0];
}

function getDeliveryPayment(payments, delivery) {
    return newestPayment(
        payments.filter(payment => {
            if (delivery.orderId) {
                return payment.orderId === delivery.orderId;
            }

            // Compatibility for deliveries without an Order reference.
            return Boolean(delivery.auctionId) &&
                payment.auctionId === delivery.auctionId;
        })
    );
}

function getOrderDelivery(deliveries, order) {
    const exactMatch = deliveries.find(
        delivery => delivery.orderId === order.id
    );

    if (exactMatch) {
        return exactMatch;
    }

    // Do not associate a delivery already linked to another order.
    return deliveries.find(delivery =>
        !delivery.orderId &&
        Boolean(order.auctionId) &&
        delivery.auctionId === order.auctionId
    );
}

export default function SellerOrders() {
    const { user } = useAuth();

    const [orderRecords, setOrderRecords] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    const fetchData = useCallback(async () => {
        try {
            const [
                deliveriesRes,
                paymentsRes,
                auctionsRes,
                recordsRes,
            ] = await Promise.all([
                axiosInstance.get('/api/deliveries/my-sales'),
                axiosInstance.get('/api/payments/my-earnings'),
                getAllPages('/api/auctions/my-listings'),
                axiosInstance.get('/api/orders/mine'),
            ]);

            setDeliveries(deliveriesRes.data);
            setOrderRecords(recordsRes.data);
            setPayments(paymentsRes.data);

            const mine = auctionsRes.data.filter(
                auction => auction.ownerEmail === user?.email
            );

            setAuctions(mine);
        } catch (err) {
            console.error('Failed to load orders', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useAuctionSync(fetchData);

    // Retain the existing refresh behaviour for this display fix.
    useEffect(() => {
        const poll = setInterval(() => fetchData(), 30000);

        return () => clearInterval(poll);
    }, [fetchData]);

    const handleCreateDelivery = async (auctionId) => {
        try {
            const preparationEvidence = window.prompt(
                'Before collection, confirm that the item matches the listing. ' +
                'Record its condition, packaging and photo reference:'
            );

            if (!preparationEvidence?.trim()) {
                return;
            }

            await axiosInstance.post('/api/deliveries', {
                auctionId,
                preparationEvidence,
            });

            fetchData();
        } catch (err) {
            alert(
                err.response?.data?.message ||
                'Failed to create delivery.'
            );
        }
    };

    const closedWithoutDelivery = auctions.filter(auction =>
        !auction.active &&
        auction.winnerEmail &&
        !deliveries.some(
            delivery => delivery.auctionId === auction.id
        )
    );

    const getTabStatus = (delivery) => {
        if (delivery.status === 'DELIVERED') {
            return 'Delivered';
        }

        if (delivery.status === 'CANCELLED') {
            return 'Cancelled';
        }

        if (
            ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
                .includes(delivery.status)
        ) {
            return 'In Progress';
        }

        return 'Awaiting Delivery';
    };

    const filtered = activeTab === 'All'
        ? deliveries
        : deliveries.filter(
            delivery => getTabStatus(delivery) === activeTab
        );

    const tabCount = (tab) => {
        if (tab === 'All') {
            return deliveries.length;
        }

        return deliveries.filter(
            delivery => getTabStatus(delivery) === tab
        ).length;
    };

    const getStatusLabel = (status) => {
        const labels = {
            PENDING: 'Pending',
            ACCEPTED: 'Driver Assigned',
            PICKED_UP: 'Picked Up',
            IN_TRANSIT: 'In Transit',
            DELIVERED: 'Delivered',
            CANCELLED: 'Cancelled',
        };

        return labels[status] || status;
    };

    const getStatusColor = (status) => {
        if (status === 'DELIVERED') {
            return styles.statusGreen;
        }

        if (status === 'CANCELLED') {
            return styles.statusGray;
        }

        if (['PICKED_UP', 'IN_TRANSIT'].includes(status)) {
            return styles.statusBlue;
        }

        if (status === 'ACCEPTED') {
            return styles.statusPurple;
        }

        return styles.statusAmber;
    };

    const getDeliveryStep = (status) => {
        return [
            'ACCEPTED',
            'PICKED_UP',
            'IN_TRANSIT',
            'DELIVERED',
        ].indexOf(status);
    };

    if (loading) {
        return (
            <div className={styles.layout}>
                <Sidebar role="SELLER" />

                <div className={styles.main}>
                    <TopBar />
                    <div className={styles.loading}>
                        Loading orders...
                    </div>
                </div>

                <BottomNav role="SELLER" />
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <details style={{ marginBottom: 16 }}>
                        <summary>
                            Order records, handover codes and buyer cases
                        </summary>

                        {orderRecords.map(order => (
                            <div
                                key={order.id}
                                style={{
                                    padding: 12,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                <strong>{order.title}</strong>
                                {' — '}
                                {order.status.replaceAll('_', ' ')}

                                <OrderTools
                                    auction={{
                                        id: order.auctionId,
                                        orderId: order.id,
                                        orderStatus: order.status,
                                    }}
                                    payment={newestPayment(
                                        payments.filter(
                                            payment =>
                                                payment.orderId === order.id
                                        )
                                    )}
                                    delivery={getOrderDelivery(
                                        deliveries,
                                        order
                                    )}
                                    refresh={fetchData}
                                />
                            </div>
                        ))}
                    </details>

                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                My Orders
                            </h1>

                            <p className={styles.pageSubtitle}>
                                {deliveries.length} order
                                {deliveries.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>

                    {/* Auctions without a delivery yet */}
                    {closedWithoutDelivery.length > 0 && (
                        <div className={styles.actionNeeded}>
                            <div className={styles.actionNeededHeader}>
                                <span className={styles.actionNeededIcon}>
                                    ⚠️
                                </span>

                                <h3 className={styles.actionNeededTitle}>
                                    Orders awaiting collection arrangements
                                    {' — '}
                                    {closedWithoutDelivery.length}
                                </h3>
                            </div>

                            {closedWithoutDelivery.map(auction => {
                                const payment = latestPayment(
                                    payments,
                                    auction
                                );

                                const paymentReady =
                                    payment?.status === 'HELD' &&
                                    [
                                        'PREPARATION',
                                        'COLLECTION_PENDING',
                                    ].includes(auction.orderStatus);

                                const nonActionableOrder = [
                                    'CANCELLED',
                                    'DISPUTED',
                                    'RETURNING',
                                    'COMPLETED',
                                ].includes(auction.orderStatus);

                                const unavailableLabel = nonActionableOrder
                                    ? `Order: ${auction.orderStatus.replaceAll('_', ' ')}`
                                    : payment
                                        ? getPaymentLabel(payment.status)
                                        : '⏳ Awaiting buyer payment';

                                return (
                                    <div
                                        key={auction.id}
                                        className={styles.actionRow}
                                    >
                                        {auction.imageUrl ? (
                                            <img
                                                src={auction.imageUrl}
                                                alt={auction.title}
                                                className={styles.actionImg}
                                            />
                                        ) : (
                                            <div className={styles.actionImgPlaceholder}>
                                                📦
                                            </div>
                                        )}

                                        <div className={styles.actionInfo}>
                                            <p className={styles.actionTitle}>
                                                {auction.title}
                                            </p>

                                            <p className={styles.actionMeta}>
                                                Won by {auction.winnerEmail}
                                                {' · '}
                                                R{auction.currentPrice?.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className={styles.actionRight}>
                                            {paymentReady ? (
                                                <button
                                                    className={styles.createDeliveryBtn}
                                                    onClick={() =>
                                                        handleCreateDelivery(
                                                            auction.id
                                                        )
                                                    }
                                                >
                                                    🚚 Create delivery
                                                </button>
                                            ) : (
                                                <span className={styles.awaitingPayment}>
                                                    {unavailableLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${
                                    activeTab === tab
                                        ? styles.tabActive
                                        : ''
                                }`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}

                                <span className={styles.tabCount}>
                                    {tabCount(tab)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Orders list */}
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                📦
                            </div>

                            <h3 className={styles.emptyTitle}>
                                No orders here
                            </h3>

                            <p className={styles.emptySub}>
                                {activeTab === 'All'
                                    ? "You don't have any delivery orders yet."
                                    : `No ${activeTab.toLowerCase()} orders.`}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {filtered.map(delivery => {
                                const payment = getDeliveryPayment(
                                    payments,
                                    delivery
                                );

                                const deliveryStep = getDeliveryStep(
                                    delivery.status
                                );

                                return (
                                    <div
                                        key={delivery.id}
                                        className={styles.orderCard}
                                    >
                                        {/* Order header */}
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderHeaderLeft}>
                                                <div className={styles.orderIcon}>
                                                    📦
                                                </div>

                                                <div>
                                                    <h3 className={styles.orderTitle}>
                                                        {delivery.listingTitle ||
                                                            delivery.auctionTitle}
                                                    </h3>

                                                    <p className={styles.orderMeta}>
                                                        Buyer: {delivery.buyerEmail}

                                                        {delivery.driverEmail && (
                                                            <span>
                                                                {' · '}
                                                                Driver: {delivery.driverEmail}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.orderHeaderRight}>
                                                <div className={styles.paymentInfo}>
                                                    <span className={styles.paymentLabel}>
                                                        {payment
                                                            ? getPaymentLabel(
                                                                payment.status
                                                            )
                                                            : 'Payment status unavailable'}
                                                    </span>

                                                    {payment?.status === 'RELEASED' && (
                                                        <span className={styles.paymentAmount}>
                                                            R{payment.sellerAmount?.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <span
                                                    className={`${styles.statusBadge} ${
                                                        getStatusColor(
                                                            delivery.status
                                                        )
                                                    }`}
                                                >
                                                    {getStatusLabel(delivery.status)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delivery tracker */}
                                        <div className={styles.tracker}>
                                            {[
                                                {
                                                    key: 'ACCEPTED',
                                                    label: 'Driver assigned',
                                                },
                                                {
                                                    key: 'PICKED_UP',
                                                    label: 'Picked up',
                                                },
                                                {
                                                    key: 'IN_TRANSIT',
                                                    label: 'In transit',
                                                },
                                                {
                                                    key: 'DELIVERED',
                                                    label: 'Delivered',
                                                },
                                            ].map((step, index) => (
                                                <div
                                                    key={step.key}
                                                    className={styles.trackerStep}
                                                >
                                                    <div
                                                        className={`${styles.trackerDot} ${
                                                            index <= deliveryStep
                                                                ? styles.trackerDotDone
                                                                : ''
                                                        }`}
                                                    >
                                                        {index <= deliveryStep
                                                            ? '✓'
                                                            : index + 1}
                                                    </div>

                                                    <p
                                                        className={`${styles.trackerLabel} ${
                                                            index <= deliveryStep
                                                                ? styles.trackerLabelDone
                                                                : ''
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </p>

                                                    {index < 3 && (
                                                        <div
                                                            className={`${styles.trackerLine} ${
                                                                index < deliveryStep
                                                                    ? styles.trackerLineDone
                                                                    : ''
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {delivery.status === 'PENDING' && (
                                            <div className={styles.noDriver}>
                                                🚗 Waiting for a driver to accept this job
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role="SELLER" />
        </div>
    );
}