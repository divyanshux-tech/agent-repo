import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const hotelService = {
  async searchHotels(destination, checkin, checkout, guests, rooms = 1) {
    const res = await axios.post(`${BASE_URL}/api/v1/hotels/search`, {
      destination: destination,
      checkin: checkin,
      checkout: checkout,
      guests: guests,
      rooms: rooms
    });
    return res.data;
  }
};
