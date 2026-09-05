import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const travelService = {
  async searchTravel(tripId, fromCode, toCode, date, travellers) {
    const res = await axios.post(`${BASE_URL}/api/v1/travel/search`, {
      trip_id: tripId,
      from_code: fromCode,
      to_code: toCode,
      date: date,
      travellers: travellers
    });
    return res.data;
  },
  
  async getCandidates(tripId) {
    const res = await axios.get(`${BASE_URL}/api/v1/travel/candidates?trip_id=${tripId}`);
    return res.data;
  },

  async getCandidate(candidateId) {
    const res = await axios.get(`${BASE_URL}/api/v1/travel/candidates/${candidateId}`);
    return res.data;
  }
};
