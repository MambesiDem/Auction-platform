import { useCallback, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuctionSync } from '../../utils/auctionLifecycle';

// One place that loads and refreshes the driver's data. The three driver pages share it.
export default function useDriverData() {
    const [jobs, setJobs] = useState([]);
    const [mine, setMine] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [acceptingId, setAcceptingId] = useState(null);

    const refresh = useCallback(async () => {
        try {
            const [pendingRes, myRes] = await Promise.all([
                axiosInstance.get('/api/deliveries/pending'),
                axiosInstance.get('/api/deliveries/my-deliveries'),
            ]);
            setJobs(pendingRes.data);
            setMine(myRes.data);
            setError('');
        } catch (err) {
            console.error('Failed to load driver data', err);
            setError('Could not load your jobs. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useAuctionSync(refresh);

    const accept = useCallback(async (job) => {
        if (acceptingId) return { ok: false };

        setAcceptingId(job.id);

        try {
            await axiosInstance.put(`/api/deliveries/${job.id}/accept`);
            await refresh();
            return { ok: true };
        } catch (err) {
            return {
                ok: false,
                message: err.response?.data?.message ||
                    'Could not accept this job. It may have been taken by another driver.',
            };
        } finally {
            setAcceptingId(null);
        }
    }, [acceptingId, refresh]);

    return { jobs, mine, loading, error, refresh, accept, acceptingId };
}