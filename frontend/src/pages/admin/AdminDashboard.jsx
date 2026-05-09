import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [adminForm, setAdminForm] = useState({
        fullName: '', email: '', password: '', role: 'ADMIN'
    });
    const [adminFormError, setAdminFormError] = useState('');
    const [adminFormSuccess, setAdminFormSuccess] = useState('');
    const [adminFormLoading, setAdminFormLoading] = useState(false);
    const [payments, setPayments] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [usersRes, auctionsRes, deliveriesRes, paymentsRes] = await Promise.all([
                axiosInstance.get('/api/users'),
                axiosInstance.get('/api/auctions'),
                axiosInstance.get('/api/deliveries/pending'),
                axiosInstance.get('/api/payments'),
            ]);
            setUsers(usersRes.data);
            setAuctions(auctionsRes.data);
            setDeliveries(deliveriesRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            console.error('Failed to load admin data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBan = async (userId, currentlyBanned) => {
        const action = currentlyBanned ? 'unban' : 'ban';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            setActionId(userId);
            await axiosInstance.put(`/api/users/${userId}/${action}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${action} user.`);
        } finally {
            setActionId(null);
        }
    };

    const handleForceClose = async (auctionId) => {
        if (!window.confirm('Force close this auction? This cannot be undone.')) return;
        try {
            setActionId(auctionId);
            await axiosInstance.put(`/api/auctions/${auctionId}/close`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close auction.');
        } finally {
            setActionId(null);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setAdminFormError('');
        setAdminFormSuccess('');

        if (!adminForm.fullName || !adminForm.email || !adminForm.password) {
            setAdminFormError('All fields are required.');
            return;
        }

        if (adminForm.password.length < 8) {
            setAdminFormError('Password must be at least 8 characters.');
            return;
        }

        try {
            setAdminFormLoading(true);
            await axiosInstance.post('/api/users/create-admin', adminForm);
            setAdminFormSuccess('Admin account created successfully.');
            setAdminForm({ fullName: '', email: '', password: '', role: 'ADMIN' });
            fetchData();
        } catch (err) {
            setAdminFormError(err.response?.data?.message || 'Failed to create admin.');
        } finally {
            setAdminFormLoading(false);
        }
    };

    const activeAuctions = auctions.filter(a => a.active);
    const totalAuctions  = auctions.length;

    const getRoleStyle = (role) => {
        switch (role) {
            case 'BUYER':  return styles.roleBuyer;
            case 'SELLER': return styles.roleSeller;
            case 'DRIVER': return styles.roleDriver;
            case 'ADMIN':  return styles.roleAdmin;
            default:       return styles.roleBuyer;
        }
    };

    const getDeliveryStatusStyle = (status) => {
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
                <div className={styles.loading}>Loading admin dashboard...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Navbar />

            <div className={styles.main}>
                <p className={styles.greeting}>Admin dashboard</p>
                <p className={styles.greetingSub}>
                    Monitor and manage all platform activity.
                </p>

                <div className={styles.stats}>
                    <StatCard label="Total users"     value={users.length} />
                    <StatCard label="Active auctions" value={activeAuctions.length} />
                    <StatCard label="Total auctions"  value={totalAuctions} />
                    <StatCard label="Deliveries"      value={deliveries.length} />
                </div>

                {/* Create Admin */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Create admin account</span>
                    </div>
                    <form onSubmit={handleCreateAdmin} noValidate>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr auto',
                            gap: '12px',
                            padding: '18px',
                            alignItems: 'end'
                        }}>
                            {(adminFormError || adminFormSuccess) && (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    background: adminFormError ? '#fef2f2' : '#f0fdf4',
                                    border: `0.5px solid ${adminFormError ? '#fca5a5' : '#86efac'}`,
                                    color: adminFormError ? '#b91c1c' : '#166534',
                                }}>
                                    {adminFormError || adminFormSuccess}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '12px', color: '#4b5563' }}>Full name</label>
                                <input
                                    style={{
                                        height: '36px', border: '0.5px solid #d1d5db',
                                        borderRadius: '8px', padding: '0 10px',
                                        fontSize: '13px', outline: 'none'
                                    }}
                                    type="text"
                                    placeholder="Admin Name"
                                    value={adminForm.fullName}
                                    onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '12px', color: '#4b5563' }}>Email</label>
                                <input
                                    style={{
                                        height: '36px', border: '0.5px solid #d1d5db',
                                        borderRadius: '8px', padding: '0 10px',
                                        fontSize: '13px', outline: 'none'
                                    }}
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={adminForm.email}
                                    onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '12px', color: '#4b5563' }}>Password</label>
                                <input
                                    style={{
                                        height: '36px', border: '0.5px solid #d1d5db',
                                        borderRadius: '8px', padding: '0 10px',
                                        fontSize: '13px', outline: 'none'
                                    }}
                                    type="password"
                                    placeholder="Min. 8 characters"
                                    autoComplete="new-password"
                                    value={adminForm.password}
                                    onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={adminFormLoading}
                                style={{
                                    height: '36px', padding: '0 20px',
                                    background: adminFormLoading ? '#93c5fd' : '#185FA5',
                                    color: '#fff', border: 'none',
                                    borderRadius: '8px', fontSize: '13px',
                                    fontWeight: '500', cursor: adminFormLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {adminFormLoading ? 'Creating...' : 'Create admin'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* User Management */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>User management</span>
                        <span className={styles.badge}>{users.length} users</span>
                    </div>
                    {users.length === 0 ? (
                        <p className={styles.empty}>No users found.</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.fullName}</td>
                                            <td className={styles.muted}>{u.email}</td>
                                            <td>
                                                <span className={`${styles.pill} ${getRoleStyle(u.role)}`}>
                                                    {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                                                </span>
                                            </td>
                                            <td>
                                                {u.banned ? (
                                                    <span className={`${styles.pill} ${styles.statusBanned}`}>
                                                        Banned
                                                    </span>
                                                ) : (
                                                    <span className={styles.activeLabel}>Active</span>
                                                )}
                                            </td>
                                            <td>
                                                {u.role !== 'ADMIN' && (
                                                    <button
                                                        className={u.banned ? styles.unbanBtn : styles.banBtn}
                                                        onClick={() => handleBan(u.id, u.banned)}
                                                        disabled={actionId === u.id}
                                                    >
                                                        {actionId === u.id
                                                            ? '...'
                                                            : u.banned ? 'Unban' : 'Ban'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Active Auctions */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Active auctions</span>
                        <span className={styles.badge}>{activeAuctions.length} live</span>
                    </div>
                    {activeAuctions.length === 0 ? (
                        <p className={styles.empty}>No active auctions.</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Seller</th>
                                        <th>Current price</th>
                                        <th>Ends at</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeAuctions.map(a => (
                                        <tr key={a.id}>
                                            <td>{a.title}</td>
                                            <td className={styles.muted}>{a.ownerEmail}</td>
                                            <td>R{a.currentPrice?.toLocaleString()}</td>
                                            <td className={styles.muted}>
                                                {new Date(a.endTime).toLocaleString()}
                                            </td>
                                            <td>
                                                <button
                                                    className={styles.closeBtn}
                                                    onClick={() => handleForceClose(a.id)}
                                                    disabled={actionId === a.id}
                                                >
                                                    {actionId === a.id ? '...' : 'Force close'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* All Deliveries */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>All deliveries</span>
                        <span className={styles.badge}>{deliveries.length} total</span>
                    </div>
                    {deliveries.length === 0 ? (
                        <p className={styles.empty}>No deliveries yet.</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Seller</th>
                                        <th>Buyer</th>
                                        <th>Driver</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveries.map(d => (
                                        <tr key={d.id}>
                                            <td>{d.auctionTitle}</td>
                                            <td className={styles.muted}>{d.sellerEmail}</td>
                                            <td className={styles.muted}>{d.buyerEmail}</td>
                                            <td className={styles.muted}>
                                                {d.driverEmail || '—'}
                                            </td>
                                            <td>
                                                <span className={`${styles.pill} ${getDeliveryStatusStyle(d.status)}`}>
                                                    {formatStatus(d.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Payments */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Payments</span>
                        <span className={styles.badge}>{payments.length} total</span>
                    </div>
                    {payments.length === 0 ? (
                        <p className={styles.empty}>No payments yet.</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Buyer</th>
                                        <th>Seller</th>
                                        <th>Total</th>
                                        <th>Commission</th>
                                        <th>Seller gets</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.auctionTitle}</td>
                                            <td className={styles.muted}>{p.buyerEmail}</td>
                                            <td className={styles.muted}>{p.sellerEmail}</td>
                                            <td>R{p.totalAmount?.toLocaleString()}</td>
                                            <td className={styles.muted}>
                                                R{p.commissionAmount?.toLocaleString()}
                                            </td>
                                            <td>R{p.sellerAmount?.toLocaleString()}</td>
                                            <td>
                                                <span className={`${styles.pill} ${
                                                    p.status === 'PENDING'  ? styles.statusPending  :
                                                    p.status === 'HELD'     ? styles.statusTransit  :
                                                    p.status === 'RELEASED' ? styles.statusDelivered :
                                                    p.status === 'REFUNDED' ? styles.statusCancelled :
                                                    p.status === 'FAILED'   ? styles.statusBanned   :
                                                    styles.statusPending
                                                }`}>
                                                    {p.status === 'HELD' ? 'In escrow' :
                                                    p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                                                </span>
                                            </td>
                                            <td>
                                                {p.status === 'HELD' && (
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                        Auto-releases on delivery
                                                    </span>
                                                )}
                                                {p.status === 'PENDING' && (
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                        Awaiting buyer payment
                                                    </span>
                                                )}
                                                {p.status === 'RELEASED' && (
                                                    <span style={{ fontSize: '12px', color: '#16a34a' }}>
                                                        Paid to seller
                                                    </span>
                                                )}
                                                {p.status === 'REFUNDED' && (
                                                    <span style={{ fontSize: '12px', color: '#dc2626' }}>
                                                        Refunded to buyer
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}