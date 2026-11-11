import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { auctionDate } from '../../utils/auctionLifecycle';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './DriverUi.module.css';

export const ACTIVE_STATUSES = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
export const isActive = (delivery) => ACTIVE_STATUSES.includes(delivery.status);
export const jobTitle = (delivery) => delivery.listingTitle || delivery.auctionTitle || 'Parcel';
export const isBuyNow = (delivery) => !delivery.auctionId && Boolean(delivery.orderId);

const STATUS_LABELS = {
    PENDING: 'Open',
    ACCEPTED: 'Accepted',
    PICKED_UP: 'Picked up',
    IN_TRANSIT: 'In transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

const statusClass = (status) => ({
    PENDING: styles.statusPending,
    ACCEPTED: styles.statusAccepted,
    PICKED_UP: styles.statusPickedUp,
    IN_TRANSIT: styles.statusTransit,
    DELIVERED: styles.statusDelivered,
    CANCELLED: styles.statusCancelled,
}[status] || styles.statusPending);

const TRACK = [
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'PICKED_UP', label: 'Picked up' },
    { key: 'IN_TRANSIT', label: 'In transit' },
    { key: 'DELIVERED', label: 'Delivered' },
];

// What the driver does at each stage. Adding a step later means adding an entry here.
export const STEPS = {
    ACCEPTED: {
        next: 'PICKED_UP',
        action: 'Confirm pickup',
        title: 'Collect the parcel',
        text: 'Meet the seller and check the parcel. Ask the seller to read you their collection code, then confirm pickup.',
        needsCode: true,
        codeLabel: 'Seller’s collection code',
        codeHelp: 'Ask the seller to read it to you at the handover. Do not accept it by message.',
        evidenceLabel: 'Parcel condition at pickup',
        evidencePlaceholder: 'e.g. Sealed box, no damage, collected at 14:05',
        done: 'Pickup confirmed. Start the delivery when you leave for the buyer.',
    },
    PICKED_UP: {
        next: 'IN_TRANSIT',
        action: 'Start delivery',
        title: 'Head to the buyer',
        text: 'You have the parcel. Start the delivery when you leave for the buyer.',
        needsCode: false,
        evidenceLabel: 'Departure update',
        evidencePlaceholder: 'e.g. Left the seller at 14:10, heading to the buyer',
        done: 'Delivery started. Hand the parcel to the buyer on arrival.',
    },
    IN_TRANSIT: {
        next: 'DELIVERED',
        action: 'Confirm delivery',
        title: 'Hand over to the buyer',
        text: 'Hand the parcel to the buyer first. Then ask for their delivery code and confirm the delivery.',
        needsCode: true,
        codeLabel: 'Buyer’s delivery code',
        codeHelp: 'Ask for the code only after you have handed over the parcel.',
        evidenceLabel: 'Handover details',
        evidencePlaceholder: 'e.g. Handed to the buyer at the gate, parcel intact',
        done: 'Delivery confirmed. Well done.',
    },
};

