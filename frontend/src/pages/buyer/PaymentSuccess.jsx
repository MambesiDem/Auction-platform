import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import Navbar from '../../components/Navbar';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('checking');
    const auctionId = searchParams.get('auction_id');
    const orderId = searchParams.get('order_id');

    // Auction payments are tracked by auction, Buy Now payments by order.
    const statusPath = orderId
        ? `/api/payments/status-by-order/${encodeURIComponent(orderId)}`
        : auctionId
            ? `/api/payments/status/${encodeURIComponent(auctionId)}`
            : null;

    useEffect(() => {
        let stopped = false, timer, redirect, attempts = 0;
        if (!statusPath) { setStatus('pending'); return; }
        const check = async () => {
            attempts++;
            try {
                const { data } = await axiosInstance.get(statusPath);
                if (stopped) return;
                if (['HELD', 'RELEASE_REQUESTED', 'RELEASED'].includes(data.status)) {
                    setStatus('confirmed');
                    redirect = setTimeout(() => navigate('/buyer/dashboard'), 2500);
                    return;
                }
                if (['FAILED', 'REVIEW_REQUIRED', 'REFUND_REQUESTED', 'REFUNDED'].includes(data.status)) {
                    setStatus('pending');
                    return;
                }
            } catch (error) { if (stopped) return; }
            if (attempts >= 10) { setStatus('pending'); return; }
            timer = setTimeout(check, 3000);
        };
        check();
        return () => { stopped = true; clearTimeout(timer); clearTimeout(redirect); };
    }, [statusPath, navigate]);

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
                                Your payment has been verified. Delivery and seller settlement are tracked separately.
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
                                Confirmation pending
                            </p>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                                We have not yet verified your payment. Check your dashboard before paying again.
                                Contact support if you were charged but confirmation is missing.
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