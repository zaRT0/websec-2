/**
 * app.js - Основная логика приложения
 * Связывает UI и API, обрабатывает события пользователя
 */
let mapInitialized = false;
const AppState = {
    currentTab: 'station',
    selectedStation: null,
    favorites: []
};

let map = null;
let markersLayer = null;
let currentCenter = null;

/**
 * Инициализация приложения при загрузке страницы
 */
$(document).ready(function () {
    console.log('🚀 Приложение запущено!');

    StationsManager.init();

    initDateInputs();
    loadFavorites();
    bindEvents();

    checkServerConnection();
});

/**
 * Инициализация полей даты (установка сегодняшней даты)
 */
function initDateInputs() {
    const today = UI.getTodayDate();
    $('#station-date').val(today);
    $('#route-date').val(today);
}

/**
 * Загрузка избранных станций из localStorage
 */
function loadFavorites() {
    const saved = localStorage.getItem('electricFavorites');
    if (saved) {
        AppState.favorites = JSON.parse(saved);
        UI.renderFavorites(AppState.favorites);
    } else {
        $('#favorites-empty').show();
    }
}

/**
 * Сохранение избранных станций в localStorage
 */
function saveFavorites() {
    localStorage.setItem('electricFavorites', JSON.stringify(AppState.favorites));
    UI.renderFavorites(AppState.favorites);
}

async function handleRouteFromInput() {
    const query = $('#route-from').val().trim();
    const $autocomplete = $('#route-from-autocomplete');

    if (query.length < 2) {
        $autocomplete.removeClass('active').empty();
        return;
    }

    if (!StationsManager.getStatus().loaded && !StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка...</div>').addClass('active');

        try {
            await StationsManager.load();
        } catch (error) {
            $autocomplete.html('<div class="autocomplete-item error">❌ Ошибка</div>');
            return;
        }
    }

    if (StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка...</div>').addClass('active');
        return;
    }

    const results = StationsManager.search(query, 20);

    if (results.length > 0) {
        UI.renderStationSuggestions(results, '#route-from-autocomplete', (station) => {
            $('#route-from').val(station.title);
            AppState.routeFrom = {
                code: station.code,
                title: station.title
            };
            $autocomplete.removeClass('active');
        });
    } else {
        $autocomplete.removeClass('active');
    }
}

/**
 * Обработка ввода "Куда" (маршрут)
 */
async function handleRouteToInput() {
    const query = $('#route-to').val().trim();
    const $autocomplete = $('#route-to-autocomplete');

    if (query.length < 2) {
        $autocomplete.removeClass('active').empty();
        return;
    }

    if (!StationsManager.getStatus().loaded && !StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка...</div>').addClass('active');

        try {
            await StationsManager.load();
        } catch (error) {
            $autocomplete.html('<div class="autocomplete-item error">❌ Ошибка</div>');
            return;
        }
    }

    if (StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка...</div>').addClass('active');
        return;
    }

    const results = StationsManager.search(query, 20);

    if (results.length > 0) {
        UI.renderStationSuggestions(results, '#route-to-autocomplete', (station) => {
            $('#route-to').val(station.title);
            AppState.routeTo = {
                code: station.code,
                title: station.title
            };
            $autocomplete.removeClass('active');
        });
    } else {
        $autocomplete.removeClass('active');
    }
}

/**
 * Добавление станции в избранное
 * @param {object} station - Данные станции
 */
function addToFavorites(station) {
    const exists = AppState.favorites.find(f => f.code === station.code);

    if (exists) {
        alert('Эта станция уже в избранном!');
        return;
    }

    AppState.favorites.push({
        code: station.code,
        name: station.title || station.station_name,
        type: station.station_type || 'Станция'
    });

    saveFavorites();
}

/**
 * Удаление станции из избранного
 * @param {number} index - Индекс в массиве
 */
function removeFromFavorites(index) {
    AppState.favorites.splice(index, 1);
    saveFavorites();
}

/**
 * Привязка обработчиков событий
 */
