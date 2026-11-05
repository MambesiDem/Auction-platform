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

// Suggestions only. Sellers can still type any category.
const CATEGORY_SUGGESTIONS = [
    'Electronics',
    'Fashion',
    'Furniture',
    'Vehicles',
    'Art',
    'Collectables',
    'Home',
    'Other',
];

const conditionLabel = (value) => {
    const match = CONDITIONS.find(([key]) => key === value);
    return match ? match[1] : value;
};

const money = (value) => `R${Number(value).toFixed(2)}`;

export default function SellerBuyNowDrafts() {
    const [expanded, setExpanded] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [listings, setListings] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [publishingId, setPublishingId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileKey, setFileKey] = useState(0);

    const busy = saving || publishingId !== null;

    // Load the seller's Buy Now listings (drafts and published) when the panel is open.
    useEffect(() => {
        if (!expanded) return undefined;

        const controller = new AbortController();

        async function loadListings() {
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
                    setListings(response.data.content);
                    setTotalPages(response.data.totalPages);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err.response?.data?.message ||
                        'Could not load your Buy Now listings. Please try again.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadListings();

        return () => controller.abort();
    }, [expanded, page, refresh]);

    // Preview of the image chosen in the form. The temporary URL is released on change.
    useEffect(() => {
        if (!form.imageFile) {
            setPreviewUrl(null);
            return undefined;
        }

        const url = URL.createObjectURL(form.imageFile);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [form.imageFile]);

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

    const handleRemoveImage = () => {
        setForm(current => ({ ...current, imageFile: null }));
        setFileKey(current => current + 1);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy) return;

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
            !/^\d{1,17}(\.\d{1,2})?$/.test(priceText) ||
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
            let imageUrl = null;

            if (form.imageFile) {
                try {
                    imageUrl = await uploadToCloudinary(form.imageFile);
                } catch {
                    setError('The image could not be uploaded. Check your connection and try again.');
                    return;
                }
            }

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
            setFileKey(current => current + 1);
            setSuccess('Draft saved. Buyers cannot see it until you publish it.');
            setPage(0);
            setRefresh(current => current + 1);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not confirm that the draft was saved. Refresh the list before trying again.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async (listing) => {
        if (busy) return;

        const units = `${listing.stockQuantity} unit${listing.stockQuantity === 1 ? '' : 's'}`;
        const confirmed = window.confirm(
            `Publish "${listing.title}"?\n\nBuyers will be able to see it and buy up to ${units} at ${money(listing.unitPrice)} each.`
        );
        if (!confirmed) return;

        setError('');
        setSuccess('');
        setPublishingId(listing.id);

        try {
            const response = await axiosInstance.post(
                `/api/product-listings/${listing.id}/publish`
            );

            setListings(current =>
                current.map(item => (item.id === listing.id ? response.data : item))
            );
            setSuccess('Published. Buyers can now see and buy this listing.');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not publish this listing. Refresh the list and try again.'
            );
        } finally {
            setPublishingId(null);
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
                    aria-controls="buy-now-listings"
                    disabled={busy}
                    onClick={() => setExpanded(current => !current)}
                >
                    {expanded ? 'Close Buy Now' : 'Manage Buy Now'}
                </button>
            </div>

            {expanded && (
                <div id="buy-now-listings">
                    <p className={styles.pageSubtitle}>
                        Save a listing as a draft first. Drafts are private.
                        Publish a listing when you are ready for buyers to see
                        and buy it.
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
                                        list="product-categories"
                                        placeholder="Pick a suggestion or type your own"
                                        required
                                    />
                                    <datalist id="product-categories">
                                        {CATEGORY_SUGGESTIONS.map(category => (
                                            <option key={category} value={category} />
                                        ))}
                                    </datalist>
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
                                        key={fileKey}
                                        id="product-image"
                                        className={styles.fileInput}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    {previewUrl && (
                                        <div className={styles.imagePreviewWrap}>
                                            <img
                                                src={previewUrl}
                                                alt="Selected item preview"
                                                className={styles.imagePreview}
                                            />
                                            <button
                                                type="button"
                                                className={styles.removeImage}
                                                onClick={handleRemoveImage}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={busy}
                                >
                                    {saving ? 'Saving...' : 'Save as draft'}
                                </button>
                            </div>
                        </fieldset>
                    </form>

                    <h3 className={styles.formTitle}>Your Buy Now listings</h3>

                    <button
                        type="button"
                        className={styles.cancelBtn}
                        disabled={loading || busy}
                        onClick={() => setRefresh(current => current + 1)}
                    >
                        Refresh list
                    </button>

                    {loading ? (
                        <p className={styles.loading}>Loading your listings...</p>
                    ) : (
                        <div className={styles.listingsList}>
                            {listings.length === 0 && !error && (
                                <p className={styles.pageSubtitle}>
                                    No Buy Now listings yet. Fill in the form
                                    above to save your first draft.
                                </p>
                            )}

                            {listings.map(listing => {
                                const isPublished = listing.status === 'PUBLISHED';
                                const soldOut = isPublished && listing.stockQuantity < 1;
                                const publishing = publishingId === listing.id;

                                return (
                                    <div key={listing.id} className={styles.listingCard}>
                                        <div className={styles.listingImageWrap}>
                                            {listing.imageUrl ? (
                                                <img
                                                    src={listing.imageUrl}
                                                    alt={listing.title}
                                                    className={styles.listingImage}
                                                />
                                            ) : (
                                                <div className={styles.listingImagePlaceholder}>
                                                    📦
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.listingInfo}>
                                            <h3 className={styles.listingTitle}>
                                                {listing.title}
                                            </h3>
                                            <p className={styles.listingDesc}>
                                                {listing.description}
                                            </p>

                                            <div className={styles.listingMeta}>
                                                <div className={styles.metaItem}>
                                                    <span className={styles.metaLabel}>Price per unit</span>
                                                    <span className={styles.metaValue}>
                                                        {money(listing.unitPrice)}
                                                    </span>
                                                </div>
                                                <div className={styles.metaItem}>
                                                    <span className={styles.metaLabel}>In stock</span>
                                                    <span
                                                        className={`${styles.metaValue} ${soldOut ? styles.textAmber : ''}`}
                                                    >
                                                        {soldOut ? 'Sold out' : listing.stockQuantity}
                                                    </span>
                                                </div>
                                                <div className={styles.metaItem}>
                                                    <span className={styles.metaLabel}>Condition</span>
                                                    <span className={styles.metaValue}>
                                                        {conditionLabel(listing.condition)}
                                                    </span>
                                                </div>
                                                <div className={styles.metaItem}>
                                                    <span className={styles.metaLabel}>Status</span>
                                                    <span
                                                        className={`${styles.metaValue} ${isPublished ? styles.textGreen : styles.textAmber}`}
                                                    >
                                                        {isPublished ? 'Published' : 'Draft · Not visible to buyers'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.listingActions}>
                                            {isPublished ? (
                                                <span className={styles.deliveryCreated}>
                                                    ✅ Published
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={styles.actionBtn}
                                                    disabled={busy}
                                                    onClick={() => handlePublish(listing)}
                                                    style={{
                                                        opacity: busy ? 0.6 : 1,
                                                        cursor: busy ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {publishing ? 'Publishing...' : 'Publish'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className={styles.formActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                disabled={page === 0 || loading || busy}
                                onClick={() => setPage(current => current - 1)}
                            >
                                Previous
                            </button>
                            <span className={styles.pageSubtitle}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                disabled={page + 1 >= totalPages || loading || busy}
                                onClick={() => setPage(current => current + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}