const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const itineraryService = {
  async generateItinerary(tripId) {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/itinerary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
        let errMessage = 'Failed to generate itinerary';
        try {
            const errData = await response.json();
            if (errData.detail) errMessage = errData.detail;
        } catch (e) {}
        throw new Error(errMessage);
    }
    
    return await response.json();
  },

  async getItinerary(tripId) {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/itinerary`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch itinerary');
    }
    return await response.json();
  },

  async regenerateItineraryDay(tripId, dayNumber) {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/itinerary/days/${dayNumber}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
        let errMessage = 'Failed to regenerate day';
        try {
            const errData = await response.json();
            if (errData.detail) errMessage = errData.detail;
        } catch (e) {}
        throw new Error(errMessage);
    }
    
    return await response.json();
  }
};
