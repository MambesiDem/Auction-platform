import { DriverLayout } from './driverParts';
import styles from './DriverUi.module.css';

// Holds a place for pages that are not built yet, so sidebar links do not dead-end.
export default function DriverSoon({ title, text }) {
    return (
        <DriverLayout>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{title}</h1>
            </div>

            <div className={styles.empty}>
                <div className={styles.emptyIcon}>🛠️</div>
                <h3 className={styles.emptyTitle}>Coming soon</h3>
                <p className={styles.emptySub}>{text}</p>
            </div>
        </DriverLayout>
    );
}