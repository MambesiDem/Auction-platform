import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './TopBar.module.css';

export default function TopBar({ onSearch }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const initials = user?.fullName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className={styles.topbar}>
            <div className={styles.search}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    placeholder="Search for items, categories or sellers..."
                    className={styles.searchInput}
                    onChange={e => {
                        if (onSearch) onSearch(e.target.value);
                        if (e.target.value.trim()) {
                            navigate(`/buyer/browse?q=${encodeURIComponent(e.target.value)}`);
                        }
                    }}
                />
            </div>

            <div className={styles.right}>
                <div className={styles.location}>
                    <span>📍</span>
                    <span className={styles.locationText}>South Africa</span>
                    <span className={styles.chevron}>▾</span>
                </div>

                <button className={styles.notifBtn}>
                    🔔
                    <span className={styles.notifBadge}>3</span>
                </button>

                <div
                    className={styles.avatar}
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    title="Sign out"
                >
                    {initials}
                </div>

                <div className={styles.userName}>
                    {user?.fullName?.split(' ')[0]} {user?.fullName?.split(' ')[1]?.[0]}.
                </div>
            </div>
        </header>
    );
}