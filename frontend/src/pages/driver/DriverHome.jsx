import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useDriverData from './useDriverData';
import {
    DriverLayout,
    Notice,
    JobCard,
    STEPS,
    isActive,
    jobTitle,
} from './driverParts';
import styles from './DriverUi.module.css';

function timeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

export default function DriverHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { jobs, mine, loading, error, refresh, accept, acceptingId } = useDriverData();
    const [notice, setNotice] = useState(null);

    const active = mine.filter(isActive);
    const completed = mine.filter(delivery => delivery.status === 'DELIVERED').length;

    const handleAccept = async (job) => {
        if (!window.confirm(`Accept "${jobTitle(job)}"? You will collect it from the seller and deliver it to the buyer.`)) {
            return;
        }

        const result = await accept(job);

        setNotice(result.ok
            ? {
                type: 'success',
                text: 'Job accepted. Open My deliveries to arrange the pickup.',
                action: { label: 'My deliveries', onClick: () => navigate('/driver/deliveries') },
            }
            : { type: 'error', text: result.message });
    };

    return (
        <DriverLayout loading={loading}>
            <div className={styles.hero}>
                <p className={styles.heroGreeting}>
                    Good {timeOfDay()}, {user?.fullName?.split(' ')[0]} 👋
                </p>
                <h1 className={styles.heroTitle}>Ready to deliver?</h1>
                <p className={styles.heroSub}>
                    Accept a job, collect the parcel with the seller’s code, and
                    finish with the buyer’s code.
                </p>
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

            <div className={styles.stats}>
                <button type="button" className={styles.stat} onClick={() => navigate('/driver/jobs')}>
                    <span className={styles.statValue}>{jobs.length}</span>
                    <span className={styles.statLabel}>Available jobs</span>
                </button>
                <button type="button" className={styles.stat} onClick={() => navigate('/driver/deliveries')}>
                    <span className={styles.statValue}>{active.length}</span>
                    <span className={styles.statLabel}>Active deliveries</span>
                </button>
                <button type="button" className={styles.stat} onClick={() => navigate('/driver/deliveries')}>
                    <span className={styles.statValue}>{completed}</span>
                    <span className={styles.statLabel}>Delivered</span>
                </button>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>Your next steps</h2>
                    <button type="button" className={styles.viewAll} onClick={() => navigate('/driver/deliveries')}>
                        View all →
                    </button>
                </div>

                {active.length === 0 ? (
                    <p className={styles.cardMeta}>
                        No active deliveries. Accept a job to get started.
                    </p>
                ) : (
                    <div className={styles.list}>
                        {active.slice(0, 3).map(delivery => (
                            <div key={delivery.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardIcon} aria-hidden="true">📦</div>

                                    <div className={styles.cardInfo}>
                                        <h3 className={styles.cardTitle}>{jobTitle(delivery)}</h3>
                                        <p className={styles.cardMeta}>
                                            Next: {STEPS[delivery.status]?.title || 'In progress'}
                                        </p>
                                    </div>

                                    <div className={styles.cardRight}>
                                        <button
                                            type="button"
                                            className={styles.acceptBtn}
                                            onClick={() => navigate('/driver/deliveries')}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>New jobs</h2>
                    <button type="button" className={styles.viewAll} onClick={() => navigate('/driver/jobs')}>
                        View all →
                    </button>
                </div>

                {jobs.length === 0 ? (
                    <p className={styles.cardMeta}>
                        No jobs right now. New jobs appear here when sellers book collection.
                    </p>
                ) : (
                    <div className={styles.list}>
                        {jobs.slice(0, 3).map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onAccept={handleAccept}
                                accepting={acceptingId === job.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: '10px' }}>
                    How handovers stay safe
                </h2>
                <ul className={styles.infoList}>
                    <li>The seller gives you a collection code at pickup. Never accept it by message.</li>
                    <li>The buyer gives you a delivery code only after you hand over the parcel.</li>
                    <li>Record the parcel’s condition at each step. It protects you in a dispute.</li>
                </ul>
            </div>
        </DriverLayout>
    );
}