import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import BidModal from '../../components/BidModal';
import styles from './BuyerWatchlist.module.css';

export default function BuyerWatchlist() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timers, setTimers] = useState({});
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [removing, setRemoving] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/watchlist');
            setItems(res.data);
        } catch (err) {
            console.error('Failed to fetch watchlist', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown timers
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            items.forEach(a => {
                const now = new Date();
                const start = new Date(a.startTime);
                const end = new Date(a.endTime);
                if (now < start) {
                    const diff = start - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    updated[a.id] = {
                        label: h > 0 ? `Starts in ${h}h ${m}m` : `Starts soon`,
                        state: 'upcoming'
                    };
                } else if (now >= start && now < end) {
                    const diff = end - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = {
                        label: h > 0 ? `${h}h ${m}m left` : `${m}:${String(s).padStart(2,'0')} left`,
                        state: 'live'
                    };
                } else {
                    updated[a.id] = { label: 'Ended', state: 'ended' };
                }
            });
            setTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const handleRemove = async (auctionId) => {
        setRemoving(auctionId);
        try {
            await axiosInstance.delete(`/api/watchlist/${auctionId}`);
            setItems(prev => prev.filter(a => a.id !== auctionId));
        } catch (err) {
            alert('Failed to remove from watchlist.');
        } finally {
            setRemoving(null);
        }
    };

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading watchlist...</div>
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
                            <h1 className={styles.pageTitle}>Watchlist</h1>
                            <p className={styles.pageSubtitle}>
                                {items.length} saved item{items.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            className={styles.browseBtn}
                            onClick={() => navigate('/buyer/browse')}
                        >
                            + Add more items
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>❤️</div>
                            <h3 className={styles.emptyTitle}>Your watchlist is empty</h3>
                            <p className={styles.emptySub}>
                                Save auctions you're interested in and track them here.
                            </p>
                            <button
                                className={styles.browseBtn}
                                onClick={() => navigate('/buyer/browse')}
                            >
                                Browse auctions
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {items.map(auction => {
                                const timer = timers[auction.id];
                                const isLive = timer?.state === 'live';

                                return (
                                    <div key={auction.id} className={styles.card}>
                                        <div className={styles.cardImageWrap}>
                                            {auction.imageUrl ? (
                                                <img
                                                    src={auction.imageUrl}
                                                    alt={auction.title}
                                                    className={styles.cardImage}
                                                />
                                            ) : (
                                                <div className={styles.cardImagePlaceholder}>📦</div>
                                            )}
                                            {timer && (
                                                <span className={`${styles.timerBadge} ${
                                                    timer.state === 'upcoming' ? styles.timerUpcoming :
                                                    timer.state === 'ended'   ? styles.timerEnded :
                                                    styles.timerLive
                                                }`}>
                                                    {timer.label}
                                                </span>
                                            )}
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => handleRemove(auction.id)}
                                                disabled={removing === auction.id}
                                                title="Remove from watchlist"
                                            >
                                                {removing === auction.id ? '...' : '❤️'}
                                            </button>
                                        </div>

                                        <div className={styles.cardBody}>
                                            <h3 className={styles.cardTitle}>{auction.title}</h3>
                                            <p className={styles.cardDesc}>{auction.description}</p>
                                            <div className={styles.cardFooter}>
                                                <div>
                                                    <p className={styles.priceLabel}>Current bid</p>
                                                    <p className={styles.cardPrice}>
                                                        R{auction.currentPrice?.toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    className={`${styles.bidBtn} ${!isLive ? styles.bidBtnDisabled : ''}`}
                                                    onClick={() => isLive && setSelectedAuction(auction)}
                                                    disabled={!isLive}
                                                >
                                                    {timer?.state === 'upcoming' ? 'Upcoming' :
                                                     timer?.state === 'ended'   ? 'Ended' : 'Place bid'}
                                                </button>
                                            </div>
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