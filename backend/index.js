// Подключаем необходимые модули
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// Создаём Express приложение
const app = express();

// Получаем настройки из переменных окружения
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.YANDEX_RASP_API_KEY;
const BASE_URL = 'https://api.rasp.yandex.net/v3.0';

// Проверка наличия API-ключа при запуске
if (!API_KEY) {
    console.error('❌ Ошибка: Не найден API ключ в переменной окружения YANDEX_RASP_API_KEY');
    console.error('Создайте файл .env и добавьте ключ');
    process.exit(1);
}

// Подключаем middleware
app.use(cors()); // Разрешаем CORS запросы с фронтенда
app.use(express.json()); // Парсим JSON в запросах

// ============================================
// 🚄 МАРШРУТЫ API (прокси к Яндекс.Расписаниям)
// ============================================

/**
 * GET /api/stations/nearby
 * Поиск станций рядом с точкой (по координатам)
 * Параметры: lat, lng, distance (опционально)
 */
app.get('/api/stations/nearby', async (req, res) => {
    try {
        const { lat, lng, distance = 30 } = req.query;

        // Валидация входных данных (защита от некорректных запросов)
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Необходимы параметры lat и lng' });
        }

        // Формируем запрос к Яндекс API
        const params = new URLSearchParams({
            apikey: API_KEY,
            lat,
            lng,
            distance,
            transport_types: 'suburban', // Только электрички
            lang: 'ru_RU'
        });

        const response = await fetch(`${BASE_URL}/nearest_stations/?${params}`);
        const data = await response.json();

        // Проверка на ошибки от Яндекс API
        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('Ошибка при поиске станций:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * GET /api/schedule/station
 * Расписание для конкретной станции
 * Параметры: station (код станции), date (опционально), event (departure/arrival)
 */
app.get('/api/schedule/station', async (req, res) => {
    try {
        const { station, date, event = 'departure' } = req.query;

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

        const response = await fetch(`${BASE_URL}/schedule/?${params}`);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('Ошибка при получении расписания станции:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * GET /api/schedule/route
 * Расписание между двумя станциями (маршрут)
 * Параметры: from, to, date (опционально)
 */
app.get('/api/schedule/route', async (req, res) => {
    try {
        const { from, to, date } = req.query;

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

        const response = await fetch(`${BASE_URL}/schedule/?${params}`);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);
    } catch (error) {
        console.error('Ошибка при получении расписания маршрута:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ============================================
// 🏥 Health check (проверка работоспособности)
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Сервер работает',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// 🚀 Запуск сервера
// ============================================
app.listen(PORT, () => {
    console.log(`🚄 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 API ключ загружен: ${API_KEY ? '✅' : '❌'}`);
});