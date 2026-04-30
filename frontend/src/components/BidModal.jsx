import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export default function BidModal({ auction, onClose, onBidPlaced }) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBid = async () => {
        setError('');

        //block bids if auction is not live
        const now = new Date();
        const start = new Date(auction.startTime);
        const end = new Date(auction.endTime);

        if (now < start) {
            setError('This auction has not started yet.');
            return;
        }

        if (now > end) {
            setError('This auction has already ended.');
            return;
        }

        //existing validation
        const parsed = parseFloat(amount);

        if (!parsed || parsed <= auction.currentPrice) {
            setError(`Bid must be higher than current price of R${auction.currentPrice.toLocaleString()}.`);
            return;
        }

        try {
            setLoading(true);
            await axiosInstance.post(`/api/bids/${auction.id}`, { amount: parsed });
            onBidPlaced();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place bid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '28px',
                width: '100%',
                maxWidth: '400px',
                border: '0.5px solid #e5e7eb',
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>
                    Place a bid
                </h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
                    {auction.title}
                </p>

                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                    Current price: <strong style={{ color: '#1a1a1a' }}>
                        R{auction.currentPrice.toLocaleString()}
                    </strong>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '0.5px solid #fca5a5',
                        borderRadius: '8px', padding: '10px 14px',
                        fontSize: '13px', color: '#b91c1c', marginBottom: '14px',
                    }}>
                        {error}
                    </div>
                )}

                <input
                    type="number"
                    placeholder={`Enter amount above R${auction.currentPrice.toLocaleString()}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                        width: '100%', height: '38px',
                        border: '0.5px solid #d1d5db', borderRadius: '8px',
                        padding: '0 12px', fontSize: '14px',
                        marginBottom: '16px', boxSizing: 'border-box',
                    }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, height: '38px',
                            border: '0.5px solid #d1d5db', borderRadius: '8px',
                            background: 'transparent', fontSize: '13px',
                            color: '#6b7280', cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBid}
                        disabled={loading}
                        style={{
                            flex: 1, height: '38px',
                            background: loading ? '#93c5fd' : '#185FA5',
                            border: 'none', borderRadius: '8px',
                            color: '#fff', fontSize: '13px',
                            fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Placing bid...' : 'Confirm bid'}
                    </button>
                </div>
            </div>
        </div>
    );
}