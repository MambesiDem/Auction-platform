import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { errorMessage, paymentLabel } from '../api/transactions';
export default function AdminOperations({ payments, deliveries, refresh }) {
    const [cases,setCases]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
    const load=async()=>{const r=await axios.get('/api/cases/admin/all');setCases(r.data);};
    useEffect(()=>{load().catch(e=>setError(errorMessage(e)));},[]);
    const act=async(url,data)=>{setBusy(true);setError('');try{await axios.put(url,data);await load();await refresh();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
    const confirm=(p,refund)=>{
        const reference=window.prompt('Only after independently reconciling the external provider/bank transfer: enter its reference. For sandbox simulation use SANDBOX- followed by a unique reference. This button does not move money.');
        if(reference?.trim())act(`/api/payments/${p.id}/confirm-${refund?'refund':'payout'}`,{reference});
    };
    const reconcile=p=>{
        const reference=window.prompt('Enter the external provider reconciliation reference. Do not mark a pending payment failed merely because a timer expired.');if(!reference?.trim())return;
        const reason=window.prompt(p.status==='PENDING'?'Document why the provider confirmed this attempt cannot complete.':'Document why this reviewed payment should be refunded.');if(!reason?.trim())return;
        act(`/api/payments/${p.id}/reconcile`,{reference,reason,action:p.status==='PENDING'?'FAILED':'REFUND_REQUESTED'});
    };
    const decide=(c,outcome)=>{
        const reason=window.prompt('Record the evidence considered and the reason for this decision.');if(!reason?.trim())return;
        let returnInstructions,returnCostAllocation;
        if(outcome==='RETURN_REQUIRED'){
            returnInstructions=window.prompt('Give the authorised return destination, packaging, carrier/collection instructions and expected time window.');
            returnCostAllocation=window.prompt('State who initially pays return transport and who ultimately bears it.');
            if(!returnInstructions?.trim()||!returnCostAllocation?.trim())return;
        }
        act(`/api/cases/admin/${c.id}/decision`,{outcome,reason,returnInstructions,returnCostAllocation});
    };
    return <section style={{margin:24,padding:16,border:'1px solid #e5e7eb',borderRadius:8}}>
        <h2>Transaction support and reconciliation</h2>
        <p>Review original listing, order history, payment records and all parties’ evidence. Refund/payout confirmation records an external operation; it does not execute it.</p>
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
        <button disabled={busy} onClick={()=>{load().catch(e=>setError(errorMessage(e)));refresh();}}>Refresh support records</button>
        <details><summary>Payments requiring action</summary>
            {payments.filter(p=>['PENDING','REVIEW_REQUIRED','REFUND_REQUESTED','RELEASE_REQUESTED'].includes(p.status)).map(p=><div key={p.id} style={{padding:12,borderBottom:'1px solid #e5e7eb'}}>
                <strong>{p.auctionTitle}</strong> — {paymentLabel(p.status)} — R{Number(p.totalAmount).toFixed(2)}
                {p.status==='RELEASE_REQUESTED'&&<button disabled={busy} onClick={()=>confirm(p,false)}>Record confirmed payout</button>}
                {p.status==='REFUND_REQUESTED'&&<button disabled={busy} onClick={()=>confirm(p,true)}>Record confirmed refund</button>}
                {['PENDING','REVIEW_REQUIRED'].includes(p.status)&&<button disabled={busy} onClick={()=>reconcile(p)}>Record provider reconciliation</button>}
            </div>)}
        </details>
        <details><summary>Buyer cases and returns</summary>{cases.map(c=><div key={c.id} style={{padding:12,borderBottom:'1px solid #e5e7eb'}}>
            <strong>{c.title} — {c.status.replaceAll('_',' ')}</strong><p>{c.reason}</p>
            <p>Buyer evidence: {c.buyerEvidence}</p><p>Seller evidence: {c.sellerEvidence}</p>
            <p>Return tracking: {c.tracking}. Receipt/inspection: {c.receiptEvidence}</p>
            <p>Decision: {c.decision}</p>
            {['OPEN','APPEALED','RETURN_RECEIVED'].includes(c.status)&&<>
                {c.status!=='RETURN_RECEIVED'&&<button disabled={busy} onClick={()=>decide(c,'RETURN_REQUIRED')}>Authorise return</button>}
                <button disabled={busy} onClick={()=>decide(c,'REFUND')}>Approve refund</button>
                {c.status!=='RETURN_RECEIVED'&&<button disabled={busy} onClick={()=>decide(c,'REJECT')}>Reject with reasons</button>}
            </>}
            {c.status==='RETURN_IN_TRANSIT'&&<button disabled={busy} onClick={()=>{const evidence=window.prompt('Record verified return receipt and inspection evidence.');if(evidence?.trim())act(`/api/cases/${c.id}/return-received`,{evidence});}}>Record verified return receipt</button>}
            <details><summary>Case audit history</summary>{c.history?.map((h,i)=><p key={i}>{h.recordedAt}: {h.detail}</p>)}</details>
        </div>)}</details>
        <details><summary>Handover-code support</summary>{deliveries.filter(d=>['ACCEPTED','IN_TRANSIT'].includes(d.status)).map(d=><div key={d.id}>
            {d.auctionTitle} — {d.status} <button disabled={busy} onClick={()=>{const reason=window.prompt('Document identity verification and why this code needs resetting. Do not share the new code with the driver.');if(reason?.trim())act(`/api/deliveries/${d.id}/reset-code`,{pickup:d.status==='ACCEPTED',reason});}}>Reset participant’s handover code</button>
        </div>)}</details>
    </section>;
}
