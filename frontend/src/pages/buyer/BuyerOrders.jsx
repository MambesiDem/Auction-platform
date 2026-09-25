import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './BuyerOrders.module.css';

const TABS = ['All', 'Awaiting Payment', 'In Escrow', 'In Delivery', 'Delivered', 'Cancelled'];

export default function BuyerOrders() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [wins, setWins] = useState([]);
    const [payments, setPayments] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [paymentTimers, setPaymentTimers] = useState({});

    const fetchData = useCallback(async () => {
        try {
            const [winsRes, paymentsRes, deliveriesRes] = await Promise.all([
                axiosInstance.get('/api/auctions/my-wins'),
                axiosInstance.get('/api/payments/my-payments'),
                axiosInstance.get('/api/deliveries/my-purchases'),
            ]);
            setWins(winsRes.data);
            setPayments(paymentsRes.data);
            setDeliveries(deliveriesRes.data);
        } catch (err) {
            console.error('Failed to fetch orders', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Payment deadline timers
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            wins.forEach(a => {
                if (!a.paymentDeadline) return;
                const diff = new Date(a.paymentDeadline) - new Date();
                updated[a.id] = diff <= 0 ? 'EXPIRED'
                    : `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`;
            });
            setPaymentTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
    }, [wins]);

    const handleCancelPayment = async (auctionId) => {
        if (!window.confirm('Cancel this order? You will be refunded.')) return;
        try {
            await axiosInstance.put(`/api/payments/${auctionId}/cancel`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel order.');
        }
    };

    // Build combined order objects
    const orders = wins.map(auction => {
        const payment = payments.find(p => p.auctionId === auction.id);
        const delivery = deliveries.find(d => d.auctionId === auction.id);
        return { auction, payment, delivery };
    });

    // Determine order status for tab filtering
    const getOrderStatus = ({ payment, delivery }) => {
        if (!payment || payment.status === 'PENDING') return 'Awaiting Payment';
        if (payment.status === 'REFUNDED' || delivery?.status === 'CANCELLED') return 'Cancelled';
        if (delivery?.status === 'DELIVERED') return 'Delivered';
        if (payment.status === 'HELD' && delivery) return 'In Delivery';
        if (payment.status === 'HELD') return 'In Escrow';
        if (payment.status === 'RELEASED') return 'Delivered';
        return 'Awaiting Payment';
    };

    const filtered = activeTab === 'All'
        ? orders
        : orders.filter(o => getOrderStatus(o) === activeTab);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Awaiting Payment': return styles.statusAmber;
            case 'In Escrow':        return styles.statusBlue;
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
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>My Orders</h1>
                            <p className={styles.pageSubtitle}>
                                {orders.length} order{orders.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>

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
                                    ? "You haven't won any auctions yet."
                                    : `No orders with status "${activeTab}".`}
                            </p>
                            <button
                                className={styles.browseBtn}
                                onClick={() => navigate('/buyer/browse')}
                            >
                                Browse auctions
                            </button>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {filtered.map(({ auction, payment, delivery }) => {
                                const status = getOrderStatus({ payment, delivery });
                                const paymentTimer = paymentTimers[auction.id];
                                const paymentPending = !payment || payment.status === 'PENDING';
                                const deliveryStep = delivery ? getDeliveryStep(delivery.status) : -1;
                                const canCancel = payment?.status === 'HELD' && (
                                    !delivery ||
                                    delivery.status === 'PENDING' ||
                                    delivery.status === 'ACCEPTED'
                                );

                                return (
                                    <div key={auction.id} className={styles.orderCard}>
                                        {/* Order header */}
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderHeaderLeft}>
                                                {auction.imageUrl && (
                                                    <img
                                                        src={auction.imageUrl}
                                                        alt={auction.title}
                                                        className={styles.orderImage}
                                                    />
                                                )}
                                                <div>
                                                    <h3 className={styles.orderTitle}>{auction.title}</h3>
                                                    <p className={styles.orderPrice}>
                                                        R{auction.currentPrice?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`${styles.statusBadge} ${getStatusColor(status)}`}>
                                                {status}
                                            </span>
                                        </div>

                                        {/* Payment countdown */}
                                        {paymentPending && paymentTimer && paymentTimer !== 'EXPIRED' && (
                                            <div className={styles.urgentBanner}>
                                                <span>⏱</span>
                                                <span>Pay within <strong>{paymentTimer}</strong> or this win will be reassigned</span>
                                                <button
                                                    className={styles.payNowBtn}
                                                    onClick={() => navigate(`/payment/${auction.id}`)}
                                                >
                                                    Pay Now
                                                </button>
                                            </div>
                                        )}

                                        {paymentPending && paymentTimer === 'EXPIRED' && (
                                            <div className={styles.expiredBanner}>
                                                ⚠️ Payment window expired — win may be reassigned
                                            </div>
                                        )}

                                        {/* Payment details */}
                                        {payment && payment.status !== 'PENDING' && (
                                            <div className={styles.paymentDetails}>
                                                <div className={styles.paymentRow}>
                                                    <span className={styles.paymentLabel}>Total paid</span>
                                                    <span className={styles.paymentValue}>R{payment.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className={styles.paymentRow}>
                                                    <span className={styles.paymentLabel}>Status</span>
                                                    <span className={styles.paymentValue}>
                                                        {payment.status === 'HELD'     ? '🔒 In escrow' :
                                                         payment.status === 'RELEASED' ? '✅ Released to seller' :
                                                         payment.status === 'REFUNDED' ? '↩️ Refunded' : ''}
                                                    </span>
                                                </div>
                                                {payment.status === 'HELD' && delivery && (
                                                    <div className={styles.paymentRow}>
                                                        <span className={styles.paymentLabel}>Released when</span>
                                                        <span className={styles.paymentValue}>Delivery confirmed</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

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

                                        {/* No delivery yet */}
                                        {!delivery && payment?.status === 'HELD' && (
                                            <div className={styles.noDelivery}>
                                                📦 Waiting for seller to create delivery
                                            </div>
                                        )}

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