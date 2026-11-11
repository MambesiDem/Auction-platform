import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDriverData from './useDriverData';
import { DriverLayout, Notice, JobCard, jobTitle } from './driverParts';
import styles from './DriverUi.module.css';

export default function DriverJobs() {
    const navigate = useNavigate();
    const { jobs, loading, error, refresh, accept, acceptingId } = useDriverData();
    const [notice, setNotice] = useState(null);

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
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Available jobs</h1>
                    <p className={styles.pageSubtitle}>
                        {jobs.length} job{jobs.length !== 1 ? 's' : ''} waiting for a driver
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

            {jobs.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>🚚</div>
                    <h3 className={styles.emptyTitle}>No jobs right now</h3>
                    <p className={styles.emptySub}>
                        New jobs appear here when sellers book collection. This
                        page refreshes by itself.
                    </p>
                    <button type="button" className={styles.ghostBtn} onClick={refresh}>
                        Check again
                    </button>
                </div>
            ) : (
                <div className={styles.list}>
                    {jobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            onAccept={handleAccept}
                            accepting={acceptingId === job.id}
                        />
                    ))}
                </div>
            )}
        </DriverLayout>
    );
}