import { useEffect, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import BidModal from '../../components/BidModal';
import styles from './BuyerDashboard.module.css';
import { useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [myWins, setMyWins] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timers, setTimers] = useState({});
    const [payments, setPayments] = useState([]);
    const [paymentTimers, setPaymentTimers] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, winsRes, deliveriesRes, paymentsRes] = await Promise.all([
                axiosInstance.get('/api/auctions'),
                axiosInstance.get('/api/auctions/my-wins'),
                axiosInstance.get('/api/deliveries/my-purchases'),
                axiosInstance.get('/api/payments/my-payments'),
            ]);
            setAuctions(auctionsRes.data.filter(a => a.active));
            setMyWins(winsRes.data);
            setDeliveries(deliveriesRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // WebSocket — live bid updates + auction reassignment
    useEffect(() => {
        fetchData();

        const client = new Client({
            webSocketFactory: () => new SockJS(`${process.env.REACT_APP_API_URL}/ws-auction`),
            onConnect: () => {
                client.subscribe('/topic/bids', (message) => {
                    const bid = JSON.parse(message.body);
                    setAuctions(prev => prev.map(a =>
                        a.id === bid.auctionId
                            ? { ...a, currentPrice: bid.amount }
                            : a
                    ));
                });

                client.subscribe('/topic/auction-closed', () => {
                    fetchData();
                });

                // Refresh when auction is reassigned to second bidder
                client.subscribe('/topic/auction-reassigned', () => {
                    fetchData();
                });
            },
        });

        client.activate();
        return () => client.deactivate();
    }, [fetchData]);

    // Payment deadline countdown
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = {};
            myWins.forEach(auction => {
                if (!auction.paymentDeadline) return;
                const diff = new Date(auction.paymentDeadline) - new Date();
                if (diff <= 0) {
                    updated[auction.id] = 'EXPIRED';
                } else {
                    const m = Math.floor(diff / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[auction.id] = `${m}:${String(s).padStart(2, '0')}`;
                }
            });
            setPaymentTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
    }, [myWins]);

    // Poll every 30 seconds as fallback
    useEffect(() => {
        const poll = setInterval(() => {
            fetchData();
        }, 30000);
        return () => clearInterval(poll);
    }, [fetchData]);

    // Poll every 30 seconds while a payment deadline is active
    useEffect(() => {
        const hasActiveDeadline = myWins.some(
            a => a.paymentDeadline && new Date(a.paymentDeadline) > new Date()
        );
        if (!hasActiveDeadline) return;

        const poll = setInterval(() => {
            fetchData();
        }, 30000);
        return () => clearInterval(poll);
    }, [myWins, fetchData]);

    const handleCancelPayment = async (auctionId) => {
        if (!window.confirm('Cancel this order? You will be refunded.')) return;
        try {
            await axiosInstance.put(`/api/payments/${auctionId}/cancel`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel order.');
        }
    };

    // Auction countdown timers — upcoming, live, ended
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
                        label: h > 0
                            ? `Starts in ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                            : `Starts in ${m}:${String(s).padStart(2, '0')}`,
                        state: 'upcoming',
                    };
                } else if (now >= start && now < end) {
                    const diff = end - now;
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    updated[a.id] = {
                        label: h > 0
                            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                            : `${m}:${String(s).padStart(2, '0')}`,
                        state: 'live',
                    };
                } else {
                    updated[a.id] = { label: 'Ended', state: 'ended' };
                }
            });

            const justEnded = Object.values(updated).some(t => t.state === 'ended');
            const wasLive = Object.values(timers).some(t => t?.state === 'live');
            if (justEnded && wasLive) {
                setTimeout(() => fetchData(), 3000);
            }
            setTimers(updated);
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctions]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PENDING':    return styles.statusPending;
            case 'ACCEPTED':
            case 'PICKED_UP':
            case 'IN_TRANSIT': return styles.statusTransit;
            case 'DELIVERED':  return styles.statusDelivered;
            case 'CANCELLED':  return styles.statusCancelled;
            default:           return styles.statusPending;
        }
    };

    const formatStatus = (status) => {
        switch (status) {
            case 'IN_TRANSIT': return 'In transit';
            case 'PICKED_UP':  return 'Picked up';
            default: return status.charAt(0) + status.slice(1).toLowerCase();
        }
    };

    const activeBids = auctions.filter(a => a.active).length;
    const pendingDeliveries = deliveries.filter(
        d => d.status !== 'DELIVERED' && d.status !== 'CANCELLED'
    ).length;

    if (loading) {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.loading}>Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Navbar />

            <div className={styles.main}>
                <p className={styles.greeting}>
                    Good {getTimeOfDay()}, {user?.fullName?.split(' ')[0]}
                </p>
                <p className={styles.greetingSub}>
                    Here's what's happening with your auctions today.
                </p>

                <div className={styles.stats}>
                    <StatCard label="Active bids"       value={activeBids} />
                    <StatCard label="Auctions won"      value={myWins.length} />
                    <StatCard label="Pending deliveries" value={pendingDeliveries} />
                </div>

                {/* Live Auctions */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Live auctions</span>
                        <span className={styles.badge}>{auctions.length} active</span>
                    </div>
                    {auctions.length === 0 ? (
                        <p className={styles.empty}>No live auctions at the moment.</p>
                    ) : (
                        auctions.map(auction => {
                            const timerInfo = timers[auction.id] || { label: '...', state: 'upcoming' };
                            const isLive = timerInfo.state === 'live';

                            return (
                                <div key={auction.id} className={styles.row}>
                                    <div>
                                        <p className={styles.rowTitle}>{auction.title}</p>
                                        <p className={styles.rowMeta}>
                                            Started at R{auction.startingPrice?.toLocaleString()}
                                            {!isLive && timerInfo.state === 'upcoming' && (
                                                <span> · Not started yet</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className={styles.rowRight}>
                                        <span className={`${styles.timer} ${
                                            timerInfo.state === 'upcoming' ? styles.timerUpcoming :
                                            timerInfo.state === 'ended'   ? styles.timerEnded :
                                            styles.timer
                                        }`}>
                                            {timerInfo.label}
                                        </span>
                                        <span className={styles.price}>
                                            R{auction.currentPrice?.toLocaleString()}
                                        </span>
                                        <button
                                            className={styles.bidBtn}
                                            onClick={() => setSelectedAuction(auction)}
                                            disabled={!isLive}
                                            style={{
                                                opacity: isLive ? 1 : 0.4,
                                                cursor: isLive ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            {timerInfo.state === 'upcoming' ? 'Not started' :
                                             timerInfo.state === 'ended'   ? 'Ended' : 'Place bid'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* My Wins */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>My wins</span>
                        <span className={styles.badge}>{myWins.length} total</span>
                    </div>
                    {myWins.length === 0 ? (
                        <p className={styles.empty}>You haven't won any auctions yet.</p>
                    ) : (
                        myWins.map(auction => {
                            const delivery = deliveries.find(d => d.auctionId === auction.id);
                            const payment = payments.find(p => p.auctionId === auction.id);
                            const paymentTimer = paymentTimers[auction.id];
                            const paymentPending = !payment || payment.status === 'PENDING';

                            return (
                                <div key={auction.id} className={styles.row}>
                                    <div>
                                        <p className={styles.rowTitle}>{auction.title}</p>
                                        <p className={styles.rowMeta}>
                                            Won for R{auction.currentPrice?.toLocaleString()}
                                        </p>

                                        {/* Payment countdown timer */}
                                        {paymentPending && paymentTimer && paymentTimer !== 'EXPIRED' && (
                                            <p style={{
                                                fontSize: '12px',
                                                color: '#A32D2D',
                                                marginTop: '4px',
                                                fontWeight: '500'
                                            }}>
                                                ⏱ Pay within {paymentTimer} or your win will be reassigned
                                            </p>
                                        )}

                                        {paymentPending && paymentTimer === 'EXPIRED' && (
                                            <p style={{
                                                fontSize: '12px',
                                                color: '#888',
                                                marginTop: '4px'
                                            }}>
                                                Payment window expired
                                            </p>
                                        )}
                                    </div>

                                    <div className={styles.rowRight}>
                                        {/* Pay now button */}
                                        {paymentPending && paymentTimer && paymentTimer !== 'EXPIRED' && (
                                            <button
                                                className={styles.bidBtn}
                                                onClick={() => navigate(`/payment/${auction.id}`)}
                                            >
                                                Pay now
                                            </button>
                                        )}

                                        {/* Payment status badge */}
                                        {payment && (
                                            <span className={`${styles.statusPill} ${
                                                payment.status === 'HELD'     ? styles.statusTransit :
                                                payment.status === 'RELEASED' ? styles.statusDelivered :
                                                payment.status === 'REFUNDED' ? styles.statusCancelled :
                                                styles.statusPending
                                            }`}>
                                                {payment.status === 'PENDING'  ? 'Payment pending' :
                                                 payment.status === 'HELD'     ? 'Paid — in escrow' :
                                                 payment.status === 'RELEASED' ? 'Payment complete' :
                                                 payment.status === 'REFUNDED' ? 'Refunded' : ''}
                                            </span>
                                        )}

                                        {/* Delivery status badge */}
                                        {delivery && (
                                            <span className={`${styles.statusPill} ${getStatusStyle(delivery.status)}`}>
                                                {formatStatus(delivery.status)}
                                            </span>
                                        )}

                                        {/* Cancel order button */}
                                        {payment && payment.status === 'HELD' && (
                                            (() => {
                                                const canCancel = !delivery ||
                                                    (delivery.status !== 'PICKED_UP' &&
                                                     delivery.status !== 'IN_TRANSIT' &&
                                                     delivery.status !== 'DELIVERED');
                                                return canCancel ? (
                                                    <button
                                                        onClick={() => handleCancelPayment(auction.id)}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '4px 10px',
                                                            border: '0.5px solid #fca5a5',
                                                            borderRadius: '6px',
                                                            background: 'transparent',
                                                            color: '#b91c1c',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Cancel order
                                                    </button>
                                                ) : null;
                                            })()
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* My Deliveries */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>My deliveries</span>
                        <span className={styles.badge}>{pendingDeliveries} active</span>
                    </div>
                    {deliveries.length === 0 ? (
                        <p className={styles.empty}>No deliveries yet.</p>
                    ) : (
                        deliveries.map(delivery => (
                            <div key={delivery.id} className={styles.row}>
                                <div>
                                    <p className={styles.rowTitle}>{delivery.auctionTitle}</p>
                                    <p className={styles.rowMeta}>
                                        {delivery.driverEmail
                                            ? `Driver: ${delivery.driverEmail}`
                                            : 'Awaiting driver assignment'}
                                    </p>
                                </div>
                                <span className={`${styles.statusPill} ${getStatusStyle(delivery.status)}`}>
                                    {formatStatus(delivery.status)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

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