function bindEvents() {
    $('.tab__button').on('click', function () {
        const tab = $(this).data('tab');
        switchTab(tab);
    });

    $('#btn-search-station').on('click', handleStationSearch);
    $('#station-input').on('input', debounce(handleStationInput, 300));

    $('#btn-search-route').on('click', handleRouteSearch);

    $('#btn-favorite-current').on('click', handleAddCurrentToFavorites);

    $('#route-from').on('input', debounce(handleRouteFromInput, 300));
    $('#route-to').on('input', debounce(handleRouteToInput, 300));

    $('#btn-add-favorite-station').on('click', handleAddToFavorites);
    $(document).on('click', '.favorite-card__btn--remove', handleRemoveFromFavorites);
    $(document).on('click', '.favorite-card__btn--view', handleViewFavorite);

    $('#btn-map-search').on('click', handleMapSearch);
    $('.modal__close').on('click', () => UI.hideModal());
    $('.modal__overlay').on('click', () => UI.hideModal());
    $('#btn-find-nearby').on('click', handleFindNearby);

    $('.nav__link').on('click', handleNavClick);

    $('.header__menu-toggle').on('click', toggleMobileMenu);
}

/**
 * Переключение вкладок (по станции / по маршруту)
 * @param {string} tab - Название вкладки
 */
function switchTab(tab) {
    AppState.currentTab = tab;

    $('.tab__button').removeClass('tab__button--active');
    $(`.tab__button[data-tab="${tab}"]`).addClass('tab__button--active');

    if (tab === 'station') {
        $('.search-form--station').show();
        $('.search-form--route').hide();
    } else {
        $('.search-form--station').hide();
        $('.search-form--route').show();
    }
}

async function handleStationInput() {
    const query = $('#station-input').val().trim();
    const $autocomplete = $('#station-autocomplete');
    const $favoriteBtn = $('#btn-favorite-current');


    if (query.length < 2) {
        $autocomplete.removeClass('active').empty();
        return;
    }

    if (!StationsManager.getStatus().loaded && !StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка станций...</div>').addClass('active');

        try {
            await StationsManager.load();
        } catch (error) {
            $autocomplete.html('<div class="autocomplete-item error">❌ Ошибка загрузки</div>');
            return;
        }
    }

    if (StationsManager.getStatus().loading) {
        $autocomplete.html('<div class="autocomplete-item">⏳ Загрузка...</div>').addClass('active');
        return;
    }

    const results = StationsManager.search(query, 20);

    if (results.length > 0) {
        UI.renderStationSuggestions(results, '#station-autocomplete', (station) => {
            $('#station-input').val(station.title);
            AppState.selectedStation = {
                code: station.code,
                lat: station.lat,
                lng: station.lng
            };
            $autocomplete.removeClass('active');
            $favoriteBtn.show();
        });
    } else {
        $autocomplete.removeClass('active');
        $favoriteBtn.hide();
    }
}

/**
 * Обработка поиска по станции
 */
async function handleStationSearch() {
    const stationName = $('#station-input').val().trim();
    const date = $('#station-date').val();
    const event = $('#station-event').val();

    if (!stationName) {
        UI.showError('Введите название станции');
        return;
    }

    if (AppState.selectedStation && AppState.selectedStation.code) {
        await searchScheduleByCode(AppState.selectedStation.code, date, event);
        return;
    }

    UI.showLoader();

    try {
        setTimeout(() => {
            const mockTrains = [
                {
                    departure: new Date().toISOString(),
                    direction: 'Москва-Пассажирская',
                    route: 'Москва — Тверь',
                    platform: '3',
                    type: 'Экспресс',
                    status: 'По расписанию'
                },
                {
                    departure: new Date(Date.now() + 3600000).toISOString(),
                    direction: 'Санкт-Петербург',
                    route: 'Москва — СПб',
                    platform: '1',
                    type: 'Сапсан',
                    status: 'Задерживается'
                }
            ];

            UI.renderSchedule(mockTrains);
        }, 1000);

    } catch (error) {
        UI.showError('Ошибка при загрузке расписания: ' + error.message);
    }
}

/**
 * Поиск расписания по коду станции
 * @param {string} stationCode - Код станции
 * @param {string} date - Дата
 * @param {string} event - Событие (departure/arrival)
 */
