import { useState } from 'react';
import useDriverData from './useDriverData';
import {
    DriverLayout,
    Notice,
    DeliveryCard,
    StepDialog,
    STEPS,
    isActive,
} from './driverParts';
import styles from './DriverUi.module.css';

const TABS = ['Active', 'Completed', 'Cancelled'];

const inTab = (delivery, tab) => {
    if (tab === 'Active') return isActive(delivery);
    if (tab === 'Completed') return delivery.status === 'DELIVERED';
    return delivery.status === 'CANCELLED';
};

export default function DriverDeliveries() {
    const { mine, loading, error, refresh } = useDriverData();
    const [tab, setTab] = useState('Active');
    const [targetId, setTargetId] = useState(null);
    const [notice, setNotice] = useState(null);

    const visible = mine
        .filter(delivery => inTab(delivery, tab))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Keep the dialog in step with refreshed data.
    const target = targetId ? mine.find(delivery => delivery.id === targetId) : null;

    const handleDone = (message) => {
        setTargetId(null);
        setNotice({ type: 'success', text: message });
        refresh();
    };

    return (
        <DriverLayout loading={loading}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>My deliveries</h1>
                    <p className={styles.pageSubtitle}>
                        {mine.filter(isActive).length} active · {mine.length} in total
                    </p>
                </div>

                <button type="button" className={styles.ghostBtn} onClick={refresh}>
                    Refresh
                </button>
            </div>

            <Notice notice={notice} onClose={() => setNotice(null)} />

            {error && (
                <div className={styles.errorBar}>
                    <span>{error}</span>
                    <button type="button" className={styles.ghostBtn} onClick={refresh}>
                        Try again
                    </button>
                </div>
            )}

            <div className={styles.tabs}>
                {TABS.map(name => (
                    <button
                        key={name}
                        type="button"
                        className={`${styles.tab} ${tab === name ? styles.tabActive : ''}`}
                        onClick={() => setTab(name)}
                    >
                        {name}
                        <span className={styles.tabCount}>
                            {mine.filter(delivery => inTab(delivery, name)).length}
                        </span>
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📦</div>
                    <h3 className={styles.emptyTitle}>Nothing here</h3>
                    <p className={styles.emptySub}>
                        {tab === 'Active'
                            ? 'Accept a job from Available jobs to see it here.'
                            : `You have no ${tab.toLowerCase()} deliveries.`}
                    </p>
                </div>
            ) : (
                <div className={styles.list}>
                    {visible.map(delivery => (
                        <DeliveryCard
                            key={delivery.id}
                            delivery={delivery}
                            onStep={item => { setNotice(null); setTargetId(item.id); }}
                        />
                    ))}
                </div>
            )}

            {target && STEPS[target.status] && (
                <StepDialog
                    key={`${target.id}-${target.status}`}
                    delivery={target}
                    onClose={() => setTargetId(null)}
                    onDone={handleDone}
                />
            )}
        </DriverLayout>
    );
}