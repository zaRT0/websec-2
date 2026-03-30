const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.YANDEX_RASP_API_KEY;
const BASE_URL = 'https://api.rasp.yandex.net/v3.0';

if (!API_KEY) {
    console.error('❌ Ошибка: Не найден API ключ в переменной окружения YANDEX_RASP_API_KEY');
    console.error('Создайте файл .env и добавьте ключ');
    process.exit(1);
}

app.use(cors());
app.use(express.json());

let stationsCache = null;
let stationsCacheTime = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Загрузить все станции от Яндекса (с кэшированием)
 * Вызывается ТОЛЬКО один раз за сессию сервера
 */
async function getAllStationsFromYandex() {
    if (stationsCache && stationsCacheTime &&
        Date.now() - stationsCacheTime < CACHE_TTL) {
        console.log('✅ Используем кэш станций в памяти');
        return stationsCache;
    }

    try {
        console.log('📦 Загрузка ВСЕХ станций от Яндекса (это займёт время)...');

        const params = new URLSearchParams({
            apikey: API_KEY,
            lang: 'ru_RU'
        });

        const url = `${BASE_URL}/stations_list/?${params}`;
        console.log('   🌐 URL:', url);

        const response = await fetch(url, { timeout: 120000 });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        stationsCache = data;
        stationsCacheTime = Date.now();

        let count = 0;
        if (data.countries) {
            for (const c of data.countries) {
                if (c.regions) {
                    for (const r of c.regions) {
                        if (r.settlements) {
                            for (const s of r.settlements) {
                                if (s.stations) count += s.stations.length;
                            }
                        }
                    }
                }
            }
        }

        console.log(`✅ Загружено ~${count} станций, кэш обновлён`);
        return data;

    } catch (error) {
        console.error('❌ Ошибка загрузки станций:', error);
        throw error;
    }
}

function logRequest(endpoint, params) {
    console.log(`\n🔹 Запрос к ${endpoint}:`);
    console.log('   Параметры:', params);
    console.log('   API ключ:', API_KEY ? `${API_KEY.slice(0, 10)}...` : '❌ Не задан');
}

function logResponse(endpoint, statusCode, data) {
    console.log(`🔸 Ответ от ${endpoint}:`);
    console.log('   Статус:', statusCode);
    console.log('   Станций найдено:', data?.stations?.length ?? 'N/A');
    if (data?.error) {
        console.log('   ❌ Ошибка:', data.error);
    }
}

/**
 * GET /api/stations/all
 * Получить ВСЕ станции (для поиска и карты)
 * Кэшируется на бэкенде — реальный запрос к Яндексу только 1 раз!
 */
app.get('/api/stations/all', async (req, res) => {
    try {
        console.log('\n' + '='.repeat(50));
        console.log('🔹 Запрос к /api/stations/all');

        const data = await getAllStationsFromYandex();

        console.log('🔸 Ответ: кэш возвращён');
        console.log('='.repeat(50) + '\n');

        res.json(data);

    } catch (error) {
        console.error('❌ Ошибка /api/stations/all:', error);
        res.status(500).json({ error: 'Не удалось загрузить станции: ' + error.message });
    }
});

/**
 * GET /api/stations/search
 * Поиск станций по названию (ЛОКАЛЬНО, после загрузки всех)
 * Не делает запросов к Яндексу — ищет в кэше!
 */
app.get('/api/stations/search', async (req, res) => {
    try {
        const { q } = req.query;

        console.log('\n' + '='.repeat(50));
        console.log(`🔹 Поиск станций: q="${q}"`);

        if (!q || q.length < 2) {
            console.log('🔸 Ответ: пусто (короткий запрос)');
            console.log('='.repeat(50) + '\n');
            return res.json({ stations: [] });
        }

        const data = await getAllStationsFromYandex();

        const query = q.toLowerCase();
        const results = [];

        if (data.countries) {
            for (const country of data.countries) {
                if (country.code && country.code.toUpperCase() !== 'RU') {
                    continue;
                }

                for (const region of country.regions || []) {
                    for (const settlement of region.settlements || []) {
                        for (const station of settlement.stations || []) {
                            const title = station.title || '';

                            if (title.toLowerCase().includes(query)) {
                                const codes = station.codes || {};
                                results.push({
                                    code: codes.yandex_code || codes.code || station.code,
                                    title: settlement.title
                                        ? `${station.title}, ${settlement.title}`
                                        : station.title,
                                    short_title: station.short_title || '',
                                    lat: station.latitude,
                                    lng: station.longitude,
                                    type: station.station_type || 'station',
                                    settlement: settlement.title || ''
                                });
                            }
                        }
                    }
                }
            }
        }

        console.log(`🔸 Найдено ${results.length} станций для "${q}"`);
        console.log('='.repeat(50) + '\n');

        res.json({ stations: results.slice(0, 50) });

    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        res.status(500).json({ error: 'Ошибка поиска: ' + error.message });
    }
});