async function searchScheduleByCode(stationCode, date, event) {
    UI.showLoader();

    try {
        const data = await API.getStationSchedule(stationCode, date, event);
        console.log('📦 Расписание (полный ответ):', data);

        const trains = data.schedule || data.segments || [];

        console.log(`📋 Поездов найдено: ${trains.length}`);

        if (trains && trains.length > 0) {
            UI.renderSchedule(data, event);
        } else {
            UI.showEmptyState();
        }

    } catch (error) {
        console.error('❌ Ошибка расписания:', error);
        UI.showError('Ошибка при загрузке расписания: ' + error.message);
    }
}

/**
 * Обработка поиска по маршруту
 */
async function handleRouteSearch() {
    const from = $('#route-from').val().trim();
    const to = $('#route-to').val().trim();
    const date = $('#route-date').val();

    if (!from || !to) {
        UI.showError('Укажите станции отправления и прибытия');
        return;
    }

    const fromCode = AppState.routeFrom?.code;
    const toCode = AppState.routeTo?.code;

    if (!fromCode || !toCode) {
        UI.showError('Выберите станции из выпадающего списка');
        return;
    }

    UI.showLoader();

    try {
        const data = await API.getRouteSchedule(fromCode, toCode, date);
        console.log('📦 Маршрут:', data);

        const segments = data.segments || [];

        if (segments && segments.length > 0) {
            UI.renderSchedule(segments);
        } else {
            UI.showEmptyState();
        }

    } catch (error) {
        console.error('❌ Ошибка маршрута:', error);
        UI.showError('Ошибка при загрузке маршрута: ' + error.message);
    }
}

/**
 * Обработка добавления в избранное
 */
function handleAddToFavorites() {
    const stationName = $('#station-input').val().trim();

    if (!stationName) {
        UI.showError('Сначала найдите станцию');
        return;
    }

    if (AppState.selectedStation && AppState.selectedStation.code) {
        addToFavorites({
            code: AppState.selectedStation.code,
            title: stationName,
            station_type: 'Станция'
        });
        return;
    }

    addToFavorites({
        code: 'temp_' + Date.now(),
        title: stationName,
        station_type: 'Станция'
    });
}

/**
 * Обработка удаления из избранного
 */
function handleRemoveFromFavorites(e) {
    const index = $(e.target).data('index');
    removeFromFavorites(index);
}

/**
 * Обработка просмотра избранной станции
 */
function handleViewFavorite(e) {
    const index = $(e.target).data('index');
    const favorite = AppState.favorites[index];

    if (favorite) {
        $('#station-input').val(favorite.name);
        AppState.selectedStation = { code: favorite.code };
        handleStationSearch();

        $('html, body').animate({ scrollTop: $('#search').offset().top }, 500);
    }
}


/**
 * Обработка открытия карты — с авто-центром на выбранной станции, либо просто показ ближайших в выбранном районе/городе
 */
function handleMapSearch() {
    console.log('🗺️ Открытие карты...');
    UI.showModal();

    setTimeout(() => {
        initMap();

        setTimeout(() => {
            if (map) {
                map.invalidateSize();

                if (AppState.selectedStation?.lat && AppState.selectedStation?.lng) {
                    console.log(`🎯 Карта центрируется на: ${AppState.selectedStation.title}`);

                    map.setView([AppState.selectedStation.lat, AppState.selectedStation.lng], 13);
                    const marker = L.marker([AppState.selectedStation.lat, AppState.selectedStation.lng], {
                        icon: L.divIcon({
                            className: 'custom-click-marker',
                            html: '🚃',
                            iconSize: [30, 30],
                            iconAnchor: [15, 30]
                        })
                    }).bindPopup(`<b>Выбрано:</b><br>${AppState.selectedStation.title}`);

                    marker.addTo(window.clickMarkerLayer);
                    console.log('🗺️ Карта открыта на выбранной станции');
                } else {
                    console.log('🗺️ Карта открыта, ищем ближайшие станции...');
                    searchAndDisplayStations(currentCenter.lat, currentCenter.lng);
                }
            }
        }, 300);
    }, 100);
}

/**
 * Отобразить станции на карте (из менеджера)
 */
