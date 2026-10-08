import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { errorMessage, paymentLabel } from '../api/transactions';
import { useAuth } from '../context/AuthContext';
export default function OrderTools({ auction, payment, delivery, refresh }) {
    const { user } = useAuth();
    const [expanded, setExpanded] = useState(false), [orderCase, setCase] = useState(null);
    const [reason, setReason] = useState(''), [evidence, setEvidence] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const load = async () => {
        if (!auction.orderId) return;
        const res = await axios.get(`/api/cases/order/${auction.orderId}`); setCase(res.data || null);
    };
    useEffect(() => { if (expanded) load().catch(e => setError(errorMessage(e))); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded, auction.orderId, auction.orderStatus]);
    const act = async (url, data, method = 'put') => {
        setBusy(true); setError('');
        try { await axios[method](url, data); await load(); await refresh?.(); }
        catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    };
    const buyer = user?.role === 'BUYER';
    const paid = ['HELD','RELEASE_REQUESTED','RELEASED'].includes(payment?.status);
    return <div style={{ marginTop: 12, fontSize: 13 }}>
        {payment && <p>{paymentLabel(payment.status)}</p>}
        {delivery?.pickupCode && <p><strong>Collection code: {delivery.pickupCode}</strong>. Give it only to the assigned driver when handing over this parcel.</p>}
        {delivery?.deliveryCode && <p><strong>Delivery code: {delivery.deliveryCode}</strong>. Give it only when you receive the parcel. Receipt does not waive a valid product claim.</p>}
        <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide support' : 'Order details and problem reporting'}</button>
        {expanded && <div style={{ padding: 12, border: '1px solid #e5e7eb', marginTop: 8 }}>
            <p>Order: {auction.orderStatus || 'Awaiting result'}. A refund or payout is complete only after provider confirmation.</p>
            {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
            {orderCase ? <>
                <p><strong>Case {orderCase.status.replaceAll('_',' ')}</strong>: {orderCase.reason}</p>
                <p>{orderCase.decision}</p>
                {orderCase.returnInstructions && <p>Return instructions: {orderCase.returnInstructions}. Transport costs: {orderCase.returnCostAllocation}.</p>}
                {orderCase.tracking && <p>Return tracking: {orderCase.tracking}</p>}
                <label>Evidence, photo reference or explanation<br/><textarea maxLength={4000} value={evidence} onChange={e => setEvidence(e.target.value)} /></label><br/>
                <button disabled={busy || !evidence.trim()} onClick={() => act(`/api/cases/${orderCase.id}/evidence`,{ evidence })}>Submit evidence</button>
                {buyer && orderCase.status === 'RETURN_AUTHORISED' && <button disabled={busy} onClick={() => {
                    const value=window.prompt('Enter the carrier and return tracking reference. Follow the authorised packaging and delivery instructions.');
                    if(value?.trim())act(`/api/cases/${orderCase.id}/return-sent`,{ evidence:value });
                }}>Record return dispatch</button>}
                {!buyer && orderCase.status === 'RETURN_IN_TRANSIT' && <button disabled={busy} onClick={() => {
                    const value=window.prompt('Record receipt, condition, inspection result and photo reference for the returned item.');
                    if(value?.trim())act(`/api/cases/${orderCase.id}/return-received`,{ evidence:value });
                }}>Confirm return receipt</button>}
                {buyer && orderCase.status === 'REJECTED' && <button disabled={busy} onClick={() => {
                    const value=window.prompt('Explain why you appeal this decision and identify any new evidence.');
                    if(value?.trim())act(`/api/cases/${orderCase.id}/appeal`,{ evidence:value });
                }}>Appeal decision</button>}
                <details><summary>Case history</summary>{orderCase.history?.map((h,i) => <p key={i}>{h.recordedAt}: {h.detail}</p>)}</details>
            </> : buyer && paid && auction.orderStatus !== 'CANCELLED' ? <>
                <p>Report non-delivery, an incorrect item, damage or a material problem with the listing. Support reviews evidence from all parties. An early payout-review window does not remove later valid claims.</p>
                <label>Problem<br/><textarea maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} /></label><br/>
                <label>Evidence or photo reference<br/><textarea maxLength={4000} value={evidence} onChange={e=>setEvidence(e.target.value)} /></label><br/>
                <button disabled={busy || !reason.trim() || !evidence.trim()} onClick={() => act(`/api/cases/order/${auction.orderId}`,{ reason,evidence },'post')}>Submit problem report</button>
            </> : <p>No case is open. For unresolved payment, refund or collection-code issues, contact ConnSB support with the order reference.</p>}
        </div>}
    </div>;
}
