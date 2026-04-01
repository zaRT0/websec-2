const API_BASE_URL = 'http://localhost:3001/api';

export const apiService = {
    async searchStations(query) {
        try {
            const response = await fetch(`${API_BASE_URL}/stations/search?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка поиска станций:', error);
            throw error;
        }
    },

    async searchStationsByCoords(lat, lng, distance = 50) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/stations/nearby?lat=${lat}&lng=${lng}&distance=${distance}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка поиска координат:', error);
            throw error;
        }
    },

    async getStationSchedule(stationCode, date, event = 'departure') {
        try {
            const params = new URLSearchParams({
                station: stationCode,
                date: date,
                event: event
            });

            const response = await fetch(`${API_BASE_URL}/schedule/station?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка получения расписания:', error);
            throw error;
        }
    },

    async getRouteSchedule(fromStation, toStation, date) {
        try {
            const params = new URLSearchParams({
                from: fromStation,
                to: toStation,
                date: date
            });

            const response = await fetch(`${API_BASE_URL}/schedule/route?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка получения маршрута:', error);
            throw error;
        }
    }
};