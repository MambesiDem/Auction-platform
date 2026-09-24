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
import styles from './BuyerBids.module.css';

export default function BuyerBids() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bids, setBids] = useState([]);
    const [myBidAmounts, setMyBidAmounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [timers, setTimers] = useState({});
    const [selectedAuction, setSelectedAuction] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/auctions/my-active-bids');
            setBids(res.data);

            // Fetch my highest bid for each auction
            const bidAmounts = {};
            await Promise.all(res.data.map(async (auction) => {
                const bidRes = await axiosInstance.get(`/api/auctions/${auction.id}/my-bid`);
                bidAmounts[auction.id] = bidRes.data;
            }));
            setMyBidAmounts(bidAmounts);
        } catch (err) {
            console.error('Failed to fetch bids', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const client = new Client({
            webSocketFactory: () => new SockJS(`${process.env.REACT_APP_API_URL}/ws-auction`),
            onConnect: () => {
                client.subscribe('/topic/bids', (message) => {
                    const bid = JSON.parse(message.body);
                    setBids(prev => prev.map(a =>
                        a.id === bid.auctionId
                            ? { ...a, currentPrice: bid.amount, endTime: bid.newEndTime || a.endTime }
                            : a
                    ));
                });
                client.subscribe('/topic/auction-closed', () => fetchData());
            },
        });
        client.activate();
        return () => client.deactivate();
    }, [fetchData]);

    // Countdown timers
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            bids.forEach(a => {
                const now = new Date();
                const end = new Date(a.endTime);
                const diff = end - now;
                if (diff <= 0) {
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
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bids]);

    const isWinning = (auction) => {
        const myBid = myBidAmounts[auction.id] || 0;
        return myBid >= auction.currentPrice;
    };

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
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>My Bids</h1>
                            <p className={styles.pageSubtitle}>
                                {bids.length} active bid{bids.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            className={styles.browseBtn}
                            onClick={() => navigate('/buyer/browse')}
                        >
                            + Find more auctions
                        </button>
                    </div>

                    {bids.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>⚡</div>
                            <h3 className={styles.emptyTitle}>No active bids</h3>
                            <p className={styles.emptySub}>
                                You haven't placed any bids on live auctions yet.
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
                            {bids.map(auction => {
                                const timer = timers[auction.id];
                                const myBid = myBidAmounts[auction.id] || 0;
                                const winning = isWinning(auction);

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
                                                {winning ? '🏆 Winning' : '❌ Outbid'}
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
                                            {!winning && timer?.state !== 'ended' && (
                                                <button
                                                    className={styles.bidBtn}
                                                    onClick={() => setSelectedAuction(auction)}
                                                >
                                                    Raise bid
                                                </button>
                                            )}

                                            {winning && timer?.state !== 'ended' && (
                                                <button
                                                    className={styles.watchBtn}
                                                    onClick={() => setSelectedAuction(auction)}
                                                >
                                                    Bid again
                                                </button>
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