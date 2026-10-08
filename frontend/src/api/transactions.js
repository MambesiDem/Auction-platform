import axiosInstance from './axiosInstance';
export async function getAllPages(url, params = {}) {
    const items = []; let page = 0;
    for (;;) {
        const { data } = await axiosInstance.get(url, { params: { ...params, page, size: 100 } });
        items.push(...data);
        if (data.length < 100) return { data: items };
        page += 1;
    }
}
export function errorMessage(error) { return error.response?.data?.message || 'The action could not be completed. Please refresh or contact support.'; }
export function paymentLabel(status) {
    return { PENDING: 'Awaiting confirmation', FAILED: 'Payment failed — retry if eligible', HELD: 'Payment confirmed',
        RELEASE_REQUESTED: 'Payout awaiting provider confirmation', RELEASED: 'Payout confirmed',
        REFUND_REQUESTED: 'Refund requested — not yet confirmed', REFUNDED: 'Refund confirmed', REVIEW_REQUIRED: 'Payment under review' }[status] || status;
}
