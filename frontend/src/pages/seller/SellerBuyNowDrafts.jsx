import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import styles from './SellerListings.module.css';

const EMPTY_FORM = {
    title: '',
    description: '',
    category: '',
    condition: 'NEW',
    unitPrice: '',
    stockQuantity: '1',
    imageFile: null,
};

const CONDITIONS = [
    ['NEW', 'New'],
    ['LIKE_NEW', 'Like new'],
    ['GOOD', 'Good'],
    ['FAIR', 'Fair'],
];

export default function SellerBuyNowDrafts() {
    const [expanded, setExpanded] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [drafts, setDrafts] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        if (!expanded) return;

        const controller = new AbortController();

        async function loadDrafts() {
            setLoading(true);
            setError('');

            try {
                const response = await axiosInstance.get(
                    '/api/product-listings/mine',
                    {
                        params: { page, size: 10 },
                        signal: controller.signal,
                    }
                );

                if (!controller.signal.aborted) {
                    setDrafts(response.data.content);
                    setTotalPages(response.data.totalPages);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err.response?.data?.message ||
                        'Could not load Buy Now drafts. Please try again.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadDrafts();

        return () => controller.abort();
    }, [expanded, page, refresh]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];

        setError('');

        if (!file) {
            setForm(current => ({ ...current, imageFile: null }));
            return;
        }

        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            setError('Select an image no larger than 5MB.');
            event.target.value = '';
            setForm(current => ({ ...current, imageFile: null }));
            return;
        }

        setForm(current => ({ ...current, imageFile: file }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving) return;

        setError('');
        setSuccess('');

        const title = form.title.trim();
        const description = form.description.trim();
        const category = form.category.trim();
        const priceText = form.unitPrice.trim();
        const quantity = Number(form.stockQuantity);

        if (!title || !description || !category) {
            setError('Enter a title, description and category.');
            return;
        }

        if (
            !/^\d+(\.\d{1,2})?$/.test(priceText) ||
            Number(priceText) <= 0
        ) {
            setError('Enter a positive unit price with at most two decimal places.');
            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 2147483647
        ) {
            setError('Quantity must be a whole number greater than zero.');
            return;
        }

        setSaving(true);

        try {
            const imageUrl = form.imageFile
                ? await uploadToCloudinary(form.imageFile)
                : null;

            await axiosInstance.post('/api/product-listings', {
                title,
                description,
                category,
                condition: form.condition,
                unitPrice: priceText,
                stockQuantity: quantity,
                imageUrl,
            });

            setForm(EMPTY_FORM);
            event.target.reset();
            setSuccess('Draft saved. Buyers cannot see or purchase it yet.');
            setPage(0);
            setRefresh(current => current + 1);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not confirm that the draft was saved. Refresh the draft list before trying again.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={styles.formCard}>
            <div className={styles.pageHeader}>
                <div>
                    <h2 className={styles.formTitle}>Buy Now listings</h2>
                    <p className={styles.pageSubtitle}>
                        Set a price per unit and the quantity available.
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.createBtn}
                    aria-expanded={expanded}
                    aria-controls="buy-now-drafts"
                    disabled={saving}
                    onClick={() => setExpanded(current => !current)}
                >
                    {expanded ? 'Close Buy Now' : 'Manage Buy Now'}
                </button>
            </div>

            {expanded && (
                <div id="buy-now-drafts">
                    <p className={styles.pageSubtitle}>
                        These are drafts. Checkout is being added before
                        listings can be published.
                    </p>

                    {error && (
                        <div className={styles.alertError} role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={styles.alertSuccess} role="status">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <fieldset className={styles.draftFieldset} disabled={saving}>
                            <div className={styles.formGrid}>
                                <div className={`${styles.field} ${styles.full}`}>
                                    <label className={styles.label} htmlFor="product-title">
                                        Title
                                    </label>
                                    <input
                                        id="product-title"
                                        className={styles.input}
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        maxLength={200}
                                        required
                                    />
                                </div>

                                <div className={`${styles.field} ${styles.full}`}>
                                    <label className={styles.label} htmlFor="product-description">
                                        Description
                                    </label>
                                    <textarea
                                        id="product-description"
                                        className={styles.textarea}
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        maxLength={10000}
                                        rows={3}
                                        placeholder="Describe the item, its condition and any defects."
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="product-category">
                                        Category
                                    </label>
                                    <input
                                        id="product-category"
                                        className={styles.input}
                                        name="category"
                                        value={form.category}
                                        onChange={handleChange}
                                        maxLength={100}
                                        placeholder="e.g. Art or Clothing"
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="product-condition">
                                        Condition
                                    </label>
                                    <select
                                        id="product-condition"
                                        className={styles.input}
                                        name="condition"
                                        value={form.condition}
                                        onChange={handleChange}
                                    >
                                        {CONDITIONS.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="product-price">
                                        Price per unit (R)
                                    </label>
                                    <input
                                        id="product-price"
                                        className={styles.input}
                                        type="number"
                                        name="unitPrice"
                                        value={form.unitPrice}
                                        onChange={handleChange}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="product-quantity">
                                        Available quantity
                                    </label>
                                    <input
                                        id="product-quantity"
                                        className={styles.input}
                                        type="number"
                                        name="stockQuantity"
                                        value={form.stockQuantity}
                                        onChange={handleChange}
                                        min="1"
                                        max="2147483647"
                                        step="1"
                                        required
                                    />
                                    <span className={styles.pageSubtitle}>
                                        Use one listing for identical units.
                                        List different products separately.
                                    </span>
                                </div>

                                <div className={`${styles.field} ${styles.full}`}>
                                    <label className={styles.label} htmlFor="product-image">
                                        Item image (optional)
                                    </label>
                                    <input
                                        id="product-image"
                                        className={styles.fileInput}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Buy Now draft'}
                                </button>
                            </div>
                        </fieldset>
                    </form>

                    <h3 className={styles.formTitle}>Saved drafts</h3>

                    <button
                        type="button"
                        className={styles.cancelBtn}
                        disabled={loading || saving}
                        onClick={() => setRefresh(current => current + 1)}
                    >
                        Refresh drafts
                    </button>

                    {loading ? (
                        <p className={styles.loading}>Loading drafts...</p>
                    ) : (
                        <div className={styles.listingsList}>
                            {drafts.length === 0 && (
                                <p className={styles.pageSubtitle}>
                                    No drafts on this page.
                                </p>
                            )}

                            {drafts.map(draft => (
                                <div key={draft.id} className={styles.listingCard}>
                                    {draft.imageUrl && (
                                        <div className={styles.listingImageWrap}>
                                            <img
                                                src={draft.imageUrl}
                                                alt={draft.title}
                                                className={styles.listingImage}
                                            />
                                        </div>
                                    )}

                                    <div className={styles.listingInfo}>
                                        <h3 className={styles.listingTitle}>
                                            {draft.title}
                                        </h3>
                                        <p className={styles.listingDesc}>
                                            {draft.description}
                                        </p>
                                        <div className={styles.listingMeta}>
                                            <span className={styles.metaValue}>
                                                R{Number(draft.unitPrice).toFixed(2)} per unit
                                            </span>
                                            <span className={styles.metaValue}>
                                                Quantity: {draft.stockQuantity}
                                            </span>
                                            <span className={styles.textAmber}>
                                                Draft · Not published
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            disabled={page === 0 || loading || saving}
                            onClick={() => setPage(current => current - 1)}
                        >
                            Previous
                        </button>
                        <span className={styles.pageSubtitle}>
                            Page {page + 1} of {Math.max(totalPages, 1)}
                        </span>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            disabled={page + 1 >= totalPages || loading || saving}
                            onClick={() => setPage(current => current + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}