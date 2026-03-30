/**
 * api.js - Работа с бэкенд-API
 * Все запросы идут через наш прокси-сервер (не напрямую к Яндексу!)
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Внутренняя функция для HTTP-запросов
 * @param {string} endpoint - Эндпоинт API (например, 'stations/nearby')
 * @param {object} params - Параметры запроса
 * @returns {Promise<object>} - Ответ от сервера
 */
async function apiRequest(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/${endpoint}${queryString ? '?' + queryString : ''}`;

        console.log('📡 Запрос к API:', url);

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при запросе к API');
        }

        return data;
    } catch (error) {
        console.error('❌ Ошибка API:', error);
        throw error;
    }
}

/**
 * Поиск станций по координатам (для карты)
 * @param {number} lat - Широта
 * @param {number} lng - Долгота
 * @param {number} distance - Радиус поиска в км
 * @returns {Promise<object>} - Список станций
 */
async function searchStationsByCoords(lat, lng, distance = 30) {
    return await apiRequest('stations/nearby', {
        lat,
        lng,
        distance,
        transport_types: 'suburban'
    });
}

/**
 * Получение расписания для конкретной станции
 * @param {string} stationCode - Код станции (например, 's9600213')
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {string} event - 'departure' или 'arrival'
 * @returns {Promise<object>} - Расписание поездов
 */
async function getStationSchedule(stationCode, date, event = 'departure') {
    const params = {
        station: stationCode,
        event,
        transport_types: 'suburban'
    };

    if (date) {
        params.date = date;
    }

    return await apiRequest('schedule/station', params);
}

/**
 * Получение расписания между двумя станциями (маршрут)
 * @param {string} fromCode - Код станции отправления
 * @param {string} toCode - Код станции прибытия
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {Promise<object>} - Расписание маршрута
 */
async function getRouteSchedule(fromCode, toCode, date) {
    const params = {
        from: fromCode,
        to: toCode,
        transport_types: 'suburban'
    };

    if (date) {
        params.date = date;
    }

    return await apiRequest('schedule/route', params);
}

/**
 * Проверка работоспособности сервера
 * @returns {Promise<object>} - Статус сервера
 */
async function checkServerHealth() {
    return await apiRequest('health');
}

window.API = {
    searchStationsByCoords,
    getStationSchedule,
    getRouteSchedule,
    checkServerHealth
};

console.log('✅ API модуль загружен');