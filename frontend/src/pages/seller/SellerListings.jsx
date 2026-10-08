import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerListings.module.css';

const EMPTY_FORM = {
    title: '',
    description: '',
    startingPrice: '',
    startTime: '',
    endTime: '',
    imageFile: null,
    imagePreview: null,
    reservePrice: '',
};

const TABS = ['All', 'Active', 'Closed', 'No Winner'];

export default function SellerListings() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [payments, setPayments] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [deletingId, setDeletingId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [auctionsRes, paymentsRes, deliveriesRes] = await Promise.all([
                axiosInstance.get('/api/auctions'),
                axiosInstance.get('/api/payments/my-earnings'),
                axiosInstance.get('/api/deliveries/my-sales'),
            ]);
            const mine = auctionsRes.data.filter(a => a.ownerEmail === user?.email);
            setAuctions(mine);
            setPayments(paymentsRes.data);
            setDeliveries(deliveriesRes.data);
        } catch (err) {
            console.error('Failed to load listings', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFormError('Please select an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setFormError('Image must be smaller than 5MB.');
            return;
        }
        setForm({
            ...form,
            imageFile: file,
            imagePreview: URL.createObjectURL(file)
        });
    };

    const handleCreateAuction = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        const { title, description, startingPrice, startTime, endTime } = form;

        if (!title || !description || !startingPrice || !startTime || !endTime) {
            setFormError('All fields are required.');
            return;
        }
        if (parseFloat(startingPrice) <= 0) {
            setFormError('Starting price must be greater than zero.');
            return;
        }

        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start < new Date(now.getTime() + 60000)) {
            setFormError('Start time must be at least 1 minute in the future.');
            return;
        }
        if (end <= start) {
            setFormError('End time must be after start time.');
            return;
        }

        try {
            setFormLoading(true);
            let imageUrl = null;
            if (form.imageFile) {
                imageUrl = await uploadToCloudinary(form.imageFile);
            }
            await axiosInstance.post('/api/auctions', {
                title,
                description,
                startingPrice: parseFloat(startingPrice),
                startTime: startTime + ':00',
                endTime: endTime + ':00',
                imageUrl,
                reservePrice: form.reservePrice ? parseFloat(form.reservePrice) : 0,
            });
            setForm(EMPTY_FORM);
            setFormSuccess('Auction created successfully!');
            setShowForm(false);
            fetchData();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create auction.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (auctionId) => {
        if (!window.confirm('Are you sure you want to delete this auction?')) return;
        setDeletingId(auctionId);
        try {
            await axiosInstance.delete(`/api/auctions/${auctionId}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete auction.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateDelivery = async (auctionId) => {
        try {
            await axiosInstance.post('/api/deliveries', { auctionId });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create delivery.');
        }
    };

    const handleReopen = async (auctionId) => {
        if (!window.confirm('Reopen this auction for 24 hours?')) return;
        try {
            await axiosInstance.put(`/api/auctions/${auctionId}/reopen`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reopen auction.');
        }
    };

    const deliveryExistsFor = (auctionId) =>
        deliveries.some(d => d.auctionId === auctionId);

    const filtered = (() => {
        switch (activeTab) {
            case 'Active': return auctions.filter(a => a.active);
            case 'Closed': return auctions.filter(a => !a.active && a.winnerEmail);
            case 'No Winner': return auctions.filter(a => !a.active && !a.winnerEmail);
            default: return auctions;
        }
    })();

    const tabCount = (tab) => {
        switch (tab) {
            case 'Active': return auctions.filter(a => a.active).length;
            case 'Closed': return auctions.filter(a => !a.active && a.winnerEmail).length;
            case 'No Winner': return auctions.filter(a => !a.active && !a.winnerEmail).length;
            default: return auctions.length;
        }
    };

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading listings...</div>
            </div>
            <BottomNav role="SELLER" />
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>My Listings</h1>
                            <p className={styles.pageSubtitle}>
                                {auctions.length} listing{auctions.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <button
                            className={styles.createBtn}
                            onClick={() => {
                                setShowForm(!showForm);
                                setFormError('');
                                setFormSuccess('');
                            }}
                        >
                            {showForm ? '✕ Cancel' : '+ New Auction'}
                        </button>
                    </div>

                    {/* Success message */}
                    {formSuccess && (
                        <div className={styles.alertSuccess}>{formSuccess}</div>
                    )}

                    {/* Create auction form */}
                    {showForm && (
                        <div className={styles.formCard}>
                            <h2 className={styles.formTitle}>Create New Auction</h2>
                            {formError && (
                                <div className={styles.alertError}>{formError}</div>
                            )}
                            <form onSubmit={handleCreateAuction} noValidate>
                                <div className={styles.formGrid}>
                                    <div className={`${styles.field} ${styles.full}`}>
                                        <label className={styles.label}>Title</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            name="title"
                                            placeholder="e.g. Vintage Leica M6 Camera"
                                            value={form.title}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className={`${styles.field} ${styles.full}`}>
                                        <label className={styles.label}>Description</label>
                                        <textarea
                                            className={styles.textarea}
                                            name="description"
                                            placeholder="Describe the item in detail..."
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={3}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Starting price (R)</label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            name="startingPrice"
                                            placeholder="500"
                                            value={form.startingPrice}
                                            onChange={handleChange}
                                            min="1"
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Reserve price (R) — optional
                                        </label>
                                        <input
                                            className={styles.input}
                                            type="number"
                                            name="reservePrice"
                                            placeholder="Leave blank for no reserve"
                                            value={form.reservePrice}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                        <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                                            If set, the auction only completes if bidding reaches this amount.
                                        </span>
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Item image (optional)</label>
                                        <input
                                            className={styles.fileInput}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                        {form.imagePreview && (
                                            <div className={styles.imagePreviewWrap}>
                                                <img
                                                    src={form.imagePreview}
                                                    alt="Preview"
                                                    className={styles.imagePreview}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles.removeImage}
                                                    onClick={() => setForm({
                                                        ...form,
                                                        imageFile: null,
                                                        imagePreview: null
                                                    })}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Start time</label>
                                        <input
                                            className={styles.input}
                                            type="datetime-local"
                                            name="startTime"
                                            value={form.startTime}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>End time</label>
                                        <input
                                            className={styles.input}
                                            type="datetime-local"
                                            name="endTime"
                                            value={form.endTime}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        onClick={() => {
                                            setShowForm(false);
                                            setForm(EMPTY_FORM);
                                            setFormError('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={formLoading}
                                    >
                                        {formLoading ? 'Creating...' : 'Create Auction'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                <span className={styles.tabCount}>{tabCount(tab)}</span>
                            </button>
                        ))}
                    </div>

                    {/* Listings */}
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🏷️</div>
                            <h3 className={styles.emptyTitle}>No listings here</h3>
                            <p className={styles.emptySub}>
                                {activeTab === 'All'
                                    ? "You haven't created any auctions yet."
                                    : `No ${activeTab.toLowerCase()} listings.`}
                            </p>
                            {activeTab === 'All' && (
                                <button
                                    className={styles.createBtn}
                                    onClick={() => setShowForm(true)}
                                >
                                    + Create your first auction
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.listingsList}>
                            {filtered.map(auction => {
                                const payment = payments.find(p => p.auctionId === auction.id);
                                const paymentReady = payment &&
                                    (payment.status === 'HELD' || payment.status === 'RELEASED');
                                const auctionPayment = payments.find(p => p.auctionId === auction.id);
                                const paymentLocked = auctionPayment &&
                                    (auctionPayment.status === 'HELD' || auctionPayment.status === 'RELEASED');
                                const auctionDelivery = deliveries.find(d => d.auctionId === auction.id);
                                const deliveryLocked = auctionDelivery &&
                                    auctionDelivery.status !== 'PENDING' &&
                                    auctionDelivery.status !== 'CANCELLED';
                                const canDelete = !paymentLocked && !deliveryLocked;

                                return (
                                    <div key={auction.id} className={styles.listingCard}>
                                        {/* Image */}
                                        <div className={styles.listingImageWrap}>
                                            {auction.imageUrl ? (
                                                <img
                                                    src={auction.imageUrl}
                                                    alt={auction.title}
                                                    className={styles.listingImage}
                                                />
                                            ) : (
                                                <div className={styles.listingImagePlaceholder}>
                                                    🏷️
                                                </div>
                                            )}
                                            <span className={`${styles.listingStatus} ${
                                                auction.active ? styles.statusActive : styles.statusClosed
                                            }`}>
                                                {auction.active ? 'Live' : 'Closed'}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className={styles.listingInfo}>
                                            <h3 className={styles.listingTitle}>{auction.title}</h3>
                                            <p className={styles.listingDesc}>{auction.description}</p>

                                            <div className={styles.listingMeta}>
                                                <div className={styles.metaItem}>
                                                    <span className={styles.metaLabel}>Current price</span>
                                                    <span className={styles.metaValue}>
                                                        R{auction.currentPrice?.toLocaleString()}
                                                    </span>
                                                </div>
                                                {!auction.active && auction.winnerEmail && (
                                                    <div className={styles.metaItem}>
                                                        <span className={styles.metaLabel}>Winner</span>
                                                        <span className={styles.metaValue}>
                                                            {auction.winnerEmail}
                                                        </span>
                                                    </div>
                                                )}
                                                {payment && (
                                                    <div className={styles.metaItem}>
                                                        <span className={styles.metaLabel}>Payment</span>
                                                        <span className={`${styles.metaValue} ${
                                                            payment.status === 'HELD' ? styles.textBlue :
                                                            payment.status === 'RELEASED' ? styles.textGreen :
                                                            styles.textAmber
                                                        }`}>
                                                            {payment.status === 'HELD'     ? 'In escrow' :
                                                             payment.status === 'RELEASED' ? `R${payment.sellerAmount?.toLocaleString()} released` :
                                                             payment.status === 'REFUNDED' ? 'Refunded' :
                                                             'Awaiting payment'}
                                                        </span>
                                                    </div>
                                                )}
                                                {!payment && !auction.active && auction.winnerEmail && (
                                                    <div className={styles.metaItem}>
                                                        <span className={styles.metaLabel}>Payment</span>
                                                        <span className={styles.textAmber}>
                                                            Awaiting payment
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className={styles.listingActions}>
                                            {/* Create delivery */}
                                            {!auction.active && auction.winnerEmail &&
                                             !deliveryExistsFor(auction.id) && (
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => handleCreateDelivery(auction.id)}
                                                    disabled={!paymentReady}
                                                    style={{
                                                        opacity: paymentReady ? 1 : 0.4,
                                                        cursor: paymentReady ? 'pointer' : 'not-allowed'
                                                    }}
                                                    title={!paymentReady
                                                        ? 'Waiting for buyer payment'
                                                        : 'Create delivery'}
                                                >
                                                    {paymentReady ? '🚚 Create delivery' : '⏳ Awaiting payment'}
                                                </button>
                                            )}

                                            {/* Delivery exists */}
                                            {!auction.active && deliveryExistsFor(auction.id) && (
                                                <span className={styles.deliveryCreated}>
                                                    ✅ Delivery created
                                                </span>
                                            )}

                                            {/* Reopen */}
                                            {!auction.active && !auction.winnerEmail && (
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => handleReopen(auction.id)}
                                                >
                                                    🔄 Reopen
                                                </button>
                                            )}

                                            {/* Delete */}
                                            {canDelete && (
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDelete(auction.id)}
                                                    disabled={deletingId === auction.id}
                                                >
                                                    {deletingId === auction.id ? '...' : '🗑 Delete'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role="SELLER" />
        </div>
    );
}