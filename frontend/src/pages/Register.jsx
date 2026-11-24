import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import styles from './Auth.module.css';
import extras from './RegisterExtras.module.css';

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

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        role: '',
        sellerType: 'INDIVIDUAL',
        businessName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const isSeller = form.role === 'SELLER';
    const isBusiness = isSeller && form.sellerType !== 'INDIVIDUAL';

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

        if (isBusiness && form.businessName.trim().length < 2) {
            setError('Enter your business or trading name.');
            return;
        }

        const payload = {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            role: form.role,
        };

        if (isSeller) {
            payload.sellerType = form.sellerType;
            if (isBusiness) {
                payload.businessName = form.businessName.trim();
            }
        }

        try {
            setLoading(true);
            await axiosInstance.post('/api/users/register', payload);
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

                    {isSeller && (
                        <div className={extras.typeBlock}>
                            <span className={extras.typeLabel}>How do you sell?</span>

                            <div className={extras.typeGrid} role="radiogroup" aria-label="Seller type">
                                {SELLER_TYPES.map(option => (
                                    <label
                                        key={option.value}
                                        className={`${extras.typeOption} ${
                                            form.sellerType === option.value ? extras.typeOptionActive : ''
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="sellerType"
                                            value={option.value}
                                            checked={form.sellerType === option.value}
                                            onChange={handleChange}
                                        />
                                        <span>
                                            <span className={extras.typeTitle}>{option.title}</span>
                                            <span className={extras.typeText}>{option.text}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <p className={extras.hint}>
                                You can change this later in your seller profile.
                            </p>
                        </div>
                    )}

                    {isBusiness && (
                        <div className={styles.field}>
                            <label className={styles.label}>Business or trading name</label>
                            <input
                                className={styles.input}
                                type="text"
                                name="businessName"
                                placeholder="e.g. Thabo's Electronics"
                                maxLength={150}
                                value={form.businessName}
                                onChange={handleChange}
                            />
                        </div>
                    )}

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