import { renderHook, act } from '@testing-library/react';
import { auctionDate, auctionState, auctionLabel, canPayForAuction, latestPayment, applyBid, useAuctionSync } from './auctionLifecycle';
jest.mock('@stomp/stompjs', () => ({ Client: jest.fn().mockImplementation(() => ({ activate: jest.fn(), deactivate: jest.fn() })) }));
jest.mock('sockjs-client', () => jest.fn());
test('South African wall-clock dates mean the same instant in any browser timezone', () => {
    expect(auctionDate('2026-10-08T12:00:00').toISOString()).toBe('2026-10-08T10:00:00.000Z');
    expect(auctionDate('2026-10-08T12:00:00+02:00').toISOString()).toBe('2026-10-08T10:00:00.000Z');
});
test('upcoming, live, closing and closed are distinct display states', () => {
    const a = { active:true, startTime:'2026-10-08T12:00:00', endTime:'2026-10-08T13:00:00' };
    expect(auctionState(a, Date.parse('2026-10-08T09:59:00Z'))).toBe('Upcoming');
    expect(auctionState(a, Date.parse('2026-10-08T10:30:00Z'))).toBe('Live');
    expect(auctionLabel(a, Date.parse('2026-10-08T11:00:00Z'))).toBe('Closing');
    expect(auctionLabel({ ...a,active:false }, Date.parse('2026-10-08T11:00:00Z'))).toBe('Closed');
});
test('payment eligibility comes from backend and failed attempts can retry', () => {
    expect(canPayForAuction({canPay:true}, {status:'FAILED'})).toBe(true);
    expect(canPayForAuction({canPay:false}, {status:'PENDING'})).toBe(false);
    expect(canPayForAuction({canPay:true}, {status:'HELD'})).toBe(false);
});
test('latest applicable attempt excludes an old winner or additional charge', () => {
    const payments = [
        {id:'a',auctionId:'auction',orderId:'old-order',status:'HELD',createdAt:'2026-10-08T12:00:00'},
        {id:'b',auctionId:'auction',orderId:'new-order',status:'FAILED',createdAt:'2026-10-08T12:01:00'},
        {id:'c',auctionId:'auction',orderId:'new-order',status:'PENDING',createdAt:'2026-10-08T12:02:00'},
        {id:'d',auctionId:'auction',orderId:null,status:'REVIEW_REQUIRED',createdAt:'2026-10-08T12:03:00'}
    ];
    expect(latestPayment(payments,{id:'auction',orderId:'new-order'}).id).toBe('c');
});
test('accepted bid at starting price still changes the next minimum', () => {
    const result = applyBid([{id:'a',startingPrice:100,currentPrice:100,hasBids:false,bidIncrement:5,endTime:'old'}],{auctionId:'a',amount:100,newEndTime:'new'});
    expect(result[0].hasBids).toBe(true); expect(result[0].nextMinimumBid).toBe(105); expect(result[0].extended).toBe(true);
});
test('fallback refresh never overlaps an in-flight request', async () => {
    jest.useFakeTimers(); Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
    let resolve; const pending = new Promise(r => { resolve=r; });
    const refresh=jest.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined);
    const {unmount}=renderHook(()=>useAuctionSync(refresh,false));
    await act(async()=>{jest.advanceTimersByTime(250);}); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async()=>{jest.advanceTimersByTime(60000);}); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async()=>{resolve();await pending;});
    await act(async()=>{jest.advanceTimersByTime(250);}); expect(refresh).toHaveBeenCalledTimes(2);
    unmount(); jest.useRealTimers();
});
