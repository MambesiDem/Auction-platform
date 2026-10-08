import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export default function BidModal({ auction, onClose, onBidPlaced }) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Starting price if no bids yet, otherwise current + increment
    const hasExistingBids = auction.currentPrice > auction.startingPrice;
    const minBid = hasExistingBids
        ? (auction.currentPrice + Math.max(5, auction.bidIncrement || 5)).toFixed(2)
        : parseFloat(auction.startingPrice || auction.currentPrice).toFixed(2);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const value = parseFloat(amount);
        if (!value || value < parseFloat(minBid)) {
            setError(`Minimum bid is R${minBid}`);
            return;
        }

        try {
            setLoading(true);
            await axiosInstance.post(`/api/bids/${auction.id}`, { amount: value });
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
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 300, padding: '16px'
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px',
                padding: '28px', width: '100%', maxWidth: '380px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#1A2B4A' }}>
                    Place a bid
                </h3>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                    {auction.title}
                </p>

                <div style={{
                    background: '#F0F4F8', borderRadius: '10px',
                    padding: '14px 16px', marginBottom: '16px'
                }}>
                    <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Current price</p>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#00A846' }}>
                        R{auction.currentPrice?.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                        Minimum bid: <strong>R{minBid}</strong>
                        {' '}(R{Math.max(5, auction.bidIncrement || 5).toFixed(2)} increment)
                    </p>
                </div>

                {/* Extension notice */}
                <div style={{
                    background: '#FFFBEB', border: '0.5px solid #FDE68A',
                    borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
                    fontSize: '11px', color: '#92400E'
                }}>
                    ⏱ A bid placed in the last {auction.extensionThresholdMinutes || 3} minutes
                    resets the timer to {auction.extensionDurationMinutes || 3} minutes.
                </div>

                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '0.5px solid #FECACA',
                        borderRadius: '8px', padding: '10px 12px',
                        fontSize: '13px', color: '#EF4444', marginBottom: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#6B7280', display: 'block', marginBottom: '5px' }}>
                        Your bid (R)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min={minBid}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={`e.g. ${minBid}`}
                        style={{
                            width: '100%', height: '44px',
                            border: '0.5px solid #E5E7EB', borderRadius: '10px',
                            padding: '0 14px', fontSize: '15px',
                            fontWeight: '600', outline: 'none',
                            marginBottom: '16px', fontFamily: 'inherit'
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, height: '42px',
                                border: '0.5px solid #E5E7EB',
                                borderRadius: '20px', background: 'transparent',
                                fontSize: '14px', cursor: 'pointer', color: '#6B7280'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2, height: '42px',
                                background: '#1A2B4A', color: 'white',
                                border: 'none', borderRadius: '20px',
                                fontSize: '14px', fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Placing bid...' : `Bid R${amount || minBid}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}