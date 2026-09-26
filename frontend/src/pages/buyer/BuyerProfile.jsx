import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './BuyerProfile.module.css';

export default function BuyerProfile() {
    const { user, login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.fullName) setFullName(user.fullName);
    }, [user]);

    const initials = user?.fullName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword && newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword && newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }

        try {
            setLoading(true);
            await axiosInstance.put('/api/users/me', {
                fullName,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined,
            });
            setSuccess('Profile updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>My Profile</h1>
                        <p className={styles.pageSubtitle}>Manage your account details</p>
                    </div>

                    <div className={styles.profileGrid}>

                        {/* Avatar card */}
                        <div className={styles.avatarCard}>
                            <div className={styles.avatarCircle}>{initials}</div>
                            <h2 className={styles.avatarName}>{user?.fullName}</h2>
                            <p className={styles.avatarEmail}>{user?.email}</p>
                            <span className={styles.roleBadge}>
                                {user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
                            </span>
                            <div className={styles.avatarDivider} />
                            <div className={styles.avatarStat}>
                                <p className={styles.avatarStatLabel}>Member since</p>
                                <p className={styles.avatarStatValue}>2026</p>
                            </div>
                        </div>

                        {/* Edit form */}
                        <div className={styles.formCard}>

                            {error && (
                                <div className={styles.alertError}>{error}</div>
                            )}
                            {success && (
                                <div className={styles.alertSuccess}>{success}</div>
                            )}

                            <form onSubmit={handleSave} noValidate>

                                {/* Personal info */}
                                <div className={styles.formSection}>
                                    <h3 className={styles.formSectionTitle}>Personal information</h3>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Full name</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Your full name"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Email address</label>
                                        <input
                                            className={`${styles.input} ${styles.inputDisabled}`}
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                        />
                                        <p className={styles.fieldHint}>
                                            Email address cannot be changed.
                                        </p>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Role</label>
                                        <input
                                            className={`${styles.input} ${styles.inputDisabled}`}
                                            type="text"
                                            value={user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase() || ''}
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div className={styles.formDivider} />

                                {/* Change password */}
                                <div className={styles.formSection}>
                                    <h3 className={styles.formSectionTitle}>Change password</h3>
                                    <p className={styles.formSectionSub}>
                                        Leave blank if you don't want to change your password.
                                    </p>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Current password</label>
                                        <input
                                            className={styles.input}
                                            type="password"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            placeholder="Enter current password"
                                        />
                                    </div>

                                    <div className={styles.fieldRow}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>New password</label>
                                            <input
                                                className={styles.input}
                                                type="password"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="Min 8 characters"
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Confirm new password</label>
                                            <input
                                                className={styles.input}
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Repeat new password"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formActions}>
                                    <button
                                        type="submit"
                                        className={styles.saveBtn}
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role={user?.role} />
        </div>
    );
}