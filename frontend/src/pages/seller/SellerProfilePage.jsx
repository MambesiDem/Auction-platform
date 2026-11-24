import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerProfilePage.module.css';

const SELLER_TYPES = [
    {
        value: 'INDIVIDUAL',
        title: 'Individual',
        text: 'You sell your own items, second-hand goods or things you make.',
    },
    {
        value: 'INFORMAL_BUSINESS',
        title: 'Small or informal business',
        text: 'A stall, home business or independent trader. Registration is not required.',
    },
    {
        value: 'REGISTERED_BUSINESS',
        title: 'Registered business',
        text: 'A company or registered trader with its own trading name.',
    },
];

const TYPE_LABELS = Object.fromEntries(
    SELLER_TYPES.map(type => [type.value, type.title])
);

const ROLE_LABELS = {
    OWNER: 'Owner',
    ADMINISTRATOR: 'Administrator',
    STORE_MANAGER: 'Store manager',
    SALES: 'Sales',
    VIEWER: 'Viewer',
};

const EDIT_ROLES = ['OWNER', 'ADMINISTRATOR'];

function ProfileCard({ profile, onSaved, onNotice }) {
    const [displayName, setDisplayName] = useState(profile.displayName);
    const [sellerType, setSellerType] = useState(profile.sellerType);
    const [saving, setSaving] = useState(false);

    const canEdit = EDIT_ROLES.includes(profile.memberRole);
    const changed =
        displayName.trim() !== profile.displayName ||
        sellerType !== profile.sellerType;
    const nameValid = displayName.trim().length >= 2;

    const handleSave = async (event) => {
        event.preventDefault();
        if (!canEdit || !changed || !nameValid || saving) return;

        setSaving(true);

        try {
            const response = await axiosInstance.put(
                `/api/seller-profiles/${profile.id}`,
                { displayName: displayName.trim(), sellerType }
            );

            onSaved(response.data);
            onNotice({ type: 'success', text: 'Your seller profile has been updated.' });
        } catch (err) {
            onNotice({
                type: 'error',
                text: err.response?.data?.message ||
                    'Could not save your profile. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className={styles.card} onSubmit={handleSave}>
            <div className={styles.cardHead}>
                <div className={styles.avatar} aria-hidden="true">
                    {profile.displayName?.[0]?.toUpperCase() || 'S'}
                </div>

                <div className={styles.headInfo}>
                    <h2 className={styles.profileName}>{profile.displayName}</h2>
                    <div className={styles.chips}>
                        <span className={`${styles.chip} ${styles.chipNavy}`}>
                            {TYPE_LABELS[profile.sellerType] || profile.sellerType}
                        </span>
                        <span className={`${styles.chip} ${profile.verificationLevel > 0 ? '' : styles.chipAmber}`}>
                            {profile.verificationLevel > 0
                                ? `Verified · level ${profile.verificationLevel}`
                                : 'Not verified yet'}
                        </span>
                        <span className={styles.chip}>
                            Your role: {ROLE_LABELS[profile.memberRole] || profile.memberRole}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor={`name-${profile.id}`}>
                    Name shown to buyers
                </label>
                <input
                    id={`name-${profile.id}`}
                    className={styles.input}
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    maxLength={150}
                    disabled={!canEdit || saving}
                />
            </div>

            <div className={styles.field}>
                <span className={styles.label}>How you sell</span>

                <div className={styles.typeGrid} role="radiogroup" aria-label="Seller type">
                    {SELLER_TYPES.map(option => (
                        <label
                            key={option.value}
                            className={`${styles.typeOption} ${
                                sellerType === option.value ? styles.typeOptionActive : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name={`type-${profile.id}`}
                                value={option.value}
                                checked={sellerType === option.value}
                                onChange={() => setSellerType(option.value)}
                                disabled={!canEdit || saving}
                            />
                            <span>
                                <span className={styles.typeTitle}>{option.title}</span>
                                <span className={styles.typeText}>{option.text}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Profile handle</span>
                <span className={styles.readOnly}>{profile.slug}</span>
            </div>

            {canEdit ? (
                <div className={styles.actions}>
                    <button
                        type="submit"
                        className={styles.saveBtn}
                        disabled={!changed || !nameValid || saving}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            ) : (
                <p className={styles.note}>
                    Only an owner or administrator can edit this profile.
                </p>
            )}
        </form>
    );
}

export default function SellerProfilePage() {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);

    const load = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/api/seller-profiles/mine');
            setProfiles(response.data);
        } catch (err) {
            setNotice({
                type: 'error',
                text: 'Could not load your seller profile. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSaved = (updated) => {
        setProfiles(current =>
            current.map(profile => (profile.id === updated.id ? updated : profile))
        );
    };

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>Seller profile</h1>
                        <p className={styles.pageSubtitle}>
                            How buyers see you on ConnSB
                        </p>
                    </div>

                    {notice && (
                        <div
                            className={`${styles.notice} ${
                                notice.type === 'error' ? styles.noticeError : styles.noticeSuccess
                            }`}
                            role="status"
                        >
                            <span>{notice.text}</span>
                            <button
                                type="button"
                                className={styles.noticeClose}
                                aria-label="Dismiss message"
                                onClick={() => setNotice(null)}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.loading}>Loading your profile...</div>
                    ) : profiles.length === 0 ? (
                        <div className={styles.empty}>
                            No seller profile found for this account.
                        </div>
                    ) : (
                        profiles.map(profile => (
                            <ProfileCard
                                key={profile.id}
                                profile={profile}
                                onSaved={handleSaved}
                                onNotice={setNotice}
                            />
                        ))
                    )}

                    <div className={styles.card}>
                        <h3 className={styles.soonTitle}>Coming to your profile</h3>
                        <ul className={styles.soonList}>
                            <li>Identity and business verification, with badges buyers can see</li>
                            <li>Store locations and branches, with their own pickup addresses</li>
                            <li>Team members, so staff can manage listings and orders</li>
                            <li>Ratings and reviews from buyers</li>
                        </ul>
                    </div>

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role={user?.role} />
        </div>
    );
}