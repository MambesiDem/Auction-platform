import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import Navbar from '../../components/Navbar';

export default function PaymentPage() {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePay = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axiosInstance.post(`/api/payments/initiate/${auctionId}`);
            // Redirect to PayFast
            window.location.href = response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate payment.');
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
            <Navbar />
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '48px 24px'
            }}>
                <div style={{
                    background: '#fff', border: '0.5px solid #e5e7eb',
                    borderRadius: '12px', padding: '36px 32px',
                    width: '100%', maxWidth: '420px'
                }}>
                    <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
                        Complete your payment
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                        You will be redirected to PayFast to complete your payment securely.
                        Funds will be held in escrow until your item is delivered.
                    </p>

                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '0.5px solid #fca5a5',
                            borderRadius: '8px', padding: '10px 14px',
                            fontSize: '13px', color: '#b91c1c', marginBottom: '16px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        background: '#f3f4f6', borderRadius: '8px',
                        padding: '14px 16px', marginBottom: '20px'
                    }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            Escrow protection
                        </p>
                        <p style={{ fontSize: '13px', color: '#1a1a1a' }}>
                            Your payment is held securely until delivery is confirmed.
                            If delivery fails, you are automatically refunded.
                        </p>
                    </div>

                    <button
                        onClick={handlePay}
                        disabled={loading}
                        style={{
                            width: '100%', height: '40px',
                            background: loading ? '#93c5fd' : '#185FA5',
                            color: '#fff', border: 'none',
                            borderRadius: '8px', fontSize: '14px',
                            fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Redirecting to PayFast...' : 'Pay with PayFast'}
                    </button>

                    <button
                        onClick={() => navigate('/buyer/dashboard')}
                        style={{
                            width: '100%', height: '40px', marginTop: '10px',
                            background: 'transparent', border: '0.5px solid #d1d5db',
                            borderRadius: '8px', fontSize: '13px',
                            color: '#6b7280', cursor: 'pointer'
                        }}
                    >
                        Back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}