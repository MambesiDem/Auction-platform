import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axiosInstance';
import { auctionDate } from '../utils/auctionLifecycle';
import { errorMessage } from '../api/transactions';
export default function RunnerUpOffers({ offers = [], refresh }) {
    const navigate = useNavigate(); const [error,setError]=useState(''), [busy,setBusy]=useState(false);
    const respond=useCallback(async (offer,accept)=>{
        if(accept && !window.confirm(`Accept this item for R${Number(offer.amount).toFixed(2)}? Acceptance creates an order with a new payment deadline. Declining has no penalty.`))return;
        setBusy(true);setError('');
        try{await axios.put(`/api/auctions/offers/${offer.id}`,{accept});await refresh();if(accept)navigate(`/payment/${offer.auctionId}`);}
        catch(e){setError(errorMessage(e));}finally{setBusy(false);}
    },[refresh,navigate]);
    const available=offers.filter(o=>auctionDate(o.expiresAt)>new Date());
    return <div>{error && <p role="alert">{error}</p>}{available.map(o=><div key={o.id} style={{padding:12,marginBottom:12,border:'1px solid #e5e7eb',borderRadius:8}}>
        <strong>Optional offer: {o.title} — R{Number(o.amount).toFixed(2)}</strong>
        <p>Expires {auctionDate(o.expiresAt).toLocaleString()}. You are not committed unless you accept. Declining has no penalty.</p>
        <button disabled={busy} onClick={()=>respond(o,true)}>Accept offer</button>{' '}<button disabled={busy} onClick={()=>respond(o,false)}>Decline</button>
    </div>)}</div>;
}
