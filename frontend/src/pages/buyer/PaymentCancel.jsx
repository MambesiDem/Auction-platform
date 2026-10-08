import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';

export default function PaymentCancel() {
    const navigate = useNavigate();

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
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: '#FCEBEB', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', fontSize: '22px', color: '#b91c1c'
                    }}>✕</div>
                    <p style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
                        Checkout interrupted
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                        Returning from checkout does not prove that no charge occurred. Check your order’s payment status. Resume the existing attempt only if payment is still eligible.
                    </p>
                    <button
                        onClick={() => navigate('/buyer/dashboard')}
                        style={{
                            width: '100%', height: '40px',
                            background: '#185FA5', color: '#fff',
                            border: 'none', borderRadius: '8px',
                            fontSize: '14px', fontWeight: '500', cursor: 'pointer'
                        }}
                    >
                        Back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}