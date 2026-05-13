import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className={styles.nav}>
            <div className={styles.brand}>
                <div className={styles.brandDot} />
                <span className={styles.brandName}>Bidora</span>
            </div>
            <div className={styles.right}>
                <span className={styles.userInfo}>
                    {user?.fullName} &middot; {user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
                </span>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Sign out
                </button>
            </div>
        </nav>
    );
}