/**
 * GET /api/stations/nearby
 * Поиск станций рядом с точкой (по координатам)
 */
app.get('/api/stations/nearby', async (req, res) => {
    try {
        const { lat, lng, distance = 50 } = req.query;

        console.log('\n' + '='.repeat(50));
        logRequest('nearest_stations', { lat, lng, distance });

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Необходимы параметры lat и lng' });
        }

        const params = new URLSearchParams({
            apikey: API_KEY,
            lat,
            lng,
            distance,
            lang: 'ru_RU'
        });

        const url = `${BASE_URL}/nearest_stations/?${params}`;
        console.log('   🌐 URL:', url);

        console.log('   ⏳ Отправка запроса к Яндекс...');
        const response = await fetch(url);
        const data = await response.json();

        logResponse('nearest_stations', response.status, data);

        if (data.stations && data.stations.length > 0) {
            console.log(`📊 Всего станций от Яндекса: ${data.stations.length}`);

            const trainStations = data.stations.filter(station => {
                return station.transport_type === 'train';
            });

            console.log(`🚉 После фильтра ЖД: ${trainStations.length}`);

            const suburbanStations = trainStations.filter(station => {
                return station.type_choices && station.type_choices.suburban;
            });

            console.log(`🚃 После фильтра электричек: ${suburbanStations.length}`);

            data.stations = suburbanStations;
            data.pagination.total = suburbanStations.length;
        }

        console.log('='.repeat(50) + '\n');

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Критическая ошибка при поиске станций:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
    }
});

/**
 * GET /api/schedule/station
 * Расписание для конкретной станции
 */
app.get('/api/schedule/station', async (req, res) => {
    try {
        const { station, date, event = 'departure' } = req.query;

        console.log('\n' + '='.repeat(50));
        logRequest('schedule/station', { station, date, event });

        if (!station) {
            return res.status(400).json({ error: 'Необходим параметр station (код станции)' });
        }

        const params = new URLSearchParams({
            apikey: API_KEY,
            station,
            transport_types: 'suburban',
            event,
            lang: 'ru_RU'
        });

        if (date) {
            params.append('date', date);
        }

        const url = `${BASE_URL}/schedule/?${params}`;
        console.log('   🌐 URL:', url);

        const response = await fetch(url);
        const data = await response.json();

        logResponse('schedule/station', response.status, data);
        console.log('='.repeat(50) + '\n');

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Ошибка при получении расписания станции:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * GET /api/schedule/route
 * Расписание между двумя станциями (маршрут)
 */
app.get('/api/schedule/route', async (req, res) => {
    try {
        const { from, to, date } = req.query;

        console.log('\n' + '='.repeat(50));
        logRequest('search/route', { from, to, date });

        if (!from || !to) {
            return res.status(400).json({ error: 'Необходимы параметры from и to' });
        }

        const params = new URLSearchParams({
            apikey: API_KEY,
            from,
            to,
            transport_types: 'suburban',
            lang: 'ru_RU'
        });

        if (date) {
            params.append('date', date);
        }

        const url = `${BASE_URL}/search/?${params}`;
        console.log('   🌐 URL:', url);

        const response = await fetch(url);
        const data = await response.json();

        logResponse('search/route', response.status, data);
        console.log('='.repeat(50) + '\n');

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Ошибка при получении маршрута:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Сервер работает',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log('\n🚀 Сервер запущен!');
    console.log(`   📍 Порт: http://localhost:${PORT}`);
    console.log(`   📍 Health: http://localhost:${PORT}/api/health`);
    console.log(`   🔑 API ключ: ${API_KEY ? '✅ Загружен (' + API_KEY.slice(0, 10) + '...)' : '❌ Не задан'}`);
    console.log(`   🗄️ Кэш станций: отключён (загрузится при первом запросе)`);
    console.log('   📝 Логи запросов будут выводиться в консоль при каждом запросе\n');
});