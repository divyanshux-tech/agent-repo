import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const optimizerService = {
  async runOptimizer(tripId, totalBudgetInr, destinationSlug, startDate, endDate, userInterests) {
    const res = await axios.post(`${BASE_URL}/api/v1/optimizer/run`, {
      trip_id: tripId,
      total_budget_inr: totalBudgetInr,
      destination_slug: destinationSlug,
      start_date: startDate,
      end_date: endDate,
      user_interests: userInterests
    });
    return res.data;
  }
};
