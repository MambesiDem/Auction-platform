import { useEffect, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import BidModal from '../../components/BidModal';
import styles from './BuyerBrowse.module.css';
import { useSearchParams } from 'react-router-dom';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Furniture', 'Vehicles', 'Art', 'Collectables', 'Other'];
const SORT_OPTIONS = [
    { value: 'ending', label: 'Ending soonest' },
    { value: 'newest', label: 'Newest first' },
    { value: 'price_asc', label: 'Price: Low to high' },
    { value: 'price_desc', label: 'Price: High to low' },
    { value: 'bids', label: 'Most bids' },
];

export default function BuyerBrowse() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [timers, setTimers] = useState({});
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('ending');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [searchParams] = useSearchParams();

    const fetchData = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/auctions');
            setAuctions(res.data.filter(a => a.active));
        } catch (err) {
            console.error('Failed to fetch auctions', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // WebSocket for live price updates
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
                    fetchData();
                });
            },
        });
        client.activate();
        return () => client.deactivate();
    }, [fetchData]);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setSearch(q);
            setShowFilters(false);
        }
    }, [searchParams]);

    // Apply filters and sort
    useEffect(() => {
        let result = [...auctions];

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.title?.toLowerCase().includes(q) ||
                a.description?.toLowerCase().includes(q)
            );
        }

        // Price filter
        if (minPrice) result = result.filter(a => a.currentPrice >= parseFloat(minPrice));
        if (maxPrice) result = result.filter(a => a.currentPrice <= parseFloat(maxPrice));

        // Sort
        switch (sort) {
            case 'ending':
                result.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                break;
            case 'price_asc':
                result.sort((a, b) => a.currentPrice - b.currentPrice);
                break;
            case 'price_desc':
                result.sort((a, b) => b.currentPrice - a.currentPrice);
                break;
            default:
                break;
        }

        setFiltered(result);
    }, [auctions, search, category, sort, minPrice, maxPrice]);

    // Countdown timers
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
                    updated[a.id] = {
                        label: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`,
                        state: 'upcoming'
                    };
                } else if (now >= start && now < end) {
                    const diff = end - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = {
                        label: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`,
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
    }, [auctions]);

    const clearFilters = () => {
        setSearch('');
        setCategory('All');
        setMinPrice('');
        setMaxPrice('');
        setSort('ending');
    };

    const hasFilters = search || category !== 'All' || minPrice || maxPrice || sort !== 'ending';

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <TopBar onSearch={setSearch} />
                <div className={styles.loading}>Loading auctions...</div>
            </div>
            <BottomNav role={user?.role} />
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar onSearch={setSearch} />

                <div className={styles.content}>

                    {/* Page header */}
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>Browse Auctions</h1>
                            <p className={styles.pageSubtitle}>
                                {filtered.length} auction{filtered.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                        <button
                            className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            🎛 Filters {hasFilters && <span className={styles.filterDot} />}
                        </button>
                    </div>

                    {/* Filter bar */}
                    {showFilters && (
                        <div className={styles.filterBar}>
                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Sort by</label>
                                <select
                                    className={styles.filterSelect}
                                    value={sort}
                                    onChange={e => setSort(e.target.value)}
                                >
                                    {SORT_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Min price (R)</label>
                                <input
                                    type="number"
                                    className={styles.filterInput}
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={e => setMinPrice(e.target.value)}
                                />
                            </div>

                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Max price (R)</label>
                                <input
                                    type="number"
                                    className={styles.filterInput}
                                    placeholder="Any"
                                    value={maxPrice}
                                    onChange={e => setMaxPrice(e.target.value)}
                                />
                            </div>

                            {hasFilters && (
                                <button className={styles.clearBtn} onClick={clearFilters}>
                                    Clear all
                                </button>
                            )}
                        </div>
                    )}

                    {/* Category pills */}
                    <div className={styles.categories}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                className={`${styles.catPill} ${category === cat ? styles.catPillActive : ''}`}
                                onClick={() => setCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Auction grid */}
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🔍</div>
                            <h3 className={styles.emptyTitle}>No auctions found</h3>
                            <p className={styles.emptySub}>
                                {hasFilters
                                    ? 'Try adjusting your filters or search term.'
                                    : 'No live auctions right now. Check back soon.'}
                            </p>
                            {hasFilters && (
                                <button className={styles.clearBtn} onClick={clearFilters}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filtered.map(auction => {
                                const timer = timers[auction.id];
                                const isLive = timer?.state === 'live';

                                return (
                                    <div key={auction.id} className={styles.card}>
                                        {/* Image */}
                                        <div className={styles.cardImageWrap}>
                                            {auction.imageUrl ? (
                                                <img
                                                    src={auction.imageUrl}
                                                    alt={auction.title}
                                                    className={styles.cardImage}
                                                />
                                            ) : (
                                                <div className={styles.cardImagePlaceholder}>
                                                    <span>📦</span>
                                                </div>
                                            )}
                                            {/* Timer badge */}
                                            {timer && (
                                                <span className={`${styles.timerBadge} ${
                                                    timer.state === 'upcoming' ? styles.timerUpcoming :
                                                    timer.state === 'ended'   ? styles.timerEnded :
                                                    styles.timerLive
                                                }`}>
                                                    {timer.state === 'live' && '⏱ '}
                                                    {timer.state === 'upcoming' ? `Starts ${timer.label}` : timer.label}
                                                </span>
                                            )}
                                            {/* Extended badge */}
                                            {auction.extended && (
                                                <span className={styles.extendedBadge}>+Extended</span>
                                            )}
                                            {/* Watchlist button */}
                                            <button className={styles.wishlistBtn} title="Add to watchlist">
                                                ♡
                                            </button>
                                        </div>

                                        {/* Card body */}
                                        <div className={styles.cardBody}>
                                            <h3 className={styles.cardTitle}>{auction.title}</h3>
                                            <p className={styles.cardDesc}>{auction.description}</p>

                                            <div className={styles.cardFooter}>
                                                <div>
                                                    <p className={styles.cardPriceLabel}>Current bid</p>
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