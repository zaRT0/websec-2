/**
 * stations.js - Менеджер станций с кэшированием
 * 1 запрос к API + localStorage + мгновенный поиск
 */

const StationsManager = {
    stations: null,
    isLoading: false,
    lastLoadTime: null,
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 часа

    STORAGE_KEY: 'electric_stations_cache',
    STORAGE_TIME_KEY: 'electric_stations_cache_time',

    /**
     * Инициализация (не загружает сразу!)
     */
    init() {
        console.log('🗄️ StationsManager initialized');
        this._loadFromLocalStorage();
    },

    /**
     * Загрузить из localStorage (если есть и свежий)
     */
    _loadFromLocalStorage() {
        try {
            const cached = localStorage.getItem(this.STORAGE_KEY);
            const cachedTime = localStorage.getItem(this.STORAGE_TIME_KEY);

            if (cached && cachedTime) {
                const age = Date.now() - parseInt(cachedTime);

                if (age < this.CACHE_TTL) {
                    this.stations = JSON.parse(cached);
                    this.lastLoadTime = parseInt(cachedTime);
                    console.log(`✅ Загружено ${this.stations.length} станций из кэша`);
                    return true;
                } else {
                    console.log('⏰ Кэш устарел, будет перезагружен');
                    localStorage.removeItem(this.STORAGE_KEY);
                    localStorage.removeItem(this.STORAGE_TIME_KEY);
                }
            }
        } catch (e) {
            console.warn('⚠️ Ошибка чтения кэша:', e);
        }
        return false;
    },

    /**
     * Сохранить в localStorage
     */
    _saveToLocalStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stations));
            localStorage.setItem(this.STORAGE_TIME_KEY, Date.now().toString());
            console.log('💾 Станции сохранены в кэш');
        } catch (e) {
            console.warn('⚠️ Ошибка сохранения в кэш:', e);
        }
    },

    /**
     * Загрузить станции с бэкенда (ОДИН запрос!)
     */
    async load() {
        if (this.stations) {
            console.log('✅ Станции уже в памяти');
            return this.stations;
        }

        if (this.isLoading) {
            console.log('⏳ Загрузка уже идёт, ждём...');
            return new Promise((resolve) => {
                const checkLoaded = setInterval(() => {
                    if (!this.isLoading && this.stations) {
                        clearInterval(checkLoaded);
                        resolve(this.stations);
                    }
                }, 100);
            });
        }

        this.isLoading = true;
        console.log('📡 Загрузка станций с сервера...');

        try {
            const response = await fetch('http://localhost:3001/api/stations/all');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            this.stations = this._parseAndFilter(data);
            this.lastLoadTime = Date.now();

            this._saveToLocalStorage();

            console.log(`✅ Загружено ${this.stations.length} станций`);
            return this.stations;

        } catch (error) {
            console.error('❌ Ошибка загрузки станций:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Парсинг и фильтрация (только нужные станции)
     */
    _parseAndFilter(data) {
        const stations = [];

        if (!data || !data.countries) {
            console.warn('⚠️ Неверный формат данных от сервера');
            return [];
        }

        for (const country of data.countries) {
            if (country.code && country.code.toUpperCase() !== 'RU') {
                continue;
            }

            for (const region of country.regions || []) {
                for (const settlement of region.settlements || []) {
                    for (const station of settlement.stations || []) {
                        const transportType = station.transport_type || '';
                        const stationType = station.station_type || '';

                        if (transportType && transportType !== 'train') {
                            continue;
                        }

                        if (stationType && stationType.toLowerCase() !== 'station') {
                            continue;
                        }

                        if (!station.latitude || !station.longitude) {
                            continue;
                        }


                        const codes = station.codes || {};
                        const code = codes.yandex_code || codes.code || station.code;
                        if (!code) {
                            continue;
                        }

                        const fullName = settlement.title
                            ? `${station.title}, ${settlement.title}`
                            : station.title;

                        stations.push({
                            code: code,
                            title: fullName,
                            short_title: station.short_title || '',
                            lat: parseFloat(station.latitude),
                            lng: parseFloat(station.longitude),
                            type: station.station_type || 'station',
                            settlement: settlement.title || ''
                        });
                    }
                }
            }
        }
        console.log(`📊 Отфильтровано ${stations.length} станций (только ЖД станции)`);
        return stations;
    },

    /**
     * Поиск по названию (локально, мгновенно)
     */
    search(query, limit = 20) {
        if (!this.stations) {
            console.warn('⚠️ Поиск без загруженных станций');
            return [];
        }

        const q = query.toLowerCase().trim();
        if (q.length < 2) return [];

        return this.stations
            .filter(s =>
                s.title.toLowerCase().includes(q) ||
                (s.short_title && s.short_title.toLowerCase().includes(q))
            )
            .slice(0, limit);
    },

    /**
     * Получить станции для карты (с координатами)
     */
    getForMap() {
        if (!this.stations) return [];

        return this.stations.filter(s => s.lat && s.lng);
    },

    /**
     * Статус загрузки
     */
    getStatus() {
        return {
            loaded: !!this.stations,
            loading: this.isLoading,
            count: this.stations ? this.stations.length : 0,
            fromCache: this.lastLoadTime !== null
        };
    }
};

window.StationsManager = StationsManager;
console.log('✅ StationsManager готов');