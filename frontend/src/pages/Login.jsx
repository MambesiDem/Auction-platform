import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const params = new URLSearchParams(window.location.search);
    const sessionExpired = params.get('expired');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.password) {
            setError('Email and password are required.');
            return;
        }

        try {
            setLoading(true);
            const response = await axiosInstance.post('/api/users/login', form);
            const { token, ...userData } = response.data;

            login(userData, token);

            switch (userData.role) {
                case 'SELLER': navigate('/seller/dashboard'); break;
                case 'BUYER':  navigate('/buyer/dashboard');  break;
                case 'DRIVER': navigate('/driver/dashboard'); break;
                case 'ADMIN':  navigate('/admin/dashboard');  break;
                default:       navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <div className={styles.brandDot} />
                    <span className={styles.brandName}>Bidora</span>
                </div>

                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Sign in to your account to continue.</p>

                {sessionExpired && !error && (
                    <div className={styles.error}>
                        Your session has expired. Please sign in again.
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className={styles.field}>
                        <label className={styles.label}>Email address</label>
                        <input
                            className={styles.input}
                            type="email"
                            name="email"
                            placeholder="jane@example.com"
                            value={form.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            name="password"
                            placeholder="Your password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        className={styles.btnPrimary}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <hr className={styles.divider} />
                <p className={styles.linkRow}>
                    Don't have an account? <Link to="/register">Register</Link>
                </p>
            </div>
        </div>
    );
}