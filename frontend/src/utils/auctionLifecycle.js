import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
export function auctionDate(value) {
    if (!value) return new Date(NaN);
    if (value instanceof Date) return value;
    const text = String(value);
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}+02:00`);
}
export function auctionState(auction, now = Date.now()) {
    if (!auction.active || now >= auctionDate(auction.endTime).getTime()) return 'Closed';
    return now < auctionDate(auction.startTime).getTime() ? 'Upcoming' : 'Live';
}
export function auctionLabel(auction, now = Date.now()) {
    return auction.active && auctionState(auction, now) === 'Closed' ? 'Closing' : auctionState(auction, now);
}
export function canPayForAuction(auction, payment) {
    return auction.canPay === true && (!payment || ['PENDING', 'FAILED'].includes(payment.status));
}
export function latestPayment(payments, auction) {
    return payments.filter(p => p.auctionId === auction.id && (!auction.orderId || p.orderId === auction.orderId))
        .sort((a,b) => auctionDate(b.createdAt) - auctionDate(a.createdAt) || String(b.id).localeCompare(String(a.id)))[0];
}
export function applyBid(items, bid) {
    return items.map(a => a.id === bid.auctionId ? { ...a, hasBids: true,
        currentPrice: bid.amount, nextMinimumBid: Math.round((bid.amount + Math.max(5, a.bidIncrement || 5)) * 100) / 100,
        endTime: bid.newEndTime || a.endTime, extended: Boolean(bid.newEndTime && bid.newEndTime !== a.endTime),
        reserveMet: bid.reserveMet ?? a.reserveMet } : a);
}
// One clock, one 30-second fallback and one socket per mounted page.
// Refreshes are coalesced, never overlap, and pause while the tab is hidden.
export function useAuctionSync(refresh, subscribeToEvents = true, onBid) {
    const [now, setNow] = useState(Date.now());
    const bidHandler = useRef(onBid); bidHandler.current = onBid;
    useEffect(() => {
        let stopped = false, running = false, queued = false, eventTimer;
        const run = async () => {
            if (stopped || document.visibilityState === 'hidden') return;
            if (running) { queued = true; return; }
            running = true;
            try { await refresh(); } catch (error) { console.error('Refresh failed', error); }
            finally { running = false; if (queued && !stopped) { queued = false; schedule(); } }
        };
        const schedule = () => { if (!eventTimer) eventTimer = setTimeout(() => { eventTimer = undefined; run(); }, 250); };
        const tick = setInterval(() => setNow(Date.now()), 1000);
        const poll = setInterval(run, 30000);
        let client;
        if (subscribeToEvents) {
            client = new Client({ webSocketFactory: () => new SockJS(`${process.env.REACT_APP_API_URL}/ws-auction`),
                reconnectDelay: 5000, onConnect: () => {
                    client.subscribe('/topic/bids', message => {
                        const bid = JSON.parse(message.body);
                        if (bidHandler.current) bidHandler.current(bid); else schedule();
                    });
                    ['/topic/auction-closed','/topic/auction-reassigned','/topic/auction-updated'].forEach(topic => client.subscribe(topic, schedule));
                    schedule();
                } });
            client.activate();
        }
        schedule();
        window.addEventListener('focus', schedule); document.addEventListener('visibilitychange', schedule);
        return () => { stopped = true; clearInterval(tick); clearInterval(poll); clearTimeout(eventTimer);
            window.removeEventListener('focus', schedule); document.removeEventListener('visibilitychange', schedule);
            if (client) client.deactivate(); };
    }, [refresh, subscribeToEvents]);
    return now;
}

export function toSaLocalDateTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid auction time.');
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Johannesburg',
        year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' }).formatToParts(date).map(p => [p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
