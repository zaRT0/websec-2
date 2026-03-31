import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
});

export const apiService = {
    async checkHealth() {
        const response = await api.get('/health');
        return response.data;
    },

    async searchStations(query) {
        const response = await api.get('/stations/search', {
            params: { q: query }
        });
        return response.data;
    },

    async getAllStations() {
        const response = await api.get('/stations/all');
        return response.data;
    },

    async searchStationsByCoords(lat, lng, radius = 50) {
        const response = await api.get('/stations/nearby', {
            params: { lat, lng, radius }
        });
        return response.data;
    },

    async getStationSchedule(stationCode, date, event = 'departure') {
        const response = await api.get('/schedule/station', {
            params: { station: stationCode, date, event }
        });
        return response.data;
    },

    async getRouteSchedule(fromCode, toCode, date) {
        const response = await api.get('/schedule/route', {
            params: { from: fromCode, to: toCode, date }
        });
        return response.data;
    },
};

export default apiService;