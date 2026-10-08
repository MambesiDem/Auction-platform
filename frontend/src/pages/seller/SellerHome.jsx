import { getAllPages } from '../../api/transactions';
import { useAuctionSync, auctionState, auctionLabel } from '../../utils/auctionLifecycle';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerHome.module.css';

export default function SellerHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, deliveriesRes, paymentsRes] = await Promise.all([
                getAllPages('/api/auctions/my-listings'),
                axiosInstance.get('/api/deliveries/my-sales'),
                axiosInstance.get('/api/payments/my-earnings'),
            ]);
            const mine = auctionsRes.data.filter(a => a.ownerEmail === user?.email);
            setAuctions(mine);
            setDeliveries(deliveriesRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            console.error('Failed to load seller data', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const clock = useAuctionSync(fetchData, true);



    const activeAuctions = auctions.filter(a => auctionState(a, clock) !== 'Closed');
    const closedAuctions = auctions.filter(a => auctionState(a, clock) === 'Closed');
    const totalEarnings = payments
        .filter(p => p.status === 'RELEASED')
        .reduce((sum, p) => sum + (p.sellerAmount || 0), 0);
    const inEscrow = payments
        .filter(p => p.status === 'HELD')
        .reduce((sum, p) => sum + (p.sellerAmount || 0), 0);
    const pendingOrders = deliveries.filter(
        d => !['DELIVERED', 'CANCELLED'].includes(d.status)
    ).length;
    const itemsSold = payments.filter(p => p.status === 'RELEASED').length;

    // Recent orders — last 5 deliveries
    const recentOrders = deliveries.slice(0, 5);

    const getStatusLabel = (status) => {
        const map = {
            PENDING: 'Pending Pickup', ACCEPTED: 'Driver Assigned',
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

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading your dashboard...</div>
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

                    {/* Hero */}
                    <div className={styles.hero}>
                        <div className={styles.heroText}>
                            <p className={styles.heroGreeting}>
                                Good {getTimeOfDay()}, {user?.fullName?.split(' ')[0]} 👋
                            </p>
                            <h1 className={styles.heroTitle}>
                                Your products create<br/>opportunities. Keep going!
                            </h1>
                            <p className={styles.heroSub}>
                                Local Sellers · Stronger Together
                            </p>
                        </div>
                        <div className={styles.heroBadge}>
                            Local<br/>
                            <span className={styles.heroBadgeAccent}>Sellers</span><br/>
                            Stronger<br/>Together
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.stats}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: '#E8F5E9' }}>💰</div>
                            <div className={styles.statBody}>
                                <p className={styles.statValue}>R{totalEarnings.toLocaleString()}</p>
                                <p className={styles.statLabel}>Total Earnings</p>
                                {inEscrow > 0 && (
                                    <p className={styles.statSub}>+R{inEscrow.toLocaleString()} confirmed by the payment provider</p>
                                )}
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: '#E3F2FD' }}>🛒</div>
                            <div className={styles.statBody}>
                                <p className={styles.statValue}>{activeAuctions.length}</p>
                                <p className={styles.statLabel}>Active Listings</p>
                                <p className={styles.statSub}>{auctions.length} total</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: '#F3E5F5' }}>📦</div>
                            <div className={styles.statBody}>
                                <p className={styles.statValue}>{itemsSold}</p>
                                <p className={styles.statLabel}>Items Sold</p>
                                <p className={styles.statSub}>{closedAuctions.length} auctions closed</p>
                            </div>
                        </div>
                        <div
                            className={styles.statCard}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/seller/orders')}
                        >
                            <div className={styles.statIcon} style={{ background: '#FFF3E0' }}>⏰</div>
                            <div className={styles.statBody}>
                                <p className={styles.statValue}>{pendingOrders}</p>
                                <p className={styles.statLabel}>Pending Orders</p>
                                {pendingOrders > 0 && (
                                    <p className={styles.statSubRed}>Action needed →</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Create listing CTA */}
                    <button
                        className={styles.createCta}
                        onClick={() => navigate('/seller/listings')}
                    >
                        <span>+</span> Create Listing / Auction
                    </button>

                    {/* Quick actions */}
                    <div className={styles.quickActions}>
                        {[
                            { icon: '🏷️', label: 'Create Auction', to: '/seller/listings' },
                            { icon: '📦', label: 'Manage Orders', to: '/seller/orders' },
                            { icon: '📊', label: 'View Analytics', to: '/seller/analytics' },
                            { icon: '✉️', label: 'Messages', to: '/seller/messages' },
                        ].map(action => (
                            <button
                                key={action.label}
                                className={styles.quickAction}
                                onClick={() => navigate(action.to)}
                            >
                                <span className={styles.quickActionIcon}>{action.icon}</span>
                                <span className={styles.quickActionLabel}>{action.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.gridLeft}>

                            {/* Recent Orders */}
                            <div className={styles.section}>
                                <div className={styles.sectionHead}>
                                    <h2 className={styles.sectionTitle}>Recent Orders</h2>
                                    <button
                                        className={styles.viewAll}
                                        onClick={() => navigate('/seller/orders')}
                                    >
                                        View all →
                                    </button>
                                </div>

                                {recentOrders.length === 0 ? (
                                    <p className={styles.empty}>No orders yet.</p>
                                ) : (
                                    recentOrders.map(delivery => {
                                        const payment = payments.find(
                                            p => p.auctionId === delivery.auctionId
                                        );
                                        return (
                                            <div key={delivery.id} className={styles.orderRow}>
                                                <div className={styles.orderImg}>📦</div>
                                                <div className={styles.orderInfo}>
                                                    <p className={styles.orderTitle}>
                                                        {delivery.auctionTitle}
                                                    </p>
                                                    <p className={styles.orderMeta}>
                                                        {delivery.buyerEmail}
                                                    </p>
                                                </div>
                                                <div className={styles.orderRight}>
                                                    {payment && (
                                                        <p className={styles.orderAmount}>
                                                            R{payment.sellerAmount?.toLocaleString()}
                                                        </p>
                                                    )}
                                                    <span className={`${styles.statusBadge} ${getStatusColor(delivery.status)}`}>
                                                        {getStatusLabel(delivery.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Active Auctions */}
                            <div className={styles.section}>
                                <div className={styles.sectionHead}>
                                    <h2 className={styles.sectionTitle}>Active Auctions</h2>
                                    <button
                                        className={styles.viewAll}
                                        onClick={() => navigate('/seller/listings')}
                                    >
                                        View all →
                                    </button>
                                </div>

                                {activeAuctions.length === 0 ? (
                                    <p className={styles.empty}>No active auctions.</p>
                                ) : (
                                    activeAuctions.slice(0, 4).map(auction => (
                                        <div key={auction.id} className={styles.auctionRow}>
                                            {auction.imageUrl ? (
                                                <img
                                                    src={auction.imageUrl}
                                                    alt={auction.title}
                                                    className={styles.auctionImg}
                                                />
                                            ) : (
                                                <div className={styles.auctionImgPlaceholder}>🏷️</div>
                                            )}
                                            <div className={styles.auctionInfo}>
                                                <p className={styles.auctionTitle}>{auction.title}</p>
                                                <p className={styles.auctionMeta}>
                                                    Current: R{auction.currentPrice?.toLocaleString()}
                                                </p>
                                            </div>
                                            <span className={styles.activeBadge}>{auctionLabel(auction, clock)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className={styles.gridRight}>

                            {/* Top Listings */}
                            <div className={styles.rightCard}>
                                <div className={styles.sectionHead}>
                                    <h3 className={styles.rightCardTitle}>Top Listings</h3>
                                    <button
                                        className={styles.viewAll}
                                        onClick={() => navigate('/seller/analytics')}
                                    >
                                        View all →
                                    </button>
                                </div>
                                {closedAuctions.length === 0 ? (
                                    <p className={styles.empty}>No closed auctions yet.</p>
                                ) : (
                                    closedAuctions.slice(0, 5).map((auction, i) => (
                                        <div key={auction.id} className={styles.topItem}>
                                            <span className={styles.topItemRank}>{i + 1}</span>
                                            {auction.imageUrl ? (
                                                <img
                                                    src={auction.imageUrl}
                                                    alt={auction.title}
                                                    className={styles.topItemImg}
                                                />
                                            ) : (
                                                <div className={styles.topItemImgPlaceholder}>📦</div>
                                            )}
                                            <div className={styles.topItemInfo}>
                                                <p className={styles.topItemTitle}>{auction.title}</p>
                                            </div>
                                            <p className={styles.topItemPrice}>
                                                R{auction.currentPrice?.toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Earnings summary */}
                            <div className={`${styles.rightCard} ${styles.rightCardDark}`}>
                                <h3 className={styles.rightCardTitleLight}>Earnings Summary</h3>
                                <div className={styles.earningRow}>
                                    <span className={styles.earningLabel}>Released</span>
                                    <span className={styles.earningValue}>
                                        R{totalEarnings.toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.earningRow}>
                                    <span className={styles.earningLabel}>Payment confirmed</span>
                                    <span className={styles.earningValue}>
                                        R{inEscrow.toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.earningDivider} />
                                <div className={styles.earningRow}>
                                    <span className={styles.earningLabelBold}>Total</span>
                                    <span className={styles.earningValueBold}>
                                        R{(totalEarnings + inEscrow).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    className={styles.analyticsBtn}
                                    onClick={() => navigate('/seller/analytics')}
                                >
                                    View Analytics →
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role="SELLER" />
        </div>
    );
}

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}