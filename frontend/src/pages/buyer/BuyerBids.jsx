import RunnerUpOffers from '../../components/RunnerUpOffers';
import { applyBid, latestPayment, auctionDate, useAuctionSync, auctionState, canPayForAuction } from '../../utils/auctionLifecycle';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { getAllPages } from '../../api/transactions';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import BidModal from '../../components/BidModal';
import styles from './BuyerBids.module.css';

export default function BuyerBids() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Active');
    const [payments, setPayments] = useState([]);
    const [bids, setBids] = useState([]);
    const [myBidAmounts, setMyBidAmounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [offers, setOffers] = useState([]);
    const [timers, setTimers] = useState({});
    const [selectedAuction, setSelectedAuction] = useState(null);

    const fetchData = useCallback(async () => {
        const offerRequest = axiosInstance.get('/api/auctions/offers').then(r => setOffers(r.data)).catch(e => console.error('Offers unavailable', e));
        try {
            const [activeRes, winsRes, lossesRes, paymentsRes] = await Promise.all([
                getAllPages('/api/auctions/my-active-bids'),
                getAllPages('/api/auctions/my-wins'),
                getAllPages('/api/auctions/my-losses'),
                axiosInstance.get('/api/payments/my-payments'),
            ]);
            const res = { data: [...new Map([...activeRes.data, ...winsRes.data, ...lossesRes.data]
                .map(auction => [auction.id, auction])).values()] };
            setBids(res.data);
            setPayments(paymentsRes.data);

            setMyBidAmounts(Object.fromEntries(res.data.map(auction =>
                [auction.id, auction.myHighestBid || 0])));
        } catch (err) {
            console.error('Failed to fetch bids', err);
        } finally {
            await offerRequest;
            setLoading(false);
        }
    }, []);

    const clock = useAuctionSync(fetchData, true, bid => { setBids(prev => applyBid(prev, bid)); });


    // Countdown timers
    useEffect(() => {
            const updated = {};
            bids.forEach(a => {
                const now = new Date();
                const end = auctionDate(a.endTime);
                const diff = end - now;
                if (!a.active || diff <= 0) {
                    updated[a.id] = { label: 'Ended', state: 'ended' };
                } else {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = {
                        label: h > 0
                            ? `${h}h ${m}m`
                            : `${m}:${String(s).padStart(2, '0')}`,
                        state: 'live'
                    };
                }
            });
            setTimers(updated);
    }, [bids, clock]);

    const isWinning = (auction) => {
        const myBid = myBidAmounts[auction.id] || 0;
        return myBid >= auction.currentPrice;
    };

    const visibleBids = bids.filter(a => activeTab === 'Active'
        ? auctionState(a, clock) !== 'Closed' : auctionState(a, clock) === 'Closed');

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading your bids...</div>
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
                            <h1 className={styles.pageTitle}>My Bids</h1>
                            <p className={styles.pageSubtitle}>
                                {visibleBids.length} {activeTab.toLowerCase()} auction{visibleBids.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            className={styles.browseBtn}
                            onClick={() => navigate('/buyer/browse')}
                        >
                            + Find more auctions
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {['Active', 'History'].map(tab => (
                            <button key={tab} className={styles.browseBtn} onClick={() => setActiveTab(tab)}
                                aria-pressed={activeTab === tab}>{tab === 'Active' ? 'Active auctions' : 'Closed auctions'}</button>
                        ))}
                    </div>
                    {visibleBids.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>⚡</div>
                            <h3 className={styles.emptyTitle}>No {activeTab.toLowerCase()} auctions</h3>
                            <p className={styles.emptySub}>
                                No auctions to display in this section.
                            </p>
                            <button
                                className={styles.browseBtn}
                                onClick={() => navigate('/buyer/browse')}
                            >
                                Browse auctions
                            </button>
                        </div>
                    ) : (
                        <div className={styles.bidsList}>
                            {visibleBids.map(auction => {
                                const timer = timers[auction.id];
                                const myBid = myBidAmounts[auction.id] || 0;
                                const state = auctionState(auction, clock);
                                const closed = state === 'Closed';
                                const won = closed && !auction.active && auction.winnerEmail === user?.email;
                                const winning = !closed && isWinning(auction);
                                const resultLabel = won ? '🏆 Won' : closed
                                    ? auction.active ? 'Finalising result' : auction.hasWinner ? 'Lost' : 'No sale'
                                    : winning ? 'Leading' : 'Outbid';
                                const payment = latestPayment(payments, auction);

                                return (
                                    <div key={auction.id} className={styles.bidCard}>
                                        {/* Image */}
                                        {auction.imageUrl ? (
                                            <img
                                                src={auction.imageUrl}
                                                alt={auction.title}
                                                className={styles.bidImage}
                                            />
                                        ) : (
                                            <div className={styles.bidImagePlaceholder}>📦</div>
                                        )}

                                        {/* Info */}
                                        <div className={styles.bidInfo}>
                                            <h3 className={styles.bidTitle}>{auction.title}</h3>
                                            <p className={styles.bidDesc}>{auction.description}</p>

                                            <div className={styles.bidPrices}>
                                                <div className={styles.priceBlock}>
                                                    <p className={styles.priceLabel}>Your bid</p>
                                                    <p className={styles.priceValue}>
                                                        R{myBid?.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={styles.priceDivider} />
                                                <div className={styles.priceBlock}>
                                                    <p className={styles.priceLabel}>Current price</p>
                                                    <p className={`${styles.priceValue} ${styles.currentPrice}`}>
                                                        R{auction.currentPrice?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right side */}
                                        <div className={styles.bidRight}>
                                            {/* Winning/Losing status */}
                                            <span className={`${styles.statusBadge} ${
                                                winning ? styles.statusWinning : styles.statusLosing
                                            }`}>
                                                {resultLabel}
                                            </span>

                                            {/* Timer */}
                                            {timer && (
                                                <span className={`${styles.timerBadge} ${
                                                    timer.state === 'ended' ? styles.timerEnded : styles.timerLive
                                                }`}>
                                                    ⏱ {timer.label}
                                                </span>
                                            )}

                                            {/* Bid button */}
                                            {!winning && state === 'Live' && (
                                                <button
                                                    className={styles.bidBtn}
                                                    onClick={() => setSelectedAuction(auction)}
                                                >
                                                    Raise bid
                                                </button>
                                            )}

                                            {won && canPayForAuction(auction, payment) && (
                                                <button className={styles.bidBtn}
                                                    onClick={() => navigate(`/payment/${auction.id}`)}>Pay Now</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ height: '72px' }} />
                </div>
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