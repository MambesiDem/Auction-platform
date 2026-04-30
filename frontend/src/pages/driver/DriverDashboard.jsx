import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import styles from './DriverDashboard.module.css';

const STATUS_OPTIONS = [
    { value: 'PICKED_UP',  label: 'Picked up' },
    { value: 'IN_TRANSIT', label: 'In transit' },
    { value: 'DELIVERED',  label: 'Delivered' },
];

export default function DriverDashboard() {
    const { user } = useAuth();
    const [pendingJobs, setPendingJobs] = useState([]);
    const [myDeliveries, setMyDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [pendingRes, myRes] = await Promise.all([
                axiosInstance.get('/api/deliveries/pending'),
                axiosInstance.get('/api/deliveries/my-deliveries'),
            ]);
            setPendingJobs(pendingRes.data);
            setMyDeliveries(myRes.data);
        } catch (err) {
            console.error('Failed to load driver data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAccept = async (deliveryId) => {
        try {
            setAcceptingId(deliveryId);
            await axiosInstance.put(`/api/deliveries/${deliveryId}/accept`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to accept delivery.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleStatusUpdate = async (deliveryId, newStatus) => {
        if (!newStatus) return;
        try {
            setUpdatingId(deliveryId);
            await axiosInstance.put(
                `/api/deliveries/${deliveryId}/status?status=${newStatus}`
            );
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const activeDeliveries = myDeliveries.filter(
        d => d.status !== 'DELIVERED' && d.status !== 'CANCELLED'
    );
    const completedDeliveries = myDeliveries.filter(
        d => d.status === 'DELIVERED'
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PENDING':    return styles.statusPending;
            case 'ACCEPTED':   return styles.statusAccepted;
            case 'PICKED_UP':  return styles.statusPickedUp;
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

    // Only show status options that move forward
    const getAvailableStatuses = (currentStatus) => {
        const order = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
        const currentIndex = order.indexOf(currentStatus);
        return STATUS_OPTIONS.filter(opt =>
            order.indexOf(opt.value) > currentIndex
        );
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
                    Browse available jobs and manage your active deliveries.
                </p>

                <div className={styles.stats}>
                    <StatCard label="Available jobs"    value={pendingJobs.length} />
                    <StatCard label="Active deliveries" value={activeDeliveries.length} />
                    <StatCard label="Completed"         value={completedDeliveries.length} />
                </div>

                {/* Available Jobs */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Available jobs</span>
                        <span className={styles.badge}>
                            {pendingJobs.length} pending
                        </span>
                    </div>

                    {pendingJobs.length === 0 ? (
                        <p className={styles.empty}>
                            No delivery jobs available right now.
                        </p>
                    ) : (
                        pendingJobs.map(job => (
                            <div key={job.id} className={styles.row}>
                                <div>
                                    <p className={styles.rowTitle}>{job.auctionTitle}</p>
                                    <p className={styles.rowMeta}>
                                        Seller: {job.sellerEmail} &middot; Buyer: {job.buyerEmail}
                                    </p>
                                </div>
                                <div className={styles.rowRight}>
                                    <span className={`${styles.statusPill} ${styles.statusPending}`}>
                                        Pending
                                    </span>
                                    <button
                                        className={styles.acceptBtn}
                                        onClick={() => handleAccept(job.id)}
                                        disabled={acceptingId === job.id}
                                    >
                                        {acceptingId === job.id ? 'Accepting...' : 'Accept job'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* My Deliveries */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>My deliveries</span>
                        <span className={styles.badge}>
                            {activeDeliveries.length} active
                        </span>
                    </div>

                    {myDeliveries.length === 0 ? (
                        <p className={styles.empty}>
                            You haven't accepted any deliveries yet.
                        </p>
                    ) : (
                        myDeliveries.map(delivery => {
                            const availableStatuses = getAvailableStatuses(delivery.status);
                            return (
                                <div key={delivery.id} className={styles.row}>
                                    <div>
                                        <p className={styles.rowTitle}>
                                            {delivery.auctionTitle}
                                        </p>
                                        <p className={styles.rowMeta}>
                                            Buyer: {delivery.buyerEmail} &middot;
                                            Seller: {delivery.sellerEmail}
                                        </p>
                                    </div>
                                    <div className={styles.rowRight}>
                                        <span className={`${styles.statusPill} ${getStatusStyle(delivery.status)}`}>
                                            {formatStatus(delivery.status)}
                                        </span>

                                        {delivery.status !== 'DELIVERED' &&
                                         delivery.status !== 'CANCELLED' &&
                                         availableStatuses.length > 0 && (
                                            <select
                                                className={styles.statusSelect}
                                                defaultValue=""
                                                disabled={updatingId === delivery.id}
                                                onChange={(e) => handleStatusUpdate(
                                                    delivery.id,
                                                    e.target.value
                                                )}
                                            >
                                                <option value="" disabled>
                                                    {updatingId === delivery.id
                                                        ? 'Updating...'
                                                        : 'Update status'}
                                                </option>
                                                {availableStatuses.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {delivery.status === 'DELIVERED' && (
                                            <span className={styles.completedLabel}>
                                                Complete
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
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