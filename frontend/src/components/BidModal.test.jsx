import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BidModal from './BidModal';
import axios from '../api/axiosInstance';
jest.mock('../api/axiosInstance',()=>({post:jest.fn()}));
test('R100 first accepted bid presents R105 for the next bidder and rejects R100 locally',async()=>{
    axios.post.mockResolvedValue({});
    render(<BidModal auction={{id:'a',title:'Phone',startingPrice:100,currentPrice:100,hasBids:true,nextMinimumBid:105,bidIncrement:5}} onClose={()=>{}} onBidPlaced={()=>{}}/>);
    const input=screen.getByPlaceholderText('e.g. 105.00');
    expect(input.getAttribute('min')).toBe('105.00');
    fireEvent.change(input,{target:{value:'100'}});fireEvent.submit(input.closest('form'));
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.change(input,{target:{value:'107'}});fireEvent.submit(input.closest('form'));
    await waitFor(()=>expect(axios.post).toHaveBeenCalledWith('/api/bids/a',{amount:107}));
});
