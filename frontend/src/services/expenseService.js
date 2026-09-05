import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const expenseService = {
  async getEstimate(tripId, destinationSlug, nights, travellers, spendingStyle) {
    const res = await axios.post(`${BASE_URL}/api/v1/expenses/estimate`, {
      trip_id: tripId,
      destination_slug: destinationSlug,
      nights: nights,
      travellers: travellers,
      spending_style: spendingStyle
    });
    return res.data;
  }
};
