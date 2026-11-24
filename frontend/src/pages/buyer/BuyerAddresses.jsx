import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import AddressFields, {
    EMPTY_ADDRESS,
    addressToForm,
    addressPayload,
    validateAddress,
    formatAddress,
} from '../../components/AddressFields';
import styles from '../../components/AddressUi.module.css';

const PHONE = /^\+?[0-9 ]{9,15}$/;

export default function BuyerAddresses() {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);
    const [editingId, setEditingId] = useState(null); // 'new', an address id, or null
    const [form, setForm] = useState(null);
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/api/addresses');
            setAddresses(response.data);
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not load your addresses.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openNew = () => {
        setForm({
            label: '',
            recipientName: user?.fullName || '',
            phone: '',
            address: EMPTY_ADDRESS,
        });
        setFormError('');
        setNotice(null);
        setEditingId('new');
    };

    const openEdit = (item) => {
        setForm({
            label: item.label,
            recipientName: item.recipientName,
            phone: item.phone,
            address: addressToForm(item.address),
        });
        setFormError('');
        setNotice(null);
        setEditingId(item.id);
    };

    const closeForm = () => {
        setEditingId(null);
        setFormError('');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (busy) return;

        if (!form.label.trim()) {
            setFormError('Give this address a label, for example "Home" or "Work".');
            return;
        }

        if (!form.recipientName.trim()) {
            setFormError('Enter the name of the person receiving the delivery.');
            return;
        }

        if (!PHONE.test(form.phone.trim())) {
            setFormError('Enter a phone number the driver can call.');
            return;
        }

        const problem = validateAddress(form.address);
        if (problem) {
            setFormError(problem);
            return;
        }

        const payload = {
            label: form.label.trim(),
            recipientName: form.recipientName.trim(),
            phone: form.phone.trim(),
            address: addressPayload(form.address),
        };

        const isNew = editingId === 'new';

        setBusy(true);
        setFormError('');

        try {
            if (isNew) {
                await axiosInstance.post('/api/addresses', payload);
            } else {
                await axiosInstance.put(`/api/addresses/${editingId}`, payload);
            }

            setEditingId(null);
            setNotice({ type: 'success', text: isNew ? 'Address saved.' : 'Address updated.' });
            await load();
        } catch (err) {
            setFormError(
                err.response?.data?.message ||
                'Could not save this address. Please try again.'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDefault = async (item) => {
        if (busy) return;

        setBusy(true);
        setNotice(null);

        try {
            await axiosInstance.put(`/api/addresses/${item.id}/default`);
            setNotice({ type: 'success', text: `"${item.label}" is now your default address.` });
            await load();
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not change the default address.',
            });
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (item) => {
        if (busy) return;
        if (!window.confirm(`Delete "${item.label}"?`)) return;

        setBusy(true);
        setNotice(null);

        try {
            await axiosInstance.delete(`/api/addresses/${item.id}`);
            setNotice({ type: 'success', text: 'Address deleted.' });
            await load();
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || 'Could not delete this address.',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>My addresses</h1>
                        <p className={styles.pageSubtitle}>
                            Delivery addresses you can choose at checkout
                        </p>
                    </div>

                    <section className={styles.card}>
                        <div className={styles.cardHead}>
                            <div>
                                <h3 className={styles.cardTitle}>Saved addresses</h3>
                                <p className={styles.cardSub}>
                                    Your default address is used first. You can save up to 10.
                                </p>
                            </div>

                            {editingId === null && (
                                <button type="button" className={styles.primaryBtn} onClick={openNew}>
                                    + Add address
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
                            <p className={styles.cardSub}>Loading your addresses...</p>
                        ) : addresses.length === 0 && editingId !== 'new' ? (
                            <div className={styles.empty}>
                                You have no saved addresses yet. Add one to speed up checkout.
                            </div>
                        ) : (
                            <div className={styles.list}>
                                {addresses.map(item => (
                                    <div key={item.id} className={styles.item}>
                                        <div className={styles.itemTop}>
                                            <span className={styles.itemName}>{item.label}</span>
                                            {item.isDefault && (
                                                <span className={`${styles.chip} ${styles.chipNavy}`}>Default</span>
                                            )}
                                        </div>

                                        <p className={styles.itemText}>{formatAddress(item.address)}</p>

                                        <p className={styles.itemMeta}>
                                            Recipient: {item.recipientName} · {item.phone}
                                        </p>

                                        {item.address.instructions && (
                                            <p className={styles.itemMeta}>
                                                Delivery notes: {item.address.instructions}
                                            </p>
                                        )}

                                        <div className={styles.itemActions}>
                                            <button
                                                type="button"
                                                className={styles.smallBtn}
                                                onClick={() => openEdit(item)}
                                                disabled={busy}
                                            >
                                                Edit
                                            </button>

                                            {!item.isDefault && (
                                                <button
                                                    type="button"
                                                    className={styles.smallBtn}
                                                    onClick={() => handleDefault(item)}
                                                    disabled={busy}
                                                >
                                                    Make default
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className={`${styles.smallBtn} ${styles.dangerBtn}`}
                                                onClick={() => handleDelete(item)}
                                                disabled={busy}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {editingId !== null && form && (
                            <form className={styles.form} onSubmit={handleSave} noValidate>
                                <h4 className={styles.formTitle}>
                                    {editingId === 'new' ? 'Add an address' : 'Edit address'}
                                </h4>

                                {formError && (
                                    <div className={styles.formError} role="alert">
                                        {formError}
                                    </div>
                                )}

                                <div className={styles.fieldGrid}>
                                    <div className={styles.field}>
                                        <label className={styles.label} htmlFor="addr-label">
                                            Label
                                        </label>
                                        <input
                                            id="addr-label"
                                            className={styles.input}
                                            value={form.label}
                                            onChange={event => setForm({ ...form, label: event.target.value })}
                                            maxLength={60}
                                            placeholder="Home"
                                            disabled={busy}
                                            autoFocus
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label} htmlFor="addr-recipient">
                                            Recipient name
                                        </label>
                                        <input
                                            id="addr-recipient"
                                            className={styles.input}
                                            value={form.recipientName}
                                            onChange={event => setForm({ ...form, recipientName: event.target.value })}
                                            maxLength={120}
                                            disabled={busy}
                                        />
                                    </div>

                                    <div className={`${styles.field} ${styles.fieldFull}`}>
                                        <label className={styles.label} htmlFor="addr-phone">
                                            Phone number for the driver
                                        </label>
                                        <input
                                            id="addr-phone"
                                            className={styles.input}
                                            value={form.phone}
                                            onChange={event => setForm({ ...form, phone: event.target.value })}
                                            inputMode="tel"
                                            maxLength={20}
                                            placeholder="082 555 0199"
                                            disabled={busy}
                                        />
                                    </div>
                                </div>

                                <AddressFields
                                    idPrefix="addr"
                                    values={form.address}
                                    onChange={address => setForm({ ...form, address })}
                                    disabled={busy}
                                    instructionsLabel="Delivery notes, such as a gate code (optional)"
                                />

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
                                        {busy ? 'Saving...' : 'Save address'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>

                    <div style={{ height: '72px' }} />
                </div>
            </div>

            <BottomNav role={user?.role} />
        </div>
    );
}