const rand = (value) =>
    `R${Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export function timeAgo(value) {
    const date = value ? auctionDate(value) : null;
    if (!date || Number.isNaN(date.getTime())) return null;

    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;

    return `${Math.round(hours / 24)} d ago`;
}

// Optional details. They appear automatically when the backend starts sending them.
function jobFacts(job) {
    const facts = [];

    if (job.payout !== undefined && job.payout !== null) facts.push(`Pay ${rand(job.payout)}`);
    if (job.distanceKm !== undefined && job.distanceKm !== null) facts.push(`${job.distanceKm} km`);
    if (job.pickupArea) facts.push(`Pickup: ${job.pickupArea}`);
    if (job.dropoffArea) facts.push(`Drop-off: ${job.dropoffArea}`);
    if (job.parcelSize) facts.push(`Size: ${job.parcelSize}`);

    return facts;
}

export function DriverLayout({ loading, children }) {
    const { user } = useAuth();

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    {loading
                        ? <div className={styles.loading}>Loading...</div>
                        : children}
                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role={user?.role} />
        </div>
    );
}

export function Notice({ notice, onClose }) {
    if (!notice) return null;

    return (
        <div
            className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}
            role="status"
        >
            <span className={styles.noticeBody}>{notice.text}</span>

            {notice.action && (
                <button
                    type="button"
                    className={styles.noticeAction}
                    onClick={notice.action.onClick}
                >
                    {notice.action.label}
                </button>
            )}

            <button
                type="button"
                className={styles.noticeClose}
                aria-label="Dismiss message"
                onClick={onClose}
            >
                ✕
            </button>
        </div>
    );
}

export function JobCard({ job, onAccept, accepting }) {
    const posted = timeAgo(job.createdAt);
    const facts = jobFacts(job);

    return (
        <div className={styles.card}>
            <div className={styles.cardTop}>
                <div className={styles.cardIcon} aria-hidden="true">📦</div>

                <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>
                        {jobTitle(job)}
                        {isBuyNow(job) && <span className={styles.chip}>Buy Now</span>}
                    </h3>

                    <p className={styles.cardMeta}>
                        {posted ? `Posted ${posted} · ` : ''}
                        Seller and buyer details are shown after you accept.
                    </p>

                    {facts.length > 0 && (
                        <div className={styles.cardFacts}>
                            {facts.map(fact => (
                                <span key={fact} className={styles.fact}>{fact}</span>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.cardRight}>
                    <button
                        type="button"
                        className={styles.acceptBtn}
                        disabled={accepting}
                        onClick={() => onAccept(job)}
                    >
                        {accepting ? 'Accepting...' : 'Accept job'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DeliveryCard({ delivery, onStep }) {
    const step = STEPS[delivery.status];
    const stepIndex = TRACK.findIndex(item => item.key === delivery.status);
    const facts = jobFacts(delivery);

    return (
        <div className={styles.card}>
            <div className={styles.cardTop}>
                <div className={styles.cardIcon} aria-hidden="true">📦</div>

                <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>
                        {jobTitle(delivery)}
                        {isBuyNow(delivery) && <span className={styles.chip}>Buy Now</span>}
                    </h3>

                    <p className={styles.cardMeta}>
                        {delivery.sellerEmail && <>Seller: {delivery.sellerEmail}</>}
                        {delivery.sellerEmail && delivery.buyerEmail && ' · '}
                        {delivery.buyerEmail && <>Buyer: {delivery.buyerEmail}</>}
                    </p>

                    {facts.length > 0 && (
                        <div className={styles.cardFacts}>
                            {facts.map(fact => (
                                <span key={fact} className={styles.fact}>{fact}</span>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.cardRight}>
                    <span className={`${styles.statusBadge} ${statusClass(delivery.status)}`}>
                        {STATUS_LABELS[delivery.status] || delivery.status}
                    </span>
                </div>
            </div>

            {delivery.status !== 'CANCELLED' && (
                <div className={styles.tracker}>
                    {TRACK.map((item, index) => (
                        <div key={item.key} className={styles.trackerStep}>
                            <div className={`${styles.trackerDot} ${index <= stepIndex ? styles.trackerDotDone : ''}`}>
                                {index <= stepIndex ? '✓' : index + 1}
                            </div>

                            <p className={`${styles.trackerLabel} ${index <= stepIndex ? styles.trackerLabelDone : ''}`}>
                                {item.label}
                            </p>

                            {index < TRACK.length - 1 && (
                                <div className={`${styles.trackerLine} ${index < stepIndex ? styles.trackerLineDone : ''}`} />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {step && (
                <div className={styles.stepBox}>
                    <div className={styles.stepText}>
                        <p className={styles.stepTitle}>{step.title}</p>
                        <p className={styles.stepBody}>{step.text}</p>
                    </div>

                    <button
                        type="button"
                        className={styles.acceptBtn}
                        onClick={() => onStep(delivery)}
                    >
                        {step.action}
                    </button>
                </div>
            )}

            {delivery.status === 'DELIVERED' && (
                <p className={styles.doneNote}>Delivery confirmed. Thank you.</p>
            )}

            {delivery.status === 'CANCELLED' && (
                <p className={styles.doneNote}>This delivery was cancelled.</p>
            )}
        </div>
    );
}

export function StepDialog({ delivery, onClose, onDone }) {
    const step = STEPS[delivery.status];

    const [code, setCode] = useState('');
    const [evidence, setEvidence] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const trimmedEvidence = evidence.trim();
    const valid = trimmedEvidence.length >= 5 && (!step.needsCode || code.trim().length > 0);

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
            await axiosInstance.put(`/api/deliveries/${delivery.id}/status`, null, {
                params: {
                    status: step.next,
                    code: step.needsCode ? code.trim() : undefined,
                    evidence: trimmedEvidence,
                },
            });

            onDone(step.done);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not update this delivery. Check the details and try again.'
            );
            setBusy(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={() => { if (!busy) onClose(); }}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="driver-step-title"
                onClick={event => event.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <h2 id="driver-step-title" className={styles.dialogTitle}>
                        {step.action}
                    </h2>

                    <p className={styles.dialogSub}>{jobTitle(delivery)}</p>

                    {step.needsCode && (
                        <>
                            <label className={styles.fieldLabel} htmlFor="driver-code">
                                {step.codeLabel}
                            </label>
                            <input
                                id="driver-code"
                                className={styles.input}
                                value={code}
                                onChange={event => setCode(event.target.value)}
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={20}
                                disabled={busy}
                                autoFocus
                            />
                            <p className={styles.helpText}>{step.codeHelp}</p>
                        </>
                    )}

                    <label className={styles.fieldLabel} htmlFor="driver-evidence">
                        {step.evidenceLabel}
                    </label>
                    <textarea
                        id="driver-evidence"
                        className={styles.textarea}
                        value={evidence}
                        onChange={event => setEvidence(event.target.value)}
                        placeholder={step.evidencePlaceholder}
                        maxLength={2000}
                        disabled={busy}
                        autoFocus={!step.needsCode}
                    />
                    <p className={styles.counter}>{evidence.length}/2000</p>

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
                            disabled={busy}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={styles.confirmBtn}
                            disabled={busy || !valid}
                        >
                            {busy ? 'Saving...' : step.action}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}