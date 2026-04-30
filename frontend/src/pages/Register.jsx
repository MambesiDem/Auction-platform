import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import styles from './Auth.module.css';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        role: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.fullName || !form.email || !form.password || !form.role) {
            setError('All fields are required.');
            return;
        }

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        try {
            setLoading(true);
            await axiosInstance.post('/api/users/register', form);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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

                <h1 className={styles.title}>Create an account</h1>
                <p className={styles.subtitle}>Join the platform to buy, sell, or deliver.</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className={styles.field}>
                        <label className={styles.label}>Full name</label>
                        <input
                            className={styles.input}
                            type="text"
                            name="fullName"
                            placeholder="Jane Doe"
                            value={form.fullName}
                            onChange={handleChange}
                        />
                    </div>

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
                            placeholder="Min. 8 characters"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>I am a</label>
                        <select
                            className={styles.select}
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                        >
                            <option value="">Select a role</option>
                            <option value="BUYER">Buyer</option>
                            <option value="SELLER">Seller</option>
                            <option value="DRIVER">Driver</option>
                        </select>
                    </div>

                    <button
                        className={styles.btnPrimary}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <hr className={styles.divider} />
                <p className={styles.linkRow}>
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}