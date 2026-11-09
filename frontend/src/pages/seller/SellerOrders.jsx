import { latestPayment, useAuctionSync } from '../../utils/auctionLifecycle';
import OrderTools from '../../components/OrderTools';
import { getAllPages } from '../../api/transactions';
import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './SellerOrders.module.css';
import extras from './SellerOrdersExtras.module.css';

const TABS = [
    'All',
    'Awaiting Delivery',
    'In Progress',
    'Delivered',
    'Cancelled',
];

const PAYMENT_LABELS = {
    PENDING: '⏳ Awaiting payment confirmation',
    FAILED: 'Payment attempt failed',
    HELD: '🔒 Payment confirmed — payout follows delivery',
    RELEASE_REQUESTED: '⏳ Payout requested — awaiting provider confirmation',
    RELEASED: '✅ Payout confirmed',
    REFUND_REQUESTED: '⏳ Refund awaiting provider confirmation',
    REFUNDED: '↩️ Refunded to the buyer',
    REVIEW_REQUIRED: 'Payment under review — contact support',
};

const SHARE_STATUSES = ['HELD', 'RELEASE_REQUESTED', 'RELEASED'];

const rand = (value) =>
    `R${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

function getPaymentLabel(status) {
    return PAYMENT_LABELS[status] || 'Payment status unavailable';
}

function newestPayment(payments) {
    return [...payments].sort((a, b) => {
        const timeDifference =
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime();

        return timeDifference ||
            String(b.id).localeCompare(String(a.id));
    })[0];
}

function getDeliveryPayment(payments, delivery) {
    return newestPayment(
        payments.filter(payment => {
            if (delivery.orderId) {
                return payment.orderId === delivery.orderId;
            }

            // Compatibility for deliveries without an Order reference.
            return Boolean(delivery.auctionId) &&
                payment.auctionId === delivery.auctionId;
        })
    );
}

function getOrderDelivery(deliveries, order) {
    const exactMatch = deliveries.find(
        delivery => delivery.orderId === order.id
    );

    if (exactMatch) {
        return exactMatch;
    }

    // Do not associate a delivery already linked to another order.
    return deliveries.find(delivery =>
        !delivery.orderId &&
        Boolean(order.auctionId) &&
        delivery.auctionId === order.auctionId
    );
}

function nextStep(status) {
    switch (status) {
        case 'PENDING':
            return 'Waiting for a driver to accept this job.';
        case 'ACCEPTED':
            return 'A driver has accepted. When they arrive, give them the collection code below and hand over the parcel.';
        case 'PICKED_UP':
        case 'IN_TRANSIT':
            return 'The parcel is with the driver. The buyer confirms receipt with their delivery code.';
        case 'DELIVERED':
            return 'Delivered. Your payout follows once the review window ends and the provider confirms it.';
        case 'CANCELLED':
            return 'This delivery was cancelled.';
        default:
            return null;
    }
}

export default function SellerOrders() {
    const { user } = useAuth();

    const [orderRecords, setOrderRecords] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [bookTarget, setBookTarget] = useState(null);
    const [notice, setNotice] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [
                deliveriesRes,
                paymentsRes,
                auctionsRes,
                recordsRes,
            ] = await Promise.all([
                axiosInstance.get('/api/deliveries/my-sales'),
                axiosInstance.get('/api/payments/my-earnings'),
                getAllPages('/api/auctions/my-listings'),
                axiosInstance.get('/api/orders/mine'),
            ]);

            setDeliveries(deliveriesRes.data);
            setOrderRecords(recordsRes.data);
            setPayments(paymentsRes.data);

            const mine = auctionsRes.data.filter(
                auction => auction.ownerEmail === user?.email
            );

            setAuctions(mine);
        } catch (err) {
            console.error('Failed to load orders', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useAuctionSync(fetchData);

    // Retain the existing refresh behaviour for this display fix.
    useEffect(() => {
        const poll = setInterval(() => fetchData(), 30000);

        return () => clearInterval(poll);
    }, [fetchData]);

    const handleBooked = (title) => {
        setBookTarget(null);
        setNotice({
            type: 'success',
            text: `Collection booked for "${title}". Drivers can now accept this job. You will see the collection code here once one does.`,
        });
        fetchData();
    };

    // ----- Items that need the seller to book collection -----
    const closedWithoutDelivery = auctions.filter(auction =>
        !auction.active &&
        auction.winnerEmail &&
        !deliveries.some(
            delivery => delivery.auctionId === auction.id
        )
    );

    const auctionRows = closedWithoutDelivery.map(auction => {
        const payment = latestPayment(payments, auction);

        const canBook =
            payment?.status === 'HELD' &&
            ['PREPARATION', 'COLLECTION_PENDING'].includes(
                auction.orderStatus
            );

        const nonActionableOrder = [
            'CANCELLED',
            'DISPUTED',
            'RETURNING',
            'COMPLETED',
        ].includes(auction.orderStatus);

        const unavailableLabel = nonActionableOrder
            ? `Order: ${auction.orderStatus.replaceAll('_', ' ')}`
            : payment
                ? getPaymentLabel(payment.status)
                : '⏳ Awaiting buyer payment';

        return {
            key: `auction-${auction.id}`,
            kind: 'auction',
            targetId: auction.id,
            title: auction.title,
            imageUrl: auction.imageUrl,
            meta: `Auction won by ${auction.winnerEmail} · ${rand(auction.currentPrice)}`,
            canBook,
            unavailableLabel,
        };
    });

    const buyNowRows = orderRecords
        .filter(order =>
            order.saleFormat === 'BUY_NOW' &&
            !getOrderDelivery(deliveries, order) &&
            !['CANCELLED', 'COMPLETED'].includes(order.status)
        )
        .map(order => {
            const payment = newestPayment(
                payments.filter(item => item.orderId === order.id)
            );

            const canBook =
                payment?.status === 'HELD' &&
                ['PREPARATION', 'COLLECTION_PENDING'].includes(order.status);

            const nonActionableOrder = ['DISPUTED', 'RETURNING']
                .includes(order.status);

            const unavailableLabel = nonActionableOrder
                ? `Order: ${order.status.replaceAll('_', ' ')}`
                : payment
                    ? getPaymentLabel(payment.status)
                    : '⏳ Awaiting buyer payment';

            const quantity = order.quantity || 1;
            const priceText = quantity > 1
                ? `${quantity} × ${rand(order.unitPrice)} = ${rand(order.agreedPrice)}`
                : rand(order.agreedPrice);

            return {
                key: `order-${order.id}`,
                kind: 'order',
                targetId: order.id,
                title: order.title,
                imageUrl: null,
                meta: `Buy Now · ${priceText} · Buyer: ${order.buyerEmail}`,
                canBook,
                unavailableLabel,
            };
        });

    // Orders that are ready for collection come first.
    const actionRows = [...buyNowRows, ...auctionRows].sort(
        (a, b) => Number(b.canBook) - Number(a.canBook)
    );

    // ----- Delivery list -----
    const getTabStatus = (delivery) => {
        if (delivery.status === 'DELIVERED') {
            return 'Delivered';
        }

        if (delivery.status === 'CANCELLED') {
            return 'Cancelled';
        }

        if (
            ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
                .includes(delivery.status)
        ) {
            return 'In Progress';
        }

        return 'Awaiting Delivery';
    };

    const filtered = activeTab === 'All'
        ? deliveries
        : deliveries.filter(
            delivery => getTabStatus(delivery) === activeTab
        );

    const tabCount = (tab) => {
        if (tab === 'All') {
            return deliveries.length;
        }

        return deliveries.filter(
            delivery => getTabStatus(delivery) === tab
        ).length;
    };

    const getStatusLabel = (status) => {
        const labels = {
            PENDING: 'Pending',
            ACCEPTED: 'Driver Assigned',
            PICKED_UP: 'Picked Up',
            IN_TRANSIT: 'In Transit',
            DELIVERED: 'Delivered',
            CANCELLED: 'Cancelled',
        };

        return labels[status] || status;
    };

    const getStatusColor = (status) => {
        if (status === 'DELIVERED') {
            return styles.statusGreen;
        }

        if (status === 'CANCELLED') {
            return styles.statusGray;
        }

        if (['PICKED_UP', 'IN_TRANSIT'].includes(status)) {
            return styles.statusBlue;
        }

        if (status === 'ACCEPTED') {
            return styles.statusPurple;
        }

        return styles.statusAmber;
    };

    const getDeliveryStep = (status) => {
        return [
            'ACCEPTED',
            'PICKED_UP',
            'IN_TRANSIT',
            'DELIVERED',
        ].indexOf(status);
    };

    if (loading) {
        return (
            <div className={styles.layout}>
                <Sidebar role="SELLER" />

                <div className={styles.main}>
                    <TopBar />
                    <div className={styles.loading}>
                        Loading orders...
                    </div>
                </div>

                <BottomNav role="SELLER" />
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar role="SELLER" />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                My Orders
                            </h1>

                            <p className={styles.pageSubtitle}>
                                {orderRecords.length} order
                                {orderRecords.length !== 1 ? 's' : ''} total
                            </p>
                        </div>
                    </div>

                    {notice && (
                        <div
                            className={`${extras.notice} ${
                                notice.type === 'error'
                                    ? extras.noticeError
                                    : extras.noticeSuccess
                            }`}
                            role="status"
                        >
                            <span>{notice.text}</span>

                            <button
                                type="button"
                                className={extras.noticeClose}
                                aria-label="Dismiss message"
                                onClick={() => setNotice(null)}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Orders that need collection to be booked */}
                    {actionRows.length > 0 && (
                        <div className={styles.actionNeeded}>
                            <div className={styles.actionNeededHeader}>
                                <span className={styles.actionNeededIcon}>
                                    ⚠️
                                </span>

                                <h3 className={styles.actionNeededTitle}>
                                    Needs your action
                                    {' — '}
                                    {actionRows.length}
                                </h3>
                            </div>

                            <p className={extras.panelNote}>
                                Prepare and hand over an item only after the
                                buyer's payment is confirmed.
                            </p>

                            {actionRows.map(row => (
                                <div
                                    key={row.key}
                                    className={styles.actionRow}
                                >
                                    {row.imageUrl ? (
                                        <img
                                            src={row.imageUrl}
                                            alt={row.title}
                                            className={styles.actionImg}
                                        />
                                    ) : (
                                        <div className={styles.actionImgPlaceholder}>
                                            📦
                                        </div>
                                    )}

                                    <div className={styles.actionInfo}>
                                        <p className={styles.actionTitle}>
                                            {row.title}
                                        </p>

                                        <p className={styles.actionMeta}>
                                            {row.meta}
                                        </p>
                                    </div>

                                    <div className={styles.actionRight}>
                                        {row.canBook ? (
                                            <button
                                                type="button"
                                                className={styles.createDeliveryBtn}
                                                onClick={() => {
                                                    setNotice(null);
                                                    setBookTarget(row);
                                                }}
                                            >
                                                🚚 Book collection
                                            </button>
                                        ) : (
                                            <span className={styles.awaitingPayment}>
                                                {row.unavailableLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${
                                    activeTab === tab
                                        ? styles.tabActive
                                        : ''
                                }`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}

                                <span className={styles.tabCount}>
                                    {tabCount(tab)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Orders list */}
                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                📦
                            </div>

                            <h3 className={styles.emptyTitle}>
                                No orders here
                            </h3>

                            <p className={styles.emptySub}>
                                {activeTab === 'All'
                                    ? "You don't have any delivery orders yet."
                                    : `No ${activeTab.toLowerCase()} orders.`}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.ordersList}>
                            {filtered.map(delivery => {
                                const payment = getDeliveryPayment(
                                    payments,
                                    delivery
                                );

                                const order = delivery.orderId
                                    ? orderRecords.find(
                                        record => record.id === delivery.orderId
                                    )
                                    : undefined;

                                const isBuyNow = order?.saleFormat === 'BUY_NOW';

                                const deliveryStep = getDeliveryStep(
                                    delivery.status
                                );

                                const showShare =
                                    payment &&
                                    SHARE_STATUSES.includes(payment.status) &&
                                    Number.isFinite(Number(payment.sellerAmount));

                                const hint = nextStep(delivery.status);

                                return (
                                    <div
                                        key={delivery.id}
                                        className={styles.orderCard}
                                    >
                                        {/* Order header */}
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderHeaderLeft}>
                                                <div className={styles.orderIcon}>
                                                    📦
                                                </div>

                                                <div>
                                                    <h3 className={styles.orderTitle}>
                                                        {delivery.listingTitle ||
                                                            delivery.auctionTitle}

                                                        {isBuyNow && (
                                                            <span className={extras.chip}>
                                                                Buy Now
                                                                {order.quantity > 1
                                                                    ? ` · ${order.quantity} units`
                                                                    : ''}
                                                            </span>
                                                        )}
                                                    </h3>

                                                    <p className={styles.orderMeta}>
                                                        Buyer: {delivery.buyerEmail}

                                                        {delivery.driverEmail && (
                                                            <span>
                                                                {' · '}
                                                                Driver: {delivery.driverEmail}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.orderHeaderRight}>
                                                <div className={styles.paymentInfo}>
                                                    <span className={styles.paymentLabel}>
                                                        {payment
                                                            ? getPaymentLabel(
                                                                payment.status
                                                            )
                                                            : 'Payment status unavailable'}
                                                    </span>

                                                    {showShare && (
                                                        <span className={extras.share}>
                                                            Your share: {rand(payment.sellerAmount)}
                                                            {Number.isFinite(Number(payment.commissionAmount))
                                                                ? ` (platform fee ${rand(payment.commissionAmount)})`
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>

                                                <span
                                                    className={`${styles.statusBadge} ${
                                                        getStatusColor(
                                                            delivery.status
                                                        )
                                                    }`}
                                                >
                                                    {getStatusLabel(delivery.status)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delivery tracker */}
                                        <div className={styles.tracker}>
                                            {[
                                                {
                                                    key: 'ACCEPTED',
                                                    label: 'Driver assigned',
                                                },
                                                {
                                                    key: 'PICKED_UP',
                                                    label: 'Picked up',
                                                },
                                                {
                                                    key: 'IN_TRANSIT',
                                                    label: 'In transit',
                                                },
                                                {
                                                    key: 'DELIVERED',
                                                    label: 'Delivered',
                                                },
                                            ].map((step, index) => (
                                                <div
                                                    key={step.key}
                                                    className={styles.trackerStep}
                                                >
                                                    <div
                                                        className={`${styles.trackerDot} ${
                                                            index <= deliveryStep
                                                                ? styles.trackerDotDone
                                                                : ''
                                                        }`}
                                                    >
                                                        {index <= deliveryStep
                                                            ? '✓'
                                                            : index + 1}
                                                    </div>

                                                    <p
                                                        className={`${styles.trackerLabel} ${
                                                            index <= deliveryStep
                                                                ? styles.trackerLabelDone
                                                                : ''
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </p>

                                                    {index < 3 && (
                                                        <div
                                                            className={`${styles.trackerLine} ${
                                                                index < deliveryStep
                                                                    ? styles.trackerLineDone
                                                                    : ''
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Collection code, shown while a driver is assigned */}
                                        {delivery.pickupCode && (
                                            <div className={extras.codeBox}>
                                                <p className={extras.codeLabel}>
                                                    Collection code
                                                </p>

                                                <p className={extras.code}>
                                                    {delivery.pickupCode}
                                                </p>

                                                <p className={extras.codeHint}>
                                                    Give this code only to
                                                    {delivery.driverEmail
                                                        ? ` ${delivery.driverEmail}`
                                                        : ' the assigned driver'}
                                                    {' '}when they collect the
                                                    parcel. Do not share it by
                                                    message or with anyone else.
                                                </p>
                                            </div>
                                        )}

                                        {hint && (
                                            <p className={extras.nextStep}>
                                                {hint}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Support, handover codes and buyer cases for every order */}
                    {orderRecords.length > 0 && (
                        <details className={extras.supportDetails}>
                            <summary>
                                All order records, support and buyer cases
                            </summary>

                            {orderRecords.map(order => (
                                <div
                                    key={order.id}
                                    className={extras.supportItem}
                                >
                                    <strong>{order.title}</strong>
                                    {order.saleFormat === 'BUY_NOW' && (
                                        <span className={extras.chip}>
                                            Buy Now
                                        </span>
                                    )}
                                    {' — '}
                                    {order.status.replaceAll('_', ' ')}

                                    <OrderTools
                                        auction={{
                                            id: order.auctionId,
                                            orderId: order.id,
                                            orderStatus: order.status,
                                        }}
                                        payment={newestPayment(
                                            payments.filter(
                                                payment =>
                                                    payment.orderId === order.id
                                            )
                                        )}
                                        delivery={getOrderDelivery(
                                            deliveries,
                                            order
                                        )}
                                        refresh={fetchData}
                                    />
                                </div>
                            ))}
                        </details>
                    )}

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role="SELLER" />

            {bookTarget && (
                <BookCollectionDialog
                    key={bookTarget.key}
                    target={bookTarget}
                    onClose={() => setBookTarget(null)}
                    onBooked={handleBooked}
                />
            )}
        </div>
    );
}

function BookCollectionDialog({ target, onClose, onBooked }) {
    const [evidence, setEvidence] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const trimmed = evidence.trim();
    const valid = confirmed && trimmed.length >= 10;

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape' && !busy) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy || !valid) return;

        setBusy(true);
        setError('');

        try {
            await axiosInstance.post(
                '/api/deliveries',
                target.kind === 'order'
                    ? { orderId: target.targetId, preparationEvidence: trimmed }
                    : { auctionId: target.targetId, preparationEvidence: trimmed }
            );

            onBooked(target.title);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not book collection. Please try again.'
            );
            setBusy(false);
        }
    };

    return (
        <div
            className={extras.overlay}
            onClick={() => { if (!busy) onClose(); }}
        >
            <div
                className={extras.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="book-collection-title"
                onClick={event => event.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <h2 id="book-collection-title" className={extras.dialogTitle}>
                        Book collection
                    </h2>

                    <p className={extras.dialogSub}>
                        {target.title}
                        <br />
                        Before a driver collects this parcel, confirm the item
                        matches the listing and record how it is packed.
                    </p>

                    <label className={extras.fieldLabel} htmlFor="prep-evidence">
                        Condition, packaging and photo reference
                    </label>
                    <textarea
                        id="prep-evidence"
                        className={extras.textarea}
                        value={evidence}
                        onChange={event => setEvidence(event.target.value)}
                        maxLength={2000}
                        placeholder="e.g. Kettle in original box, no scratches, sealed with tape. Photo: link or reference."
                        disabled={busy}
                        autoFocus
                    />
                    <p className={extras.counter}>{evidence.length}/2000</p>

                    <label className={extras.check}>
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={event => setConfirmed(event.target.checked)}
                            disabled={busy}
                        />
                        <span>
                            I confirm the item matches the listing and is ready
                            for collection.
                        </span>
                    </label>

                    {error && (
                        <div className={extras.dialogError} role="alert">
                            {error}
                        </div>
                    )}

                    <div className={extras.dialogActions}>
                        <button
                            type="button"
                            className={extras.cancelBtn}
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={extras.primaryBtn}
                            disabled={busy || !valid}
                        >
                            {busy ? 'Booking...' : 'Book collection'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}