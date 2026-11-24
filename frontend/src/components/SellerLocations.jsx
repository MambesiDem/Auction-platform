import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import AddressFields, {
    EMPTY_ADDRESS,
    addressToForm,
    addressPayload,
    validateAddress,
    formatAddress,
} from './AddressFields';
import styles from './AddressUi.module.css';

const MANAGE_ROLES = ['OWNER', 'ADMINISTRATOR', 'STORE_MANAGER'];
const PHONE = /^\+?[0-9 ]{9,15}$/;

const EMPTY_FORM = {
    name: '',
    phone: '',
    openingHours: '',
    collectionAvailable: false,
    address: EMPTY_ADDRESS,
};

export default function SellerLocations({ profile }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);
    const [editingId, setEditingId] = useState(null); // 'new', a location id, or null
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);

    const canManage = MANAGE_ROLES.includes(profile.memberRole);
    const base = `/api/seller-profiles/${profile.id}/locations`;

    const load = useCallback(async () => {
        try {
            const response = await axiosInstance.get(base);
            setLocations(response.data);
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not load your store locations.',
            });
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => {
        load();
    }, [load]);

    const openNew = () => {
        setForm(EMPTY_FORM);
        setFormError('');
        setNotice(null);
        setEditingId('new');
    };

    const openEdit = (location) => {
        setForm({
            name: location.name,
            phone: location.phone || '',
            openingHours: location.openingHours || '',
            collectionAvailable: location.collectionAvailable,
            address: addressToForm(location.address),
        });
        setFormError('');
        setNotice(null);
        setEditingId(location.id);
    };

    const closeForm = () => {
        setEditingId(null);
        setFormError('');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (busy) return;

        if (form.name.trim().length < 2) {
            setFormError('Give this location a name, for example "Main shop".');
            return;
        }

        if (form.phone.trim() && !PHONE.test(form.phone.trim())) {
            setFormError('Enter a valid phone number.');
            return;
        }

        const problem = validateAddress(form.address);
        if (problem) {
            setFormError(problem);
            return;
        }

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            openingHours: form.openingHours.trim() || null,
            collectionAvailable: form.collectionAvailable,
            address: addressPayload(form.address),
        };

        const isNew = editingId === 'new';

        setBusy(true);
        setFormError('');

        try {
            if (isNew) {
                await axiosInstance.post(base, payload);
            } else {
                await axiosInstance.put(`${base}/${editingId}`, payload);
            }

            setEditingId(null);
            setNotice({ type: 'success', text: isNew ? 'Location added.' : 'Location updated.' });
            await load();
        } catch (err) {
            setFormError(
                err.response?.data?.message ||
                'Could not save this location. Please try again.'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDefault = async (location) => {
        if (busy) return;

        setBusy(true);
        setNotice(null);

        try {
            await axiosInstance.put(`${base}/${location.id}/default`);
            setNotice({ type: 'success', text: `"${location.name}" is now your default pickup location.` });
            await load();
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not change the default location.',
            });
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (location) => {
        if (busy) return;
        if (!window.confirm(`Remove "${location.name}"? You can add it again later.`)) return;

        setBusy(true);
        setNotice(null);

        try {
            await axiosInstance.delete(`${base}/${location.id}`);
            setNotice({ type: 'success', text: 'Location removed.' });
            await load();
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not remove this location.',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHead}>
                <div>
                    <h3 className={styles.cardTitle}>Store locations</h3>
                    <p className={styles.cardSub}>
                        Where drivers collect orders from you. The default location
                        is used first.
                    </p>
                </div>

                {canManage && editingId === null && (
                    <button type="button" className={styles.primaryBtn} onClick={openNew}>
                        + Add location
                    </button>
                )}
            </div>

            {notice && (
                <div
                    className={`${styles.notice} ${
                        notice.type === 'error' ? styles.noticeError : styles.noticeSuccess
                    }`}
                    role="status"
                >
                    <span>{notice.text}</span>
                    <button
                        type="button"
                        className={styles.noticeClose}
                        aria-label="Dismiss message"
                        onClick={() => setNotice(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            {loading ? (
                <p className={styles.cardSub}>Loading your locations...</p>
            ) : locations.length === 0 && editingId !== 'new' ? (
                <div className={styles.empty}>
                    No pickup location yet.
                    {canManage
                        ? ' Add one so drivers know where to collect your orders.'
                        : ''}
                </div>
            ) : (
                <div className={styles.list}>
                    {locations.map(location => (
                        <div key={location.id} className={styles.item}>
                            <div className={styles.itemTop}>
                                <span className={styles.itemName}>{location.name}</span>
                                {location.isDefault && (
                                    <span className={`${styles.chip} ${styles.chipNavy}`}>Default</span>
                                )}
                                {location.collectionAvailable && (
                                    <span className={`${styles.chip} ${styles.chipGreen}`}>
                                        Buyer collection
                                    </span>
                                )}
                            </div>

                            <p className={styles.itemText}>{formatAddress(location.address)}</p>

                            {(location.phone || location.openingHours) && (
                                <p className={styles.itemMeta}>
                                    {location.phone && <>Phone: {location.phone}</>}
                                    {location.phone && location.openingHours && ' · '}
                                    {location.openingHours && <>Hours: {location.openingHours}</>}
                                </p>
                            )}

                            {location.address.instructions && (
                                <p className={styles.itemMeta}>
                                    Pickup notes: {location.address.instructions}
                                </p>
                            )}

                            {canManage && (
                                <div className={styles.itemActions}>
                                    <button
                                        type="button"
                                        className={styles.smallBtn}
                                        onClick={() => openEdit(location)}
                                        disabled={busy}
                                    >
                                        Edit
                                    </button>

                                    {!location.isDefault && (
                                        <button
                                            type="button"
                                            className={styles.smallBtn}
                                            onClick={() => handleDefault(location)}
                                            disabled={busy}
                                        >
                                            Make default
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className={`${styles.smallBtn} ${styles.dangerBtn}`}
                                        onClick={() => handleRemove(location)}
                                        disabled={busy}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editingId !== null && (
                <form className={styles.form} onSubmit={handleSave} noValidate>
                    <h4 className={styles.formTitle}>
                        {editingId === 'new' ? 'Add a location' : 'Edit location'}
                    </h4>

                    {formError && (
                        <div className={styles.formError} role="alert">
                            {formError}
                        </div>
                    )}

                    <div className={styles.fieldGrid}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="loc-name">
                                Location name
                            </label>
                            <input
                                id="loc-name"
                                className={styles.input}
                                value={form.name}
                                onChange={event => setForm({ ...form, name: event.target.value })}
                                maxLength={120}
                                placeholder="Main shop"
                                disabled={busy}
                                autoFocus
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="loc-phone">
                                Phone (optional)
                            </label>
                            <input
                                id="loc-phone"
                                className={styles.input}
                                value={form.phone}
                                onChange={event => setForm({ ...form, phone: event.target.value })}
                                inputMode="tel"
                                maxLength={20}
                                disabled={busy}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                            <label className={styles.label} htmlFor="loc-hours">
                                Opening hours (optional)
                            </label>
                            <input
                                id="loc-hours"
                                className={styles.input}
                                value={form.openingHours}
                                onChange={event => setForm({ ...form, openingHours: event.target.value })}
                                maxLength={300}
                                placeholder="Mon-Sat 8:00-17:00"
                                disabled={busy}
                            />
                        </div>
                    </div>

                    <AddressFields
                        idPrefix="loc"
                        values={form.address}
                        onChange={address => setForm({ ...form, address })}
                        disabled={busy}
                        showPin
                        instructionsLabel="Pickup notes for drivers (optional)"
                    />

                    <label className={styles.check}>
                        <input
                            type="checkbox"
                            checked={form.collectionAvailable}
                            onChange={event => setForm({ ...form, collectionAvailable: event.target.checked })}
                            disabled={busy}
                        />
                        Buyers can collect orders from this location
                    </label>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={closeForm}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryBtn} disabled={busy}>
                            {busy ? 'Saving...' : 'Save location'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}