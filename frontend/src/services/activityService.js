import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const activityService = {
  async searchActivities(destination, month, travellers, remainingBudget, interests = [], difficultyMax = null, tripId = null) {
    const res = await axios.post(`${BASE_URL}/api/v1/activities/search`, {
      destination: destination,
      month: month,
      travellers: travellers,
      remaining_budget_inr: remainingBudget,
      interests: interests,
      difficulty_max: difficultyMax,
      trip_id: tripId
    });
    return res.data;
  },

  async getFeaturedActivities(month = null) {
    let url = `${BASE_URL}/api/v1/activities/featured`;
    if (month) {
        url += `?month=${month}`;
    }
    const res = await axios.get(url);
    return res.data;
  }
};
