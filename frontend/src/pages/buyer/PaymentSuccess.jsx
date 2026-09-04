import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import Navbar from '../../components/Navbar';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('checking');
    const auctionId = searchParams.get('auction_id');

    useEffect(() => {
        if (!auctionId) {
            // No auction ID — just show success and redirect
            setTimeout(() => navigate('/buyer/dashboard'), 3000);
            return;
        }

        // Poll every 3 seconds for up to 30 seconds
        let attempts = 0;
        const maxAttempts = 10;

        const poll = setInterval(async () => {
            attempts++;
            try {
                const res = await axiosInstance.get(
                    `/api/payments/status/${auctionId}`
                );
                if (res.data.status === 'HELD') {
                    clearInterval(poll);
                    setStatus('confirmed');
                    setTimeout(() => navigate('/buyer/dashboard'), 2500);
                }
            } catch (err) {
                // Payment record may not exist yet — keep polling
            }

            if (attempts >= maxAttempts) {
                clearInterval(poll);
                setStatus('pending');
                setTimeout(() => navigate('/buyer/dashboard'), 3000);
            }
        }, 3000);

        return () => clearInterval(poll);
    }, [auctionId, navigate]);

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
                    width: '100%', maxWidth: '420px', textAlign: 'center'
                }}>
                    {status === 'checking' && (
                        <>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: '#E6F1FB', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '22px'
                            }}>⏳</div>
                            <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
                                Confirming your payment
                            </p>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                                Please wait while we verify your payment with PayFast.
                                This usually takes a few seconds.
                            </p>
                        </>
                    )}

                    {status === 'confirmed' && (
                        <>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: '#EAF3DE', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '22px'
                            }}>✓</div>
                            <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
                                Payment confirmed
                            </p>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                                Your funds are held securely in escrow and will be
                                released to the seller once your item is delivered.
                                Redirecting you to your dashboard...
                            </p>
                        </>
                    )}

                    {status === 'pending' && (
                        <>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: '#FAEEDA', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '22px'
                            }}>⏱</div>
                            <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
                                Payment received
                            </p>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                                Your payment was received by PayFast. Your dashboard
                                will update shortly once confirmation arrives.
                                Redirecting you now...
                            </p>
                        </>
                    )}

                    <button
                        onClick={() => navigate('/buyer/dashboard')}
                        style={{
                            width: '100%', height: '40px',
                            background: '#185FA5', color: '#fff',
                            border: 'none', borderRadius: '8px',
                            fontSize: '14px', fontWeight: '500', cursor: 'pointer'
                        }}
                    >
                        Go to dashboard now
                    </button>
                </div>
            </div>
        </div>
    );
}