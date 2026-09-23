import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const buyerItems = [
    { to: '/buyer/dashboard', icon: '🏠', label: 'Home' },
    { to: '/buyer/browse', icon: '🔍', label: 'Browse' },
    { to: '/buyer/bids', icon: '⚡', label: 'Bids' },
    { to: '/buyer/orders', icon: '📦', label: 'Orders' },
    { to: '/buyer/profile', icon: '👤', label: 'Profile' },
];

const sellerItems = [
    { to: '/seller/dashboard', icon: '🏠', label: 'Home' },
    { to: '/seller/listings', icon: '🏷️', label: 'Listings' },
    { to: '/seller/orders', icon: '📦', label: 'Orders' },
    { to: '/seller/messages', icon: '✉️', label: 'Messages' },
    { to: '/seller/profile', icon: '👤', label: 'Profile' },
];

const driverItems = [
    { to: '/driver/dashboard', icon: '🏠', label: 'Home' },
    { to: '/driver/jobs', icon: '🚚', label: 'Jobs' },
    { to: '/driver/deliveries', icon: '📦', label: 'Deliveries' },
    { to: '/driver/earnings', icon: '💰', label: 'Earnings' },
    { to: '/driver/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav({ role }) {
    const items = role === 'SELLER' ? sellerItems
               : role === 'DRIVER' ? driverItems
               : buyerItems;

    return (
        <nav className={styles.nav}>
            {items.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `${styles.item} ${isActive ? styles.itemActive : ''}`
                    }
                >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}