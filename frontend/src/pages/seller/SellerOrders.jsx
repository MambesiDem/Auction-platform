import { latestPayment } from '../../utils/auctionLifecycle';
import OrderTools from '../../components/OrderTools';
import { useAuctionSync } from '../../utils/auctionLifecycle';
import { getAllPages } from '../../api/transactions';
import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerOrders.module.css';

const TABS = ['All', 'Awaiting Delivery', 'In Progress', 'Delivered', 'Cancelled'];

export default function SellerOrders() {
    const [orderRecords, setOrderRecords] = useState([]);
    const { user } = useAuth();
    const [deliveries, setDeliveries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    const fetchData = useCallback(async () => {
        try {
            const [deliveriesRes, paymentsRes, auctionsRes, recordsRes] = await Promise.all([
                axiosInstance.get('/api/deliveries/my-sales'),
                axiosInstance.get('/api/payments/my-earnings'),
                getAllPages('/api/auctions/my-listings'),
                axiosInstance.get('/api/orders/mine'),
            ]);
            setDeliveries(deliveriesRes.data);
            setOrderRecords(recordsRes.data);
            setPayments(paymentsRes.data);
            const mine = auctionsRes.data.filter(a => a.ownerEmail === user?.email);
            setAuctions(mine);
        } catch (err) {
            console.error('Failed to load orders', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useAuctionSync(fetchData);

    // Poll every 30 seconds
    useEffect(() => {
        const poll = setInterval(() => fetchData(), 30000);
        return () => clearInterval(poll);
    }, [fetchData]);

    const handleCreateDelivery = async (auctionId) => {
        try {
            const preparationEvidence = window.prompt('Before collection, confirm that the item matches the listing. Record its condition, packaging and photo reference:');
            if (!preparationEvidence?.trim()) return;
            await axiosInstance.post('/api/deliveries', { auctionId, preparationEvidence });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create delivery.');
        }
    };

    // Closed auctions with winner that don't have a delivery yet
    const closedWithoutDelivery = auctions.filter(a =>
        !a.active &&
        a.winnerEmail &&
        !deliveries.some(d => d.auctionId === a.id)
    );

    const getTabStatus = (delivery) => {
        if (['DELIVERED'].includes(delivery.status)) return 'Delivered';
        if (['CANCELLED'].includes(delivery.status)) return 'Cancelled';
        if (['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)) return 'In Progress';
        return 'Awaiting Delivery';
    };

    const filtered = (() => {
        if (activeTab === 'Awaiting Delivery') return deliveries.filter(d => getTabStatus(d) === 'Awaiting Delivery');
        if (activeTab === 'In Progress') return deliveries.filter(d => getTabStatus(d) === 'In Progress');
        if (activeTab === 'Delivered') return deliveries.filter(d => getTabStatus(d) === 'Delivered');
        if (activeTab === 'Cancelled') return deliveries.filter(d => getTabStatus(d) === 'Cancelled');
        return deliveries;
    })();

    const tabCount = (tab) => {
        if (tab === 'All') return deliveries.length;
        return deliveries.filter(d => getTabStatus(d) === tab).length;
    };

    const getStatusLabel = (status) => {
        const map = {
            PENDING: 'Pending', ACCEPTED: 'Driver Assigned',
            PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit',
            DELIVERED: 'Delivered', CANCELLED: 'Cancelled'
        };
        return map[status] || status;
    };

    const getStatusColor = (status) => {
        if (status === 'DELIVERED') return styles.statusGreen;
        if (status === 'CANCELLED') return styles.statusGray;
        if (['PICKED_UP', 'IN_TRANSIT'].includes(status)) return styles.statusBlue;
        if (status === 'ACCEPTED') return styles.statusPurple;
        return styles.statusAmber;
    };

    const getDeliveryStep = (status) => {
        return ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].indexOf(status);
    };

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading orders...</div>
            </div>
            <BottomNav role="SELLER" />
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <details style={{ marginBottom:16 }}><summary>Order records, handover codes and buyer cases</summary>
                        {orderRecords.map(o => <div key={o.id} style={{padding:12,borderBottom:'1px solid #e5e7eb'}}>
                            <strong>{o.title}</strong> — {o.status.replaceAll('_',' ')}
                            <OrderTools auction={{id:o.auctionId,orderId:o.id,orderStatus:o.status}} payment={payments.filter(p=>p.orderId===o.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]}
                                delivery={deliveries.find(d=>d.auctionId===o.auctionId)} refresh={fetchData} />
                        </div>)}
                    </details>
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>My Orders</h1>
                            <p className={styles.pageSubtitle}>
                                {deliveries.length} order{deliveries.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>

                    {/* Pending deliveries to create */}
                    {closedWithoutDelivery.length > 0 && (
                        <div className={styles.actionNeeded}>
                            <div className={styles.actionNeededHeader}>
                                <span className={styles.actionNeededIcon}>⚠️</span>
                                <h3 className={styles.actionNeededTitle}>
                                    Action needed — {closedWithoutDelivery.length} auction{closedWithoutDelivery.length !== 1 ? 's' : ''} need{closedWithoutDelivery.length === 1 ? 's' : ''} a delivery
                                </h3>
                            </div>
                            {closedWithoutDelivery.map(auction => {
                                const payment = latestPayment(payments, auction);
                                const paymentReady = payment &&
                                    payment.status === 'HELD' && ['PREPARATION','COLLECTION_PENDING'].includes(auction.orderStatus);
                                return (
                                    <div key={auction.id} className={styles.actionRow}>
                                        {auction.imageUrl ? (
                                            <img
                                                src={auction.imageUrl}
                                                alt={auction.title}
                                                className={styles.actionImg}
                                            />
                                        ) : (
                                            <div className={styles.actionImgPlaceholder}>📦</div>
                                        )}
                                        <div className={styles.actionInfo}>
                                            <p className={styles.actionTitle}>{auction.title}</p>
                                            <p className={styles.actionMeta}>
                                                Won by {auction.winnerEmail} ·
                                                R{auction.currentPrice?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={styles.actionRight}>
                                            {paymentReady ? (
                                                <button
                                                    className={styles.createDeliveryBtn}
                                                    onClick={() => handleCreateDelivery(auction.id)}
                                                >
                                                    🚚 Create delivery
                                                </button>
                                            ) : (
                                                <span className={styles.awaitingPayment}>
                                                    ⏳ Awaiting buyer payment
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
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                <span className={styles.tabCount}>{tabCount(tab)}</span>
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
                                    : `No ${activeTab.toLowerCase()} orders.`}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {filtered.map(delivery => {
                                const payment = payments.find(p => p.auctionId === delivery.auctionId);
                                const deliveryStep = getDeliveryStep(delivery.status);

                                return (
                                    <div key={delivery.id} className={styles.orderCard}>

                                        {/* Order header */}
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderHeaderLeft}>
                                                <div className={styles.orderIcon}>📦</div>
                                                <div>
                                                    <h3 className={styles.orderTitle}>
                                                        {delivery.auctionTitle}
                                                    </h3>
                                                    <p className={styles.orderMeta}>
                                                        Buyer: {delivery.buyerEmail}
                                                        {delivery.driverEmail && (
                                                            <span> · Driver: {delivery.driverEmail}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={styles.orderHeaderRight}>
                                                {payment && (
                                                    <div className={styles.paymentInfo}>
                                                        <span className={styles.paymentLabel}>
                                                            {payment.status === 'HELD' ? '🔒 Payment confirmed' :
                                                             payment.status === 'RELEASED' ? '✅ Payout confirmed' :
                                                             payment.status === 'REFUNDED' ? '↩️ Refunded' :
                                                             '⏳ Awaiting payment'}
                                                        </span>
                                                        {payment.status === 'RELEASED' && (
                                                            <span className={styles.paymentAmount}>
                                                                R{payment.sellerAmount?.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <span className={`${styles.statusBadge} ${getStatusColor(delivery.status)}`}>
                                                    {getStatusLabel(delivery.status)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delivery tracker */}
                                        <div className={styles.tracker}>
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

                                        {/* No driver yet */}
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