function renderStationsOnMap(stations) {
    if (!markersLayer) return;

    markersLayer.clearLayers();
    $('#coords-results').empty();

    if (!stations || stations.length === 0) {
        $('#coords-results').html('<p class="empty-state">Станции не найдены</p>');
        return;
    }

    console.log(`🗺️ Отображаем ${stations.length} станций на карте`);

    stations.slice(0, 100).forEach((station, index) => {
        const marker = L.circleMarker([station.lat, station.lng], {
            radius: 7,
            fillColor: index < 10 ? '#7F7FD5' : '#00B4DB',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        });

        const shortName = station.title.length > 25 ? station.title.substring(0, 25) + '...' : station.title;
        marker.bindTooltip(`<b>${shortName}</b>`, {
            permanent: false,
            direction: 'top',
            offset: [0, -8]
        });

        marker.bindPopup(`
      <div style="min-width: 180px;">
        <b style="font-size: 13px;">${station.title}</b><br>
        <small style="color: #666;">${station.settlement || ''}</small><br>
        <button onclick="selectStationFromMap('${station.code}', '${station.title.replace(/'/g, "\\'")}')" 
                style="margin-top: 8px; padding: 5px 12px; background: #00B4DB; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🚃 Выбрать
        </button>
      </div>
    `);

        marker.addTo(markersLayer);

        const $item = $(`
      <div class="autocomplete-item" data-code="${station.code}">
        <span class="autocomplete-item__name">${shortName}</span>
        <span class="autocomplete-item__type">${station.type}</span>
      </div>
    `);

        $item.on('click', () => selectStationFromMap(station.code, station.title));
        $('#coords-results').append($item);
    });

    if (stations.length > 100) {
        $('#coords-results').append(`<p style="font-size: 12px; color: #999; text-align: center; margin-top: 8px;">Показано 100 из ${stations.length} станций</p>`);
    }
}

/**
 * Инициализация карты с автозагрузкой и обновлением
 */
function initMap() {
    if (map) return;

    console.log('🗺️ Инициализация карты...');

    map = L.map('map').setView([55.7558, 37.6173], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    window.clickMarkerLayer = L.layerGroup().addTo(map);

    currentCenter = map.getCenter();

    let searchTimeout;
    let moveCount = 0;

    map.on('moveend', function () {
        moveCount++;
        clearTimeout(searchTimeout);
        currentCenter = map.getCenter();

        console.log(`📍 Карта перемещена (счет: ${moveCount})`);

        searchTimeout = setTimeout(() => {
            console.log(` Автопоиск станций после ${moveCount} перемещений`);

        }, 2000);
    });

    map.on('click', function (e) {
        const { lat, lng } = e.latlng;

        window.clickMarkerLayer.clearLayers();

        const clickMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-click-marker',
                html: '📍',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).bindPopup(`<b>Вы выбрали:</b><br>Широта: ${lat.toFixed(4)}<br>Долгота: ${lng.toFixed(4)}`);

        clickMarker.addTo(window.clickMarkerLayer);

        searchAndDisplayStations(lat, lng, 30);
    });

    mapInitialized = true;
    console.log('✅ Карта инициализирована (без автозагрузки)');
}

/**
 * Поиск станций при клике на кнопку "Найти ближайшие"
 */
async function handleFindNearby() {
    if (!currentCenter) {
        currentCenter = map.getCenter();
    }

    await searchAndDisplayStations(currentCenter.lat, currentCenter.lng);
}

/**
 * Поиск станций при клике на карту
 * @param {object} latlng - Координаты клика
 */
async function findStationsByClick(latlng) {
    await searchAndDisplayStations(latlng.lat, latlng.lng);
}

/**
 * Поиск и отображение станций на карте и в списке
 * @param {number} lat - Широта центра поиска
 * @param {number} lng - Долгота центра поиска  
 * @param {number} radius - Радиус поиска в км
 */
