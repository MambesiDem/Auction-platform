import { useAuctionSync } from '../../utils/auctionLifecycle';
import { getAllPages } from '../../api/transactions';
import { useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerAnalytics.module.css';

export default function SellerAnalytics() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [payments, setPayments] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30');

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, paymentsRes, deliveriesRes] = await Promise.all([
                getAllPages('/api/auctions/my-listings'),
                axiosInstance.get('/api/payments/my-earnings'),
                axiosInstance.get('/api/deliveries/my-sales'),
            ]);
            const mine = auctionsRes.data.filter(a => a.ownerEmail === user?.email);
            setAuctions(mine);
            setPayments(paymentsRes.data);
            setDeliveries(deliveriesRes.data);
        } catch (err) {
            console.error('Failed to load analytics', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useAuctionSync(fetchData);

    // Compute stats
    const released = payments.filter(p => p.status === 'RELEASED');
    const inEscrow = payments.filter(p => p.status === 'HELD');
    const totalRevenue = released.reduce((s, p) => s + (p.sellerAmount || 0), 0);
    const escrowTotal = inEscrow.reduce((s, p) => s + (p.sellerAmount || 0), 0);
    const totalCommission = released.reduce((s, p) => s + (p.commissionAmount || 0), 0);
    const activeAuctions = auctions.filter(a => a.active).length;
    const closedAuctions = auctions.filter(a => !a.active).length;
    const successRate = auctions.length > 0
        ? Math.round((released.length / auctions.filter(a => !a.active).length || 0) * 100)
        : 0;
    const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length;
    const pendingDeliveries = deliveries.filter(
        d => !['DELIVERED', 'CANCELLED'].includes(d.status)
    ).length;

    // Top listings by sale price
    const topListings = auctions
        .filter(a => !a.active && a.winnerEmail)
        .sort((a, b) => b.currentPrice - a.currentPrice)
        .slice(0, 5);

    // Build simple weekly revenue bars from released payments
    const buildChartData = () => {
        const days = parseInt(period);
        const now = new Date();
        const buckets = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const label = date.toLocaleDateString('en-ZA', {
                day: 'numeric', month: 'short'
            });
            buckets.push({ label, value: 0, date: date.toDateString() });
        }

        released.forEach(p => {
            if (!p.releasedAt) return;
            const relDate = new Date(p.releasedAt).toDateString();
            const bucket = buckets.find(b => b.date === relDate);
            if (bucket) bucket.value += p.sellerAmount || 0;
        });

        return buckets;
    };

    const chartData = buildChartData();
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    // Show every nth label to avoid crowding
    const labelInterval = parseInt(period) <= 7 ? 1 : parseInt(period) <= 14 ? 2 : 5;

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading analytics...</div>
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
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>Analytics</h1>
                            <p className={styles.pageSubtitle}>
                                Your business performance at a glance
                            </p>
                        </div>
                        <select
                            className={styles.periodSelect}
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="14">Last 14 days</option>
                            <option value="30">Last 30 days</option>
                        </select>
                    </div>

                    {/* KPI cards */}
                    <div className={styles.kpiGrid}>
                        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
                            <p className={styles.kpiLabel}>Total earnings</p>
                            <p className={styles.kpiValue}>R{totalRevenue.toLocaleString()}</p>
                            <p className={styles.kpiSub}>
                                +R{escrowTotal.toLocaleString()} confirmed by the payment provider
                            </p>
                        </div>
                        <div className={styles.kpiCard}>
                            <p className={styles.kpiLabel}>Items sold</p>
                            <p className={styles.kpiValueDark}>{released.length}</p>
                            <p className={styles.kpiSub}>
                                of {closedAuctions} closed auctions
                            </p>
                        </div>
                        <div className={styles.kpiCard}>
                            <p className={styles.kpiLabel}>Platform commission</p>
                            <p className={styles.kpiValueDark}>R{totalCommission.toLocaleString()}</p>
                            <p className={styles.kpiSub}>Commission saved with each order</p>
                        </div>
                        <div className={styles.kpiCard}>
                            <p className={styles.kpiLabel}>Active listings</p>
                            <p className={styles.kpiValueDark}>{activeAuctions}</p>
                            <p className={styles.kpiSub}>{closedAuctions} closed</p>
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.gridLeft}>

                            {/* Revenue chart */}
                            <div className={styles.section}>
                                <div className={styles.sectionHead}>
                                    <h2 className={styles.sectionTitle}>Sales Overview</h2>
                                    <span className={styles.chartPeriodLabel}>Last {period} days</span>
                                </div>

                                <div className={styles.chartWrap}>
                                    {/* Y-axis labels */}
                                    <div className={styles.chartYAxis}>
                                        {[maxValue, maxValue * 0.5, 0].map((val, i) => (
                                            <span key={i} className={styles.yLabel}>
                                                R{Math.round(val).toLocaleString()}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Bars */}
                                    <div className={styles.chartBars}>
                                        {chartData.map((d, i) => (
                                            <div
                                                key={i}
                                                className={styles.barWrap}
                                                title={`${d.label}: R${d.value.toLocaleString()}`}
                                            >
                                                <div
                                                    className={styles.bar}
                                                    style={{
                                                        height: `${Math.max((d.value / maxValue) * 100, d.value > 0 ? 4 : 0)}%`
                                                    }}
                                                />
                                                {i % labelInterval === 0 && (
                                                    <span className={styles.barLabel}>{d.label}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {totalRevenue === 0 && (
                                    <p className={styles.chartEmpty}>
                                        No released payments in this period yet.
                                    </p>
                                )}
                            </div>

                            {/* Delivery stats */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
                                    Delivery Stats
                                </h2>
                                <div className={styles.deliveryStats}>
                                    {[
                                        { label: 'Total deliveries', value: deliveries.length, icon: '📦' },
                                        { label: 'Delivered', value: deliveredCount, icon: '✅' },
                                        { label: 'In progress', value: pendingDeliveries, icon: '🚚' },
                                        { label: 'Success rate',
                                          value: deliveries.length > 0
                                              ? `${Math.round((deliveredCount / deliveries.length) * 100)}%`
                                              : '—',
                                          icon: '📊' },
                                    ].map(stat => (
                                        <div key={stat.label} className={styles.deliveryStat}>
                                            <span className={styles.deliveryStatIcon}>{stat.icon}</span>
                                            <p className={styles.deliveryStatValue}>{stat.value}</p>
                                            <p className={styles.deliveryStatLabel}>{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.gridRight}>

                            {/* Top listings */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
                                    Top Listings
                                </h2>
                                {topListings.length === 0 ? (
                                    <p className={styles.empty}>No sold items yet.</p>
                                ) : (
                                    topListings.map((auction, i) => (
                                        <div key={auction.id} className={styles.topItem}>
                                            <span className={styles.rank}>{i + 1}</span>
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
                                                <p className={styles.topItemSub}>
                                                    Won by {auction.winnerEmail?.split('@')[0]}
                                                </p>
                                            </div>
                                            <p className={styles.topItemPrice}>
                                                R{auction.currentPrice?.toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Payment breakdown */}
                            <div className={`${styles.section} ${styles.sectionDark}`}>
                                <h2 className={styles.sectionTitleLight}>Payment Breakdown</h2>
                                <div className={styles.breakdownList}>
                                    {[
                                        { label: 'Released to you', value: totalRevenue, color: '#00C853' },
                                        { label: 'Payment confirmed', value: escrowTotal, color: '#60A5FA' },
                                        { label: 'Platform commission', value: totalCommission, color: '#F59E0B' },
                                    ].map(item => (
                                        <div key={item.label} className={styles.breakdownItem}>
                                            <div className={styles.breakdownLeft}>
                                                <span
                                                    className={styles.breakdownDot}
                                                    style={{ background: item.color }}
                                                />
                                                <span className={styles.breakdownLabel}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span className={styles.breakdownValue}>
                                                R{item.value.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                    <div className={styles.breakdownDivider} />
                                    <div className={styles.breakdownItem}>
                                        <span className={styles.breakdownTotalLabel}>
                                            Total transacted
                                        </span>
                                        <span className={styles.breakdownTotalValue}>
                                            R{(totalRevenue + escrowTotal + totalCommission).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Auction success rate */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
                                    Auction Success Rate
                                </h2>
                                <div className={styles.successRate}>
                                    <div className={styles.rateCircle}>
                                        <span className={styles.rateValue}>
                                            {successRate || 0}%
                                        </span>
                                        <span className={styles.rateLabel}>Success</span>
                                    </div>
                                    <div className={styles.rateStats}>
                                        <div className={styles.rateStat}>
                                            <span className={styles.rateStatValue}>
                                                {released.length}
                                            </span>
                                            <span className={styles.rateStatLabel}>Sold</span>
                                        </div>
                                        <div className={styles.rateStat}>
                                            <span className={styles.rateStatValue}>
                                                {auctions.filter(a => !a.active && !a.winnerEmail).length}
                                            </span>
                                            <span className={styles.rateStatLabel}>No winner</span>
                                        </div>
                                        <div className={styles.rateStat}>
                                            <span className={styles.rateStatValue}>
                                                {activeAuctions}
                                            </span>
                                            <span className={styles.rateStatLabel}>Active</span>
                                        </div>
                                    </div>
                                </div>
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