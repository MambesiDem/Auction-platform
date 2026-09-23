import { useEffect, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import BidModal from '../../components/BidModal';
import styles from './BuyerHome.module.css';

export default function BuyerHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [myWins, setMyWins] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [myLosses, setMyLosses] = useState([]);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timers, setTimers] = useState({});
    const [paymentTimers, setPaymentTimers] = useState({});
    const [recentActivity, setRecentActivity] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, winsRes, deliveriesRes, paymentsRes, lossesRes] = await Promise.all([
                axiosInstance.get('/api/auctions'),
                axiosInstance.get('/api/auctions/my-wins'),
                axiosInstance.get('/api/deliveries/my-purchases'),
                axiosInstance.get('/api/payments/my-payments'),
                axiosInstance.get('/api/auctions/my-losses'),
            ]);
            const liveAuctions = auctionsRes.data.filter(a => a.active);
            setAuctions(liveAuctions);
            setMyWins(winsRes.data);
            setDeliveries(deliveriesRes.data);
            setPayments(paymentsRes.data);
            setMyLosses(lossesRes.data);

            // Build recent activity from wins and deliveries
            const activity = [
                ...winsRes.data.slice(0, 3).map(a => ({
                    id: 'win-' + a.id,
                    icon: '🏆',
                    text: `You won an auction`,
                    sub: a.title,
                    time: 'Recently'
                })),
                ...deliveriesRes.data.slice(0, 3).map(d => ({
                    id: 'del-' + d.id,
                    icon: '📦',
                    text: `Order ${d.status.toLowerCase().replace('_', ' ')}`,
                    sub: d.auctionTitle,
                    time: 'Recently'
                })),
            ].slice(0, 6);
            setRecentActivity(activity);

        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // WebSocket
    useEffect(() => {
        fetchData();
        const client = new Client({
            webSocketFactory: () => new SockJS(`${process.env.REACT_APP_API_URL}/ws-auction`),
            onConnect: () => {
                client.subscribe('/topic/bids', (message) => {
                    const bid = JSON.parse(message.body);
                    setAuctions(prev => prev.map(a =>
                        a.id === bid.auctionId
                            ? { ...a, currentPrice: bid.amount, endTime: bid.newEndTime || a.endTime, extended: true }
                            : a
                    ));
                });
                client.subscribe('/topic/auction-closed', () => {
                    for (let i = 1; i <= 5; i++) {
                        setTimeout(() => fetchData(), i * 2000);
                    }
                });
                client.subscribe('/topic/auction-reassigned', () => fetchData());
            },
        });
        client.activate();
        return () => client.deactivate();
    }, [fetchData]);

    // Auction countdown timers
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            auctions.forEach(a => {
                const now = new Date();
                const start = new Date(a.startTime);
                const end = new Date(a.endTime);
                if (now < start) {
                    const diff = start - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = { label: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2,'0')}`, state: 'upcoming' };
                } else if (now >= start && now < end) {
                    const diff = end - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = { label: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2,'0')}`, state: 'live' };
                } else {
                    updated[a.id] = { label: 'Ended', state: 'ended' };
                }
            });
            setTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctions]);

    // Payment deadline timers
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            myWins.forEach(a => {
                if (!a.paymentDeadline) return;
                const diff = new Date(a.paymentDeadline) - new Date();
                updated[a.id] = diff <= 0 ? 'EXPIRED'
                    : `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2,'0')}`;
            });
            setPaymentTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
    }, [myWins]);

    // Polling
    useEffect(() => {
        const poll = setInterval(() => fetchData(), 30000);
        return () => clearInterval(poll);
    }, [fetchData]);

    const getStatusLabel = (status) => {
        const map = {
            PENDING: 'Pending', ACCEPTED: 'Accepted', PICKED_UP: 'Picked up',
            IN_TRANSIT: 'In transit', DELIVERED: 'Delivered', CANCELLED: 'Cancelled'
        };
        return map[status] || status;
    };

    const getStatusColor = (status) => {
        if (['ACCEPTED','PICKED_UP','IN_TRANSIT'].includes(status)) return styles.statusBlue;
        if (status === 'DELIVERED') return styles.statusGreen;
        if (status === 'CANCELLED') return styles.statusGray;
        return styles.statusAmber;
    };

    const pendingDeliveries = deliveries.filter(d => !['DELIVERED','CANCELLED'].includes(d.status)).length;

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <div className={styles.loading}>Loading...</div>
            </div>
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.center}>

                        {/* Hero */}
                        <div className={styles.hero}>
                            <div className={styles.heroText}>
                                <p className={styles.heroGreeting}>
                                    Good {getTimeOfDay()}, {user?.fullName?.split(' ')[0]} 👋
                                </p>
                                <h1 className={styles.heroTitle}>
                                    Great finds are<br/>closer than you think.
                                </h1>
                                <p className={styles.heroSub}>
                                    Buy. Bid. Sell. Deliver. All in one place.
                                </p>
                                <button
                                    className={styles.heroBtn}
                                    onClick={() => navigate('/buyer/browse')}
                                >
                                    Browse Auctions →
                                </button>
                            </div>
                            <div className={styles.heroBadge}>
                                <span>Bids</span>
                                <span className={styles.heroBadgeLocal}>Local</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className={styles.stats}>
                            {[
                                { icon: '⚡', value: auctions.length, label: 'Active Bids', link: '/buyer/bids' },
                                { icon: '🏆', value: myWins.length, label: 'Won Auctions', link: '/buyer/orders' },
                                { icon: '📦', value: pendingDeliveries, label: 'Orders', link: '/buyer/orders' },
                                { icon: '❤️', value: 0, label: 'Watchlist', link: '/buyer/watchlist' },
                            ].map(stat => (
                                <div key={stat.label} className={styles.statCard} onClick={() => navigate(stat.link)}>
                                    <span className={styles.statIcon}>{stat.icon}</span>
                                    <div>
                                        <p className={styles.statValue}>{stat.value}</p>
                                        <p className={styles.statLabel}>{stat.label}</p>
                                    </div>
                                    <span className={styles.statArrow}>View →</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.gridLeft}>

                                {/* Active Bids */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <h2 className={styles.sectionTitle}>Active Bids</h2>
                                        <button className={styles.viewAll}>View all →</button>
                                    </div>
                                    {auctions.length === 0 ? (
                                        <p className={styles.empty}>No live auctions right now.</p>
                                    ) : (
                                        auctions.slice(0, 5).map(auction => {
                                            const timer = timers[auction.id];
                                            const isLive = timer?.state === 'live';
                                            return (
                                                <div key={auction.id} className={styles.auctionRow}>
                                                    {auction.imageUrl ? (
                                                        <img src={auction.imageUrl} alt={auction.title} className={styles.auctionImg} />
                                                    ) : (
                                                        <div className={styles.auctionImgPlaceholder}>📦</div>
                                                    )}
                                                    <div className={styles.auctionInfo}>
                                                        <p className={styles.auctionTitle}>{auction.title}</p>
                                                        <p className={styles.auctionMeta}>
                                                            {auction.bidsCount || 0} bids
                                                            {auction.extended && <span className={styles.extendedBadge}> · Extended</span>}
                                                        </p>
                                                    </div>
                                                    <div className={styles.auctionRight}>
                                                        <p className={styles.auctionPrice}>R{auction.currentPrice?.toLocaleString()}</p>
                                                        {timer && (
                                                            <span className={`${styles.timerBadge} ${
                                                                timer.state === 'upcoming' ? styles.timerUpcoming :
                                                                timer.state === 'ended' ? styles.timerEnded :
                                                                styles.timerLive
                                                            }`}>
                                                                {timer.state === 'upcoming' ? `Starts ${timer.label}` : timer.label}
                                                            </span>
                                                        )}
                                                        <button
                                                            className={`${styles.bidBtn} ${!isLive ? styles.bidBtnDisabled : ''}`}
                                                            onClick={() => isLive && setSelectedAuction(auction)}
                                                            disabled={!isLive}
                                                        >
                                                            {timer?.state === 'upcoming' ? 'Upcoming' :
                                                             timer?.state === 'ended' ? 'Ended' : 'Bid'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* My Wins */}
                                {myWins.length > 0 && (
                                    <div className={styles.section}>
                                        <div className={styles.sectionHead}>
                                            <h2 className={styles.sectionTitle}>My Wins</h2>
                                            <button className={styles.viewAll}>View all →</button>
                                        </div>
                                        {myWins.slice(0, 3).map(auction => {
                                            const payment = payments.find(p => p.auctionId === auction.id);
                                            const delivery = deliveries.find(d => d.auctionId === auction.id);
                                            const paymentTimer = paymentTimers[auction.id];
                                            const paymentPending = !payment || payment.status === 'PENDING';

                                            return (
                                                <div key={auction.id} className={styles.auctionRow}>
                                                    {auction.imageUrl ? (
                                                        <img src={auction.imageUrl} alt={auction.title} className={styles.auctionImg} />
                                                    ) : (
                                                        <div className={styles.auctionImgPlaceholder}>🏆</div>
                                                    )}
                                                    <div className={styles.auctionInfo}>
                                                        <p className={styles.auctionTitle}>{auction.title}</p>
                                                        <p className={styles.auctionMeta}>
                                                            R{auction.currentPrice?.toLocaleString()}
                                                        </p>
                                                        {paymentPending && paymentTimer && paymentTimer !== 'EXPIRED' && (
                                                            <p className={styles.urgentText}>
                                                                ⏱ Pay within {paymentTimer}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={styles.auctionRight}>
                                                        {paymentPending && paymentTimer && paymentTimer !== 'EXPIRED' && (
                                                            <button
                                                                className={styles.payBtn}
                                                                onClick={() => navigate(`/payment/${auction.id}`)}
                                                            >
                                                                Pay Now
                                                            </button>
                                                        )}
                                                        {payment && payment.status !== 'PENDING' && (
                                                            <span className={`${styles.statusBadge} ${
                                                                payment.status === 'HELD' ? styles.statusBlue :
                                                                payment.status === 'RELEASED' ? styles.statusGreen :
                                                                styles.statusGray
                                                            }`}>
                                                                {payment.status === 'HELD' ? 'In Escrow' :
                                                                 payment.status === 'RELEASED' ? 'Paid' :
                                                                 payment.status === 'REFUNDED' ? 'Refunded' : ''}
                                                            </span>
                                                        )}
                                                        {delivery && (
                                                            <span className={`${styles.statusBadge} ${getStatusColor(delivery.status)}`}>
                                                                {getStatusLabel(delivery.status)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Recommended for You */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <h2 className={styles.sectionTitle}>Recommended for You</h2>
                                        <button className={styles.viewAll}>View all →</button>
                                    </div>
                                    {auctions.length === 0 ? (
                                        <p className={styles.empty}>No recommendations yet.</p>
                                    ) : (
                                        <div className={styles.cardGrid}>
                                            {auctions.slice(0, 4).map(auction => {
                                                const timer = timers[auction.id];
                                                return (
                                                    <div key={'rec-' + auction.id} className={styles.card}>
                                                        {auction.imageUrl ? (
                                                            <img src={auction.imageUrl} alt={auction.title} className={styles.cardImg} />
                                                        ) : (
                                                            <div className={styles.cardImgPlaceholder}>📦</div>
                                                        )}
                                                        <button className={styles.wishlistBtn}>❤️</button>
                                                        <div className={styles.cardBody}>
                                                            <p className={styles.cardTitle}>{auction.title}</p>
                                                            <p className={styles.cardPrice}>R{auction.currentPrice?.toLocaleString()}</p>
                                                            <p className={styles.cardMeta}>
                                                                {timer?.state === 'live' && `⏱ ${timer.label}`}
                                                                {timer?.state === 'upcoming' && 'Upcoming'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Right panel — desktop only */}
                            <div className={styles.gridRight}>

                                {/* Ready to find something */}
                                <div className={styles.rightCard}>
                                    <div className={styles.rightCardIcon}>🛒</div>
                                    <h3 className={styles.rightCardTitle}>Ready to find something?</h3>
                                    <p className={styles.rightCardSub}>Explore thousands of items from local sellers, small businesses and informal traders.</p>
                                    <button
                                        className={styles.rightCardBtn}
                                        onClick={() => navigate('/buyer/browse')}
                                    >
                                        Browse Auctions →
                                    </button>
                                </div>

                                {/* Safe. Local. Reliable. */}
                                <div className={`${styles.rightCard} ${styles.rightCardDark}`}>
                                    <span className={styles.rightCardBigIcon}>🛵</span>
                                    <h3 className={styles.rightCardTitleLight}>Safe. Local. Reliable.</h3>
                                    <p className={styles.rightCardSubLight}>Get your items delivered by verified ConnSB drivers across South Africa.</p>
                                    <button className={styles.rightCardBtnOutline}>Learn More →</button>
                                </div>

                                {/* Recent Activity */}
                                <div className={styles.rightCard}>
                                    <div className={styles.sectionHead}>
                                        <h3 className={styles.rightCardTitle}>Recent Activity</h3>
                                        <button className={styles.viewAll}>View all →</button>
                                    </div>
                                    {recentActivity.length === 0 ? (
                                        <p className={styles.empty}>No recent activity.</p>
                                    ) : (
                                        recentActivity.map(item => (
                                            <div key={item.id} className={styles.activityRow}>
                                                <span className={styles.activityIcon}>{item.icon}</span>
                                                <div className={styles.activityInfo}>
                                                    <p className={styles.activityText}>{item.text}</p>
                                                    <p className={styles.activitySub}>{item.sub}</p>
                                                </div>
                                                <span className={styles.activityTime}>{item.time}</span>
                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* Support local banner */}
                        <div className={styles.banner}>
                            <div className={styles.bannerText}>
                                <h2 className={styles.bannerTitle}>Support local.<br/>Shop smarter.</h2>
                                <p className={styles.bannerSub}>From everyday essentials to rare finds — ConnSB connects you to real people in your community.</p>
                                <button className={styles.bannerBtn}>Browse Now →</button>
                            </div>
                            <div className={styles.bannerBadge}>Stronger<br/>Together</div>
                        </div>

                    </div>
                </div>

                <div style={{ height: '72px' }} />
            </div>

            <BottomNav role={user?.role} />

            {selectedAuction && (
                <BidModal
                    auction={selectedAuction}
                    onClose={() => setSelectedAuction(null)}
                    onBidPlaced={fetchData}
                />
            )}
        </div>
    );
}

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}