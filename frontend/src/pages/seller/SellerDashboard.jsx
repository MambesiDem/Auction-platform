import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import styles from './SellerDashboard.module.css';

const EMPTY_FORM = {
    title: '',
    description: '',
    startingPrice: '',
    startTime: '',
    endTime: '',
};

export default function SellerDashboard() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, deliveriesRes, paymentsRes] = await Promise.all([
                axiosInstance.get('/api/auctions'),
                axiosInstance.get('/api/deliveries/my-sales'),
                axiosInstance.get('/api/payments/my-earnings'),
            ]);

            // Only show auctions belonging to this seller
            const mine = auctionsRes.data.filter(
                a => a.ownerEmail === user?.email
            );
            setAuctions(mine);
            setDeliveries(deliveriesRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            console.error('Failed to load seller data', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCreateAuction = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        const { title, description, startingPrice, startTime, endTime } = form;

        if (!title || !description || !startingPrice || !startTime || !endTime) {
            setFormError('All fields are required.');
            return;
        }

        if (parseFloat(startingPrice) <= 0) {
            setFormError('Starting price must be greater than zero.');
            return;
        }

        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);

        if (start < oneMinuteFromNow) {
            setFormError('Start time must be at least 1 minute in the future.');
            return;
        }

        if (end <= start) {
            setFormError('End time must be after start time.');
            return;
        }

        try {
            setFormLoading(true);
            await axiosInstance.post('/api/auctions', {
                title,
                description,
                startingPrice: parseFloat(startingPrice),
                startTime: startTime +':00',
                endTime: endTime + ':00',
            });
            setForm(EMPTY_FORM);
            setFormSuccess('Auction created successfully.');
            fetchData();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create auction.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleCreateDelivery = async (auctionId) => {
        try {
            await axiosInstance.post('/api/deliveries', { auctionId });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create delivery.');
        }
    };

    const handleDeleteAuction = async (auctionId) => {
        if (!window.confirm('Are you sure you want to delete this auction?')) return;
        try {
            await axiosInstance.delete(`/api/auctions/${auctionId}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete auction.');
        }
    };

    const activeAuctions = auctions.filter(a => a.active);
    const totalRevenue = payments
        .filter(p => p.status === 'RELEASED')
        .reduce((sum, p) => sum + p.sellerAmount, 0);

    const pendingEarnings = payments
        .filter(p => p.status === 'HELD')
        .reduce((sum, p) => sum + p.sellerAmount, 0);

    const pendingDeliveries = deliveries.filter(
        d => d.status !== 'DELIVERED' && d.status !== 'CANCELLED'
    ).length;

    const deliveryExistsFor = (auctionId) =>
        deliveries.some(d => d.auctionId === auctionId);

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
                    Manage your auctions and deliveries from here.
                </p>

                <div className={styles.stats}>
                    <StatCard label="Active auctions" value={activeAuctions.length} />
                    <StatCard label="Released earnings" value={`R${totalRevenue.toLocaleString()}`} />
                    <StatCard label="In escrow"        value={`R${pendingEarnings.toLocaleString()}`} />
                    <StatCard label="Pending deliveries" value={pendingDeliveries} />
                </div>

                {/* Create Auction Form */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Create a new auction</span>
                    </div>
                    <form onSubmit={handleCreateAuction} noValidate>
                        <div className={styles.formGrid}>
                            {formError && (
                                <div className={`${styles.alert} ${styles.alertError}`}>
                                    {formError}
                                </div>
                            )}
                            {formSuccess && (
                                <div className={`${styles.alert} ${styles.alertSuccess}`}>
                                    {formSuccess}
                                </div>
                            )}

                            <div className={`${styles.field} ${styles.full}`}>
                                <label className={styles.label}>Title</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    name="title"
                                    placeholder="e.g. Vintage Leica M6 Camera"
                                    value={form.title}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={`${styles.field} ${styles.full}`}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    className={styles.textarea}
                                    name="description"
                                    placeholder="Describe the item in detail..."
                                    value={form.description}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Starting price (R)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    name="startingPrice"
                                    placeholder="500"
                                    value={form.startingPrice}
                                    onChange={handleChange}
                                    min="1"
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Start time</label>
                                <input
                                    className={styles.input}
                                    type="datetime-local"
                                    name="startTime"
                                    value={form.startTime}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>End time</label>
                                <input
                                    className={styles.input}
                                    type="datetime-local"
                                    name="endTime"
                                    value={form.endTime}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={styles.formBtnRow}>
                                <button
                                    className={styles.btnPrimary}
                                    type="submit"
                                    disabled={formLoading}
                                >
                                    {formLoading ? 'Creating...' : 'Create auction'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* My Auctions */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>My auctions</span>
                        <span className={styles.badge}>{auctions.length} total</span>
                    </div>

                    {auctions.length === 0 ? (
                        <p className={styles.empty}>
                            You haven't created any auctions yet.
                        </p>
                    ) : (
                        auctions.map(auction => {
                            const payment = payments.find(p => p.auctionId === auction.id);
                            const paymentReady = payment &&
                                (payment.status === 'HELD' || payment.status === 'RELEASED');

                            return (
                                <div key={auction.id} className={styles.row}>
                                    <div>
                                        <p className={styles.rowTitle}>{auction.title}</p>
                                        <p className={styles.rowMeta}>
                                            {auction.active
                                                ? `Current price: R${auction.currentPrice?.toLocaleString()}`
                                                : auction.winnerEmail
                                                    ? `Won by ${auction.winnerEmail} · R${auction.currentPrice?.toLocaleString()}`
                                                    : 'Closed — no winner'
                                            }
                                        </p>
                                    </div>
                                    <div className={styles.rowRight}>
                                        <span className={`${styles.statusPill} ${auction.active ? styles.statusActive : styles.statusClosed}`}>
                                            {auction.active ? 'Active' : 'Closed'}
                                        </span>

                                        {/* Payment status badge */}
                                        {payment && (
                                            <span className={`${styles.statusPill} ${
                                                payment.status === 'HELD'     ? styles.statusTransit :
                                                payment.status === 'RELEASED' ? styles.statusDelivered :
                                                payment.status === 'REFUNDED' ? styles.statusCancelled :
                                                styles.statusPending
                                            }`}>
                                                {payment.status === 'HELD'     ? 'In escrow' :
                                                payment.status === 'RELEASED' ? `R${payment.sellerAmount?.toLocaleString()} released` :
                                                payment.status === 'REFUNDED' ? 'Refunded' :
                                                payment.status === 'PENDING'  ? 'Awaiting payment' : ''}
                                            </span>
                                        )}

                                        {/* No payment record yet */}
                                        {!payment && !auction.active && auction.winnerEmail && (
                                            <span className={`${styles.statusPill} ${styles.statusPending}`}>
                                                Awaiting payment
                                            </span>
                                        )}

                                        {/* Create delivery — disabled until payment is in escrow */}
                                        {!auction.active && auction.winnerEmail && !deliveryExistsFor(auction.id) && (
                                            <button
                                                className={styles.outlineBtn}
                                                onClick={() => handleCreateDelivery(auction.id)}
                                                disabled={!paymentReady}
                                                style={{
                                                    opacity: paymentReady ? 1 : 0.4,
                                                    cursor: paymentReady ? 'pointer' : 'not-allowed'
                                                }}
                                                title={!paymentReady ? 'Waiting for buyer payment' : 'Create delivery'}
                                            >
                                                {paymentReady ? 'Create delivery' : 'Awaiting payment'}
                                            </button>
                                        )}

                                        {auction.active && (
                                            <button
                                                className={styles.dangerBtn}
                                                onClick={() => handleDeleteAuction(auction.id)}
                                            >
                                                Delete
                                            </button>
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
                        <span className={styles.badge}>{deliveries.length} total</span>
                    </div>

                    {deliveries.length === 0 ? (
                        <p className={styles.empty}>No deliveries yet.</p>
                    ) : (
                        deliveries.map(delivery => (
                            <div key={delivery.id} className={styles.row}>
                                <div>
                                    <p className={styles.rowTitle}>{delivery.auctionTitle}</p>
                                    <p className={styles.rowMeta}>
                                        Buyer: {delivery.buyerEmail} &middot;{' '}
                                        {delivery.driverEmail
                                            ? `Driver: ${delivery.driverEmail}`
                                            : 'No driver yet'}
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
        </div>
    );
}

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}