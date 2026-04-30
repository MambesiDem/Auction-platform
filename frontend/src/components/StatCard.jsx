export default function StatCard({ label, value }) {
    return (
        <div style={{
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '14px 16px',
        }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '24px', fontWeight: '500', color: '#1a1a1a' }}>{value}</p>
        </div>
    );
}