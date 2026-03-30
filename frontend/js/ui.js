/**
 * ui.js - Работа с интерфейсом (DOM/CSSOM)
 * Отвечает за отображение данных и взаимодействие с пользователем
 */

/**
 * Показать индикатор загрузки
 */
function showLoader() {
    $('#loader').show();
    $('#schedule-list').empty();
    $('#error-message').hide();
    $('#empty-state').hide();
}

/**
 * Скрыть индикатор загрузки
 */
function hideLoader() {
    $('#loader').hide();
}

/**
 * Показать сообщение об ошибке
 * @param {string} message - Текст ошибки
 */
function showError(message) {
    hideLoader();
    $('#error-message .error__text').text(message);
    $('#error-message').show();
    $('#schedule-list').empty();
}

/**
 * Показать сообщение "ничего не найдено"
 */
function showEmptyState() {
    hideLoader();
    $('#empty-state').show();
    $('#schedule-list').empty();
}

/**
 * Скрыть все сообщения
 */
function hideMessages() {
    $('#error-message').hide();
    $('#empty-state').hide();
}

/**
 * Отрисовать карточки поездов в списке расписания
 * @param {array} trains - Массив данных о поездах
 */
/**
 * Отрисовать карточки поездов в списке расписания
 * @param {array} data - Данные о расписании (может быть объектом или массивом)
 */
/**
 * Отрисовать карточки поездов в списке расписания
 */
/**
 * Отрисовать карточки поездов в списке расписания
 * @param {array} data - Данные о расписании (может быть объектом или массивом)
 */
function renderSchedule(data, eventType = 'departure') {
    hideLoader();
    hideMessages();

    const $scheduleList = $('#schedule-list');
    $scheduleList.empty();

    let trains = [];

    if (Array.isArray(data)) {
        trains = data;
    } else if (data && typeof data === 'object') {
        trains = data.schedule || data.segments || data.schedules || [];

        if (!trains || trains.length === 0) {
            trains = data.interval_schedule || [];
        }
    }

    console.log('📋 Расписание для отрисовки:', trains);

    if (!trains || trains.length === 0) {
        console.warn('⚠️ Расписание пустое!');
        showEmptyState();
        return;
    }

    console.log(`✅ Отображаем ${trains.length} поездов`);

    const template = document.getElementById('train-card-template');

    trains.forEach(train => {
        const clone = template.content.cloneNode(true);

        const departure = train.departure;
        const arrival = train.arrival;
        const duration = train.duration;

        const departureTime = UI.formatTime(departure?.date || departure);
        const arrivalTime = UI.formatTime(arrival?.date || arrival);

        const displayTime = eventType === 'arrival' ? arrivalTime : departureTime;
        const timeLabel = eventType === 'arrival' ? 'Прибытие' : 'Отправление';

        let travelTime = '';
        if (duration) {
            const hours = Math.floor(duration / 60);
            const mins = duration % 60;
            travelTime = `${hours}ч ${mins}м`;
        }

        let direction = 'Не указано';

        if (train.thread && train.thread.destination) {
            direction = train.thread.destination.title || 'Не указано';
        } else if (train.destination && train.destination.title) {
            direction = train.destination.title;
        } else if (train.to && train.to.title) {
            direction = train.to.title;
        } else if (train.direction) {
            direction = train.direction;
        }

        const platform = train.platform || '?';

        const trainType = train.transport_type || 'Электричка';

        const status = train.status || 'По расписанию';

        $(clone).find('.train-card__time').text(displayTime || '--:--');
        $(clone).find('.train-card__time-label').text(timeLabel);
        $(clone).find('.train-card__direction').text(`${direction}`);
        $(clone).find('.train-card__platform').text(`Платформа ${platform}`);
        $(clone).find('.train-card__type').text(trainType);
        $(clone).find('.train-card__status').text(status);

        const $arrivalElement = $(clone).find('.train-card__arrival');
        if ($arrivalElement.length > 0) {
            if (eventType === 'arrival' && arrivalTime && arrivalTime !== '--:--') {
                $arrivalElement.html(`Отправление: <b>${departureTime}</b>`).show();
            } else if (arrivalTime && arrivalTime !== '--:--') {
                $arrivalElement.html(`Прибытие: <b>${arrivalTime}</b>`).show();
            } else {
                $arrivalElement.hide();
            }
        }

        $scheduleList.append(clone);
    });

    console.log(`✅ Отображено ${trains.length} поездов`);
}

