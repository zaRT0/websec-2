import { useState, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { debounce } from '../utils/debounce';
import { getTodayDate } from '../utils/formatters';
import Input from './Input';
import Button from './Button';
import StationAutocomplete from './StationAutocomplete';

const SearchForm = forwardRef(function SearchForm({ onSearchComplete, onOpenMap }, ref) {
    const {
        currentTab,
        selectedStation,
        setSelectedStation,
        routeFrom,
        setRouteFrom,
        routeTo,
        setRouteTo,
        eventType,
        setEventType,
        addFavorite
    } = useStore();

    const [stationQuery, setStationQuery] = useState('');
    const [stationSuggestions, setStationSuggestions] = useState([]);
    const [date, setDate] = useState(getTodayDate());
    const [fromSuggestions, setFromSuggestions] = useState([]);
    const [toSuggestions, setToSuggestions] = useState([]);

    useImperativeHandle(ref, () => ({
        updateStationField: (value) => setStationQuery(value)
    }));

    const isRailwayStation = (station) => {
        const type = (station.station_type || station.type || '').toLowerCase();
        const title = (station.title || '').toLowerCase();

        const excludeKeywords = [
            'автовокзал', 'автостанция', 'автобус', 'bus',
            'аквапарк', 'турбаза', 'дом культуры', 'дк',
            'санаторий', 'пансионат', 'база отдыха',
            'стадион', 'парк', 'торговый центр', 'тц', 'гостиница',
            'тур', 'речной вокзал', 'рынок'
        ];

        const isExcluded = excludeKeywords.some(keyword =>
            type.includes(keyword) || title.includes(keyword)
        );

        if (isExcluded) return false;

        const includeKeywords = [
            'station', 'платформа', 'вокзал', 'ж/д', 'жд',
            'остановочный пункт', 'пост', 'разъезд', 'депо'
        ];

        return includeKeywords.some(keyword =>
            type.includes(keyword) || title.includes(keyword)
        );
    };

    const deduplicateStations = (stations) => {
        const seen = new Map();

        stations.forEach(station => {
            const key = station.code || `${station.title}-${station.lat}-${station.lng}`;

            if (!seen.has(key)) {
                seen.set(key, station);
            } else {
                const existing = seen.get(key);
                if (station.title.toLowerCase().includes('ж/д') && !existing.title.toLowerCase().includes('ж/д')) {
                    seen.set(key, station);
                }
            }
        });

        return Array.from(seen.values());
    };

    const debouncedApiSearch = debounce(async (query) => {
        if (query.length < 2) { setStationSuggestions([]); return; }
        try {
            const data = await apiService.searchStations(query);

            const filtered = (data.stations || []).filter(isRailwayStation);

            const unique = deduplicateStations(filtered);

            setStationSuggestions(unique);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            setStationSuggestions([]);
        }
    }, 300);

    const debouncedFromSearch = debounce(async (query) => {
        if (query.length >= 2) {
            try {
                const data = await apiService.searchStations(query);
                const filtered = (data.stations || []).filter(isRailwayStation);
                const unique = deduplicateStations(filtered);
                setFromSuggestions(unique);
            } catch (err) { setFromSuggestions([]); }
        } else { setFromSuggestions([]); }
    }, 300);

    const debouncedToSearch = debounce(async (query) => {
        if (query.length >= 2) {
            try {
                const data = await apiService.searchStations(query);
                const filtered = (data.stations || []).filter(isRailwayStation);
                const unique = deduplicateStations(filtered);
                setToSuggestions(unique);
            } catch (err) { setToSuggestions([]); }
        } else { setToSuggestions([]); }
    }, 300);

    const handleStationInput = (e) => {
        const query = e.target.value;
        setStationQuery(query);
        debouncedApiSearch(query);
    };

    const handleSelectStation = (station) => {
        setStationQuery(station.title);
        setSelectedStation(station);
        setStationSuggestions([]);
    };

    const handleFromInput = (e) => {
        const query = e.target.value;
        setRouteFrom({ title: query, code: null });
        debouncedFromSearch(query);
    };

    const handleSelectFrom = (station) => {
        setRouteFrom(station);
        setFromSuggestions([]);
    };

    const handleToInput = (e) => {
        const query = e.target.value;
        setRouteTo({ title: query, code: null });
        debouncedToSearch(query);
    };

    const handleSelectTo = (station) => {
        setRouteTo(station);
        setToSuggestions([]);
    };

    const handleStationSearch = async () => {
        if (!selectedStation?.code) {
            alert('Выберите станцию из списка');
            return;
        }
        onSearchComplete(selectedStation.code, date, eventType);
    };

    const handleRouteSearch = async () => {
        if (!routeFrom?.code || !routeTo?.code) {
            alert('Выберите станции отправления и прибытия');
            return;
        }
        onSearchComplete(routeFrom.code, date, null, routeTo.code);
    };

    const handleEventChange = (e) => setEventType(e.target.value);

    const handleAddToFavorites = () => {
        if (selectedStation) {
            addFavorite({
                code: selectedStation.code,
                name: selectedStation.title,
                type: selectedStation.station_type || 'Станция'
            });
        }
    };

    return (
        <div className="search-form">
            {currentTab === 'station' && (
                <>
                    <div className="form__group">
                        <label className="form__label">Ж/Д СТАНЦИЯ</label>
                        <div className="input-with-buttons">
                            <Input
                                value={stationQuery}
                                onChange={handleStationInput}
                                placeholder="Например: Москва-Пассажирская"
                            />
                            <div className="input-buttons">
                                {selectedStation && (
                                    <button
                                        className="btn--favorite"
                                        onClick={handleAddToFavorites}
                                        title="В избранное"
                                    >
                                        ⭐
                                    </button>
                                )}
                                <button
                                    className="btn--icon"
                                    onClick={onOpenMap}
                                    title="На карте"
                                >
                                    🗺️
                                </button>
                            </div>
                        </div>
                        <StationAutocomplete
                            stations={stationSuggestions}
                            onSelect={handleSelectStation}
                            containerId="station-autocomplete"
                        />
                    </div>

                    <div className="form__group">
                        <label className="form__label">Дата</label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>

                    <div className="form__group">
                        <label className="form__label">Событие</label>
                        <select className="form__select" value={eventType} onChange={handleEventChange}>
                            <option value="departure">Отправление</option>
                            <option value="arrival">Прибытие</option>
                        </select>
                    </div>

                    <Button onClick={handleStationSearch} variant="primary" className="btn--full">
                        Найти расписание
                    </Button>
                </>
            )}

            {currentTab === 'route' && (
                <>
                    <div className="form__group">
                        <label className="form__label">Откуда</label>
                        <Input value={routeFrom?.title || ''} onChange={handleFromInput} placeholder="Станция отправления" />
                        <StationAutocomplete stations={fromSuggestions} onSelect={handleSelectFrom} containerId="route-from-autocomplete" />
                    </div>
                    <div className="form__group">
                        <label className="form__label">Куда</label>
                        <Input value={routeTo?.title || ''} onChange={handleToInput} placeholder="Станция прибытия" />
                        <StationAutocomplete stations={toSuggestions} onSelect={handleSelectTo} containerId="route-to-autocomplete" />
                    </div>
                    <div className="form__group">
                        <label className="form__label">Дата</label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <Button onClick={handleRouteSearch} variant="primary" className="btn--full">
                        🔍 Найти маршрут
                    </Button>
                </>
            )}
        </div>
    );
});

export default SearchForm;