async function searchAndDisplayStations(lat, lng, radius = 50) {
    UI.showLoader();

    try {

        const data = await API.searchStationsByCoords(lat, lng, radius);
        console.log('📦 Ответ от API:', data);

        if (markersLayer) {
            markersLayer.clearLayers();
        }

        $('#coords-results').empty();
        const stations = data.stations || [];

        if (stations.length === 0) {
            $('#coords-results').html('<p class="empty-state">Станции с электричками не найдены в этой области</p>');
            UI.hideLoader();
            return;
        }

        console.log(`✅ Найдено ${stations.length} станций с электричками`);

        stations.forEach((station, index) => {

            const stationLat = station.lat;
            const stationLng = station.lng;

            if (!stationLat || !stationLng) {
                console.warn('⚠️ Пропущена станция без координат:', station.title);
                return;
            }

            const stationName = station.title || station.short_title || 'Неизвестно';
            const stationType = station.station_type_name || 'Станция';
            const stationCode = station.code || '';

            const marker = L.circleMarker([stationLat, stationLng], {
                radius: 10,
                fillColor: index === 0 ? '#7F7FD5' : '#00B4DB',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });

            const shortName = stationName.length > 20 ? stationName.substring(0, 20) + '...' : stationName;
            marker.bindTooltip(`<b>${shortName}</b>`, {
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            });

            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <b style="font-size: 14px;">${stationName}</b><br>
                    <span style="color: #666; font-size: 12px;">${stationType}</span><br>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button onclick="selectStationFromMap('${stationCode}', '${stationName.replace(/'/g, "\\'")}')" 
                                style="flex: 1; padding: 6px 12px; background: #00B4DB; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
                            🚃 Выбрать
                        </button>
                        <button onclick="addToFavoriteFromMap('${stationCode}', '${stationName.replace(/'/g, "\\'")}', '${stationType}')" 
                                style="padding: 6px 12px; background: #FF9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
                                title="Добавить в избранное">
                            ⭐
                        </button>
                    </div>
                </div>
            `);

            marker.addTo(markersLayer);

            const $item = $(`
        <div class="autocomplete-item" data-code="${stationCode}" data-lat="${stationLat}" data-lng="${stationLng}">
          <span class="autocomplete-item__name">${stationName}</span>
          <span class="autocomplete-item__type">${stationType}</span>
          ${index === 0 ? '<span style="color: #7F7FD5; font-weight: bold; margin-left: auto;">📍 Ближайшая</span>' : ''}
        </div>
      `);

            $item.on('click', function () {
                selectStationFromMap(stationCode, stationName);
            });

            $('#coords-results').append($item);

            if (index === 0) {
                map.setView([stationLat, stationLng], 11);
            }
        });

        UI.hideLoader();

    } catch (error) {
        console.error('❌ Ошибка при поиске станций:', error);
        UI.showError('Ошибка при поиске: ' + error.message);
        UI.hideLoader();
    }
}

/**
 * Выбор станции с карты (глобальная функция)
 * @param {string} code - Код станции
 * @param {string} name - Название станции
 */
window.selectStationFromMap = function (code, name) {
    $('#station-input').val(name);
    AppState.selectedStation = { code };

    UI.hideModal();

    $('html, body').animate({ scrollTop: $('#search').offset().top }, 500);

    setTimeout(() => {
        handleStationSearch();
    }, 600);

    console.log(`✅ Выбрана станция: ${name} (${code})`);
};

/**
 * Обработка кликов по навигации
 */
function handleNavClick(e) {
    e.preventDefault();
    const target = $(e.target).attr('href');

    if (target && target.startsWith('#')) {
        $('html, body').animate({ scrollTop: $(target).offset().top }, 500);
    }
}

/**
 * Переключение мобильного меню
 */
function toggleMobileMenu() {
    $('.header__nav').toggleClass('active');
}

/**
 * Проверка соединения с сервером
 */
async function checkServerConnection() {
    try {
        await API.checkServerHealth();
        console.log('✅ Сервер подключён');
    } catch (error) {
        console.warn('⚠️ Сервер недоступен. Запустите backend!');
    }
}

/**
 * Функция для debouncing (защита от частых запросов)
 * @param {function} func - Функция
 * @param {number} wait - Задержка в мс
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Добавить текущую станцию в избранное
 */
function handleAddCurrentToFavorites() {
    const stationName = $('#station-input').val().trim();

    if (!stationName || !AppState.selectedStation || !AppState.selectedStation.code) {
        UI.showError('Сначала выберите станцию');
        return;
    }

    addToFavorites({
        code: AppState.selectedStation.code,
        title: stationName,
        station_type: 'Станция'
    });

    // Меняем иконку на закрашенную
    $('#btn-favorite-current').text('★').addClass('active');
}

/**
 * Добавить в избранное с карты (глобальная функция)
 */
window.addToFavoriteFromMap = function (code, name, type) {
    addToFavorites({
        code: code,
        title: name,
        station_type: type || 'Станция'
    });
};

console.log('✅ App модуль загружен');