/**
 * Отрисовать результаты поиска станций (автодополнение)
 * @param {array} stations - Массив станций
 * @param {string} containerId - ID контейнера для результатов
 * @param {function} onSelect - Функция при выборе станции
 */
/**
 * Отрисовать результаты поиска станций (автодополнение)
 */
function renderStationSuggestions(stations, containerId, onSelect) {
    const $container = $(containerId);
    $container.empty();

    if (!stations || stations.length === 0) {
        $container.removeClass('active');
        return;
    }

    stations.slice(0, 10).forEach(station => {
        const $item = $('<div class="autocomplete-item"></div>');

        const $name = $('<span class="autocomplete-item__name"></span>')
            .text(station.title || station.station_name || 'Неизвестно');

        const $type = $('<span class="autocomplete-item__type"></span>')
            .text(station.station_type || 'Станция');

        const $favoriteBtn = $('<button class="btn-favorite-small" title="Добавить в избранное">⭐</button>');

        $item.append($name).append($type);

        $item.on('click', function () {
            onSelect(station);
            $container.removeClass('active');
        });

        $container.append($item);
    });

    $container.addClass('active');
}

/**
 * Отрисовать список избранных станций
 * @param {array} favorites - Массив избранных станций
 */
function renderFavorites(favorites) {
    const $favoritesList = $('#favorites-list');
    $favoritesList.empty();

    if (!favorites || favorites.length === 0) {
        $('#favorites-empty').show();
        return;
    }

    $('#favorites-empty').hide();

    favorites.forEach((fav, index) => {
        const $card = $('<div class="favorite-card"></div>');

        $card.html(`
      <div class="favorite-card__name">${fav.name}</div>
      <div class="favorite-card__type">${fav.type || 'Станция'}</div>
      <div class="favorite-card__actions">
        <button class="favorite-card__btn favorite-card__btn--view" data-index="${index}">
          📋 Расписание
        </button>
        <button class="favorite-card__btn favorite-card__btn--remove" data-index="${index}">
          ❌ Удалить
        </button>
      </div>
    `);

        $favoritesList.append($card);
    });

    console.log(`✅ Отображено ${favorites.length} избранных станций`);
}

/**
 * Показать модальное окно
 */
function showModal() {
    $('#map-modal').fadeIn(300);
    $('body').css('overflow', 'hidden');
}

/**
 * Скрыть модальное окно
 */
function hideModal() {
    $('#map-modal').fadeOut(300);
    $('body').css('overflow', '');
}

/**
 * Форматирование времени (из ISO в читаемый формат)
 * @param {string} isoTime - Время в формате ISO
 * @returns {string} - Время в формате ЧЧ:ММ
 */
function formatTime(isoTime) {
    if (!isoTime) return '--:--';

    const date = new Date(isoTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

/**
 * Форматирование даты для input type="date"
 * @returns {string} - Дата в формате YYYY-MM-DD
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Очистить форму поиска
 */
function clearSearchForm() {
    $('#station-input').val('');
    $('#route-from').val('');
    $('#route-to').val('');
    $('#schedule-list').empty();
    $('.autocomplete-results').removeClass('active');
}

window.UI = {
    showLoader,
    hideLoader,
    showError,
    showEmptyState,
    hideMessages,
    renderSchedule,
    renderStationSuggestions,
    renderFavorites,
    showModal,
    hideModal,
    formatTime,
    getTodayDate,
    clearSearchForm
};

console.log('✅ UI модуль загружен');