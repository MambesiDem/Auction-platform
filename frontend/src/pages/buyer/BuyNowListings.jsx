import { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import browse from './BuyerBrowse.module.css';
import styles from './BuyNowListings.module.css';

const PAGE_SIZE = 24;
const LOW_STOCK = 5;

// Remove this line when paying for Buy Now orders is added to the app.
const PAYMENT_NOTE = 'Payment for Buy Now orders is not available in the app yet.';

const CONDITION_LABELS = {
    NEW: 'New',
    LIKE_NEW: 'Like new',
    GOOD: 'Good',
    FAIR: 'Fair',
};

const conditionLabel = (value) => CONDITION_LABELS[value] || value;

const rand = (value) =>
    `R${Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const toCents = (value) => Math.round(Number(value) * 100);

// Works whether the server sends totalPages at the top level or inside "page".
const pageCount = (data) => data?.totalPages ?? data?.page?.totalPages ?? 1;

const formatTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
};

export default function BuyNowListings({ search }) {
    const [listings, setListings] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('newest');
    const [selected, setSelected] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const loadedOnce = useRef(false);

    const reload = () => setReloadKey(current => current + 1);

    // Load the first page. Reloads after a purchase keep the grid on screen.
    useEffect(() => {
        const controller = new AbortController();

        async function loadFirstPage() {
            if (!loadedOnce.current) setLoading(true);
            setError('');

            try {
                const response = await axiosInstance.get('/api/product-listings', {
                    params: { page: 0, size: PAGE_SIZE },
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                setListings(response.data.content || []);
                setPage(0);
                setHasMore(pageCount(response.data) > 1);
                loadedOnce.current = true;
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err.response?.data?.message ||
                        'Could not load Buy Now listings. Please try again.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadFirstPage();

        return () => controller.abort();
    }, [reloadKey]);

    const loadMore = async () => {
        if (loadingMore) return;

        setLoadingMore(true);
        setError('');

        try {
            const next = page + 1;
            const response = await axiosInstance.get('/api/product-listings', {
                params: { page: next, size: PAGE_SIZE },
            });

            setListings(current => {
                const seen = new Set(current.map(item => item.id));
                return [
                    ...current,
                    ...(response.data.content || []).filter(item => !seen.has(item.id)),
                ];
            });
            setPage(next);
            setHasMore(next + 1 < pageCount(response.data));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not load more listings. Please try again.'
            );
        } finally {
            setLoadingMore(false);
        }
    };

    // Category pills come from the real listings, so every pill filters something.
    const categories = useMemo(() => {
        const seen = new Map();
        listings.forEach(item => {
            const name = (item.category || '').trim();
            if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
        });
        return ['All', ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
    }, [listings]);

    const activeCategory = categories.some(
        name => name.toLowerCase() === category.toLowerCase()
    ) ? category : 'All';

    const visible = useMemo(() => {
        const query = (search || '').trim().toLowerCase();
        const wanted = activeCategory.toLowerCase();

        const result = listings.filter(item => {
            if (
                activeCategory !== 'All' &&
                (item.category || '').trim().toLowerCase() !== wanted
            ) {
                return false;
            }
            if (!query) return true;
            return [item.title, item.description, item.category].some(
                value => (value || '').toLowerCase().includes(query)
            );
        });

        // "newest" keeps the order the server sends (newest first).
        if (sort === 'price_asc') {
            result.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice));
        } else if (sort === 'price_desc') {
            result.sort((a, b) => Number(b.unitPrice) - Number(a.unitPrice));
        }

        return result;
    }, [listings, search, activeCategory, sort]);

    // Keep the dialog in step with refreshed stock.
    const dialogListing = selected
        ? listings.find(item => item.id === selected.id) || selected
        : null;

    if (loading) {
        return <div className={browse.loading}>Loading Buy Now listings...</div>;
    }

    return (
        <>
            <div className={browse.pageHeader}>
                <div>
                    <h1 className={browse.pageTitle}>Buy Now</h1>
                    <p className={browse.pageSubtitle}>
                        {visible.length} item{visible.length !== 1 ? 's' : ''} available
                        {hasMore ? ' so far' : ''} · Pay the listed price, no bidding
                    </p>
                </div>

                <div className={browse.filterGroup}>
                    <label className={browse.filterLabel} htmlFor="buy-now-sort">
                        Sort by
                    </label>
                    <select
                        id="buy-now-sort"
                        className={browse.filterSelect}
                        value={sort}
                        onChange={event => setSort(event.target.value)}
                    >
                        <option value="newest">Newest first</option>
                        <option value="price_asc">Price: Low to high</option>
                        <option value="price_desc">Price: High to low</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className={styles.errorBox} role="alert">
                    <span>{error}</span>
                    <button type="button" className={styles.secondaryBtn} onClick={reload}>
                        Try again
                    </button>
                </div>
            )}

            {categories.length > 1 && (
                <div className={browse.categories}>
                    {categories.map(name => (
                        <button
                            key={name}
                            type="button"
                            className={`${browse.catPill} ${activeCategory === name ? browse.catPillActive : ''}`}
                            onClick={() => setCategory(name)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}

            {visible.length === 0 ? (
                !error && (
                    <div className={browse.emptyState}>
                        <div className={browse.emptyIcon}>🛒</div>
                        <h3 className={browse.emptyTitle}>
                            {listings.length === 0
                                ? 'No Buy Now listings yet'
                                : 'No items match your search'}
                        </h3>
                        <p className={browse.emptySub}>
                            {listings.length === 0
                                ? 'Sellers publish Buy Now listings here. Check back soon.'
                                : 'Try a different search term or category.'}
                        </p>
                        {activeCategory !== 'All' && (
                            <button
                                type="button"
                                className={browse.clearBtn}
                                onClick={() => setCategory('All')}
                            >
                                Show all categories
                            </button>
                        )}
                    </div>
                )
            ) : (
                <div className={browse.grid}>
                    {visible.map(item => {
                        const soldOut = item.stockQuantity < 1;
                        const low = !soldOut && item.stockQuantity <= LOW_STOCK;

                        return (
                            <div key={item.id} className={browse.card}>
                                <div className={browse.cardImageWrap}>
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            className={browse.cardImage}
                                        />
                                    ) : (
                                        <div className={browse.cardImagePlaceholder}>
                                            <span>📦</span>
                                        </div>
                                    )}
                                    <span className={styles.badgeCondition}>
                                        {conditionLabel(item.condition)}
                                    </span>
                                    <span
                                        className={`${styles.badgeStock} ${soldOut ? styles.badgeSoldOut : low ? styles.badgeLow : ''}`}
                                    >
                                        {soldOut
                                            ? 'Sold out'
                                            : low
                                                ? `Only ${item.stockQuantity} left`
                                                : `${item.stockQuantity} available`}
                                    </span>
                                </div>

                                <div className={browse.cardBody}>
                                    <p className={styles.cardCategory}>{item.category}</p>
                                    <h3 className={browse.cardTitle}>{item.title}</h3>
                                    <p className={browse.cardDesc}>{item.description}</p>

                                    <div className={browse.cardFooter}>
                                        <div>
                                            <p className={browse.cardPriceLabel}>Price</p>
                                            <p className={browse.cardPrice}>{rand(item.unitPrice)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`${browse.bidBtn} ${soldOut ? browse.bidBtnDisabled : ''}`}
                                            disabled={soldOut}
                                            onClick={() => setSelected(item)}
                                        >
                                            {soldOut ? 'Sold out' : 'Buy now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {hasMore && (
                <div className={styles.loadMoreWrap}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                </div>
            )}

            {dialogListing && (
                <BuyDialog
                    key={dialogListing.id}
                    listing={dialogListing}
                    onClose={() => setSelected(null)}
                    onChanged={reload}
                />
            )}
        </>
    );
}

function BuyDialog({ listing, onClose, onChanged }) {
    const stock = listing.stockQuantity;
    const soldOut = stock < 1;

    const [qtyText, setQtyText] = useState('1');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);

    const quantity = Number(qtyText);
    const quantityValid =
        !soldOut &&
        qtyText.trim() !== '' &&
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= stock;
    const totalCents = quantityValid ? toCents(listing.unitPrice) * quantity : 0;

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape' && !submitting) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    const step = (delta) => {
        const base = Number.isInteger(quantity) ? quantity : 1;
        const next = Math.min(Math.max(base + delta, 1), Math.max(stock, 1));
        setQtyText(String(next));
    };

    const handleConfirm = async (event) => {
        event.preventDefault();
        if (submitting || !quantityValid) return;

        setSubmitting(true);
        setError('');

        try {
            const response = await axiosInstance.post(
                `/api/product-listings/${listing.id}/buy`,
                { quantity }
            );

            setDone({
                quantity,
                total: response.data.total,
                deadline: response.data.paymentDeadline,
            });
            onChanged();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'The order could not be placed. Please check the stock and try again.'
            );
            onChanged(); // refresh the stock shown behind the dialog
        } finally {
            setSubmitting(false);
        }
    };

    const deadlineText = done ? formatTime(done.deadline) : null;

    return (
        <div
            className={styles.overlay}
            onClick={() => { if (!submitting) onClose(); }}
        >
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="buy-now-title"
                onClick={event => event.stopPropagation()}
            >
                {done ? (
                    <div className={styles.centered}>
                        <div className={styles.successIcon} aria-hidden="true">✓</div>
                        <h2 id="buy-now-title" className={styles.dialogTitle}>Order placed</h2>

                        <dl className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <dt>Item</dt>
                                <dd>{listing.title}</dd>
                            </div>
                            <div className={styles.summaryRow}>
                                <dt>Quantity</dt>
                                <dd>{done.quantity}</dd>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <dt>Total</dt>
                                <dd>{rand(done.total)}</dd>
                            </div>
                            {deadlineText && (
                                <div className={styles.summaryRow}>
                                    <dt>Pay by</dt>
                                    <dd>{deadlineText}</dd>
                                </div>
                            )}
                        </dl>

                        <p className={styles.notice}>{PAYMENT_NOTE}</p>

                        <div className={styles.dialogActions}>
                            <button type="button" className={styles.primaryBtn} onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleConfirm}>
                        <h2 id="buy-now-title" className={styles.dialogTitle}>Buy now</h2>

                        <div className={styles.itemRow}>
                            {listing.imageUrl ? (
                                <img
                                    src={listing.imageUrl}
                                    alt={listing.title}
                                    className={styles.thumb}
                                />
                            ) : (
                                <div className={styles.thumbPlaceholder}>📦</div>
                            )}
                            <div>
                                <p className={styles.itemTitle}>{listing.title}</p>
                                <p className={styles.itemMeta}>
                                    {conditionLabel(listing.condition)} ·{' '}
                                    {soldOut ? 'Sold out' : `${stock} in stock`}
                                </p>
                            </div>
                        </div>

                        {soldOut ? (
                            <div className={styles.dialogError} role="alert">
                                This item has just sold out.
                            </div>
                        ) : (
                            <div className={styles.qtyBlock}>
                                <label htmlFor="buy-now-qty" className={styles.qtyLabel}>
                                    Quantity
                                </label>
                                <div className={styles.qtyRow}>
                                    <button
                                        type="button"
                                        className={styles.qtyBtn}
                                        aria-label="Decrease quantity"
                                        onClick={() => step(-1)}
                                        disabled={submitting || !(quantity > 1)}
                                    >
                                        −
                                    </button>
                                    <input
                                        id="buy-now-qty"
                                        className={styles.qtyInput}
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        max={stock}
                                        step="1"
                                        value={qtyText}
                                        onChange={event => setQtyText(event.target.value)}
                                        disabled={submitting}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className={styles.qtyBtn}
                                        aria-label="Increase quantity"
                                        onClick={() => step(1)}
                                        disabled={submitting || !(quantity < stock)}
                                    >
                                        +
                                    </button>
                                </div>
                                {!quantityValid && (
                                    <p className={styles.qtyError}>
                                        Enter a whole number from 1 to {stock}.
                                    </p>
                                )}
                            </div>
                        )}

                        <dl className={styles.summary}>
                            <div className={styles.summaryRow}>
                                <dt>Price per unit</dt>
                                <dd>{rand(listing.unitPrice)}</dd>
                            </div>
                            <div className={styles.summaryRow}>
                                <dt>Quantity</dt>
                                <dd>{quantityValid ? quantity : '–'}</dd>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <dt>Total</dt>
                                <dd>{quantityValid ? rand(totalCents / 100) : '–'}</dd>
                            </div>
                        </dl>

                        <p className={styles.hint}>
                            Delivery is not included in this total. This testing
                            version does not calculate a delivery charge.
                        </p>

                        <p className={styles.notice}>
                            Confirming reserves the items for you. You will have
                            15 minutes to pay.
                        </p>

                        {error && (
                            <div className={styles.dialogError} role="alert">
                                {error}
                            </div>
                        )}

                        <div className={styles.dialogActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={styles.primaryBtn}
                                disabled={submitting || !quantityValid}
                            >
                                {submitting
                                    ? 'Placing order...'
                                    : quantityValid
                                        ? `Confirm · ${rand(totalCents / 100)}`
                                        : 'Confirm purchase'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}