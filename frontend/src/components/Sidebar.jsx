import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import styles from './Sidebar.module.css';

const buyerLinks = [
    { to: '/buyer/dashboard', icon: '🏠', label: 'Home' },
    { to: '/buyer/browse', icon: '🔍', label: 'Browse' },
    { to: '/buyer/bids', icon: '⚡', label: 'My Bids' },
    { to: '/buyer/watchlist', icon: '❤️', label: 'Watchlist' },
    { to: '/buyer/orders', icon: '📦', label: 'Orders' },
    { to: '/buyer/messages', icon: '✉️', label: 'Messages', showBadge: true },
    { to: '/buyer/searches', icon: '🔖', label: 'Saved Searches' },
    { to: '/buyer/payments', icon: '💳', label: 'Payments' },
    { to: '/buyer/profile', icon: '👤', label: 'Profile' },
    { to: '/buyer/settings', icon: '⚙️', label: 'Settings' },
];

const sellerLinks = [
    { to: '/seller/dashboard', icon: '🏠', label: 'Home' },
    { to: '/seller/listings', icon: '🏷️', label: 'Listings' },
    { to: '/seller/orders', icon: '📦', label: 'Orders' },
    { to: '/seller/analytics', icon: '📊', label: 'Analytics' },
    { to: '/seller/messages', icon: '✉️', label: 'Messages', showBadge: true },
    { to: '/seller/payments', icon: '💳', label: 'Payments' },
    { to: '/seller/profile', icon: '👤', label: 'Profile' },
    { to: '/seller/settings', icon: '⚙️', label: 'Settings' },
];

const driverLinks = [
    { to: '/driver/dashboard', icon: '🏠', label: 'Home' },
    { to: '/driver/jobs', icon: '🚚', label: 'Available Jobs' },
    { to: '/driver/deliveries', icon: '📦', label: 'My Deliveries' },
    { to: '/driver/earnings', icon: '💰', label: 'Earnings' },
    { to: '/driver/profile', icon: '👤', label: 'Profile' },
    { to: '/driver/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ role }) {
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        axiosInstance.get('/api/messages/unread')
            .then(res => setUnread(res.data.count || 0))
            .catch(() => {});
    }, []);

    const links = role === 'SELLER' ? sellerLinks
                : role === 'DRIVER' ? driverLinks
                : buyerLinks;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>C</div>
                <div>
                    <div className={styles.logoText}>ConnSB</div>
                    <div className={styles.logoTagline}>Buy. Bid. Sell. Deliver.</div>
                </div>
            </div>

            <nav className={styles.nav}>
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                        }
                    >
                        <span className={styles.navIcon}>{link.icon}</span>
                        <span className={styles.navLabel}>{link.label}</span>
                        {link.showBadge && unread > 0 && (
                            <span className={styles.navBadge}>{unread}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className={styles.bottom}>
                <div className={styles.localBadge}>
                    <p className={styles.localTitle}>Local people.<br/>Real opportunities.</p>
                    <p className={styles.localSub}>Support South African sellers and informal businesses.</p>
                    <button className={styles.learnMore}>Learn More →</button>
                </div>
            </div>
        </aside>
    );
}