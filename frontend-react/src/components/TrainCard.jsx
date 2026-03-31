import { formatTime } from '../utils/formatters';

export default function TrainCard({ train, eventType = 'departure' }) {
    const departure = train.departure;
    const arrival = train.arrival;

    const departureTime = formatTime(departure?.date || departure);
    const arrivalTime = formatTime(arrival?.date || arrival);

    const displayTime = eventType === 'arrival' ? arrivalTime : departureTime;
    const timeLabel = eventType === 'arrival' ? 'Прибытие' : 'Отправление';

    let routeTitle = 'Не указано';
    if (train.thread?.title) {
        routeTitle = train.thread.title;
    } else if (train.from?.title && train.to?.title) {
        routeTitle = `${train.from.title} — ${train.to.title}`;
    } else if (train.destination?.title) {
        routeTitle = `→ ${train.destination.title}`;
    }

    const trainNumber = train.number || train.thread?.number || '';

    const rawExpressType = train.express_type || train.thread?.express_type || '';
    const expressType = getExpressTypeName(rawExpressType);

    const transportType = train.transport_type || train.type || 'Электричка';

    const isExpress = train.flags?.is_express || train.thread?.flags?.is_express;
    const isBrand = train.flags?.is_brand || train.thread?.flags?.is_brand;
    const brandName = train.brand_name || train.thread?.brand_name || '';
    const hasTwoFloor = train.flags?.has_two_floor || train.thread?.flags?.has_two_floor;

    const comment = train.comment || train.thread?.comment || train.stops_comment || '';

    const platform = train.platform || train.departure?.platform || '?';
    const track = train.track || train.departure?.track || '';

    const status = train.status || 'По расписанию';
    const isOnTime = status.toLowerCase().includes('по расписанию') ||
        status.toLowerCase().includes('on time') ||
        status.toLowerCase().includes('вовремя');

    const duration = train.duration ? formatDuration(train.duration) : '';

    const stopsArray = Array.isArray(train.stops) ? train.stops :
        Array.isArray(train.intermediate_stops) ? train.intermediate_stops : [];

    const passengerStops = Array.isArray(stopsArray) ?
        stopsArray.filter(stop => stop && !stop.is_terminal && !stop.is_start && !stop.is_technical) : [];

    const stopCount = passengerStops.length;

    return (
        <div className="train-card">
            <div className="train-card__header">
                <div className="train-card__time-block">
                    <div className="train-card__time">{displayTime || '--:--'}</div>
                    <div className="train-card__time-label">{timeLabel}</div>
                </div>
                <div className={`train-card__status ${isOnTime ? 'status--on-time' : 'status--delayed'}`}>
                    {status}
                </div>
            </div>

            <div className="train-card__body">
                <div className="train-card__route">
                    {routeTitle}
                </div>

                {trainNumber && (
                    <div className="train-card__number">
                        № {trainNumber}
                    </div>
                )}

                {expressType && (
                    <div className="train-card__express">
                        «{expressType}»
                    </div>
                )}

                {isBrand && brandName && (
                    <div className="train-card__brand">
                        фирменный «{brandName}»
                    </div>
                )}

                {hasTwoFloor && (
                    <div className="train-card__two-floor">
                        «Двухэтажный состав»
                    </div>
                )}

                {comment && (
                    <div className="train-card__comment">
                        {comment}
                    </div>
                )}

                <div className="train-card__platform">
                    Платформа {platform}
                    {track && <span> · Путь {track}</span>}
                </div>
            </div>

            <div className="train-card__footer">
                <div className="train-card__transport-type">
                    {transportType}
                </div>

                <div className="train-card__details">
                    {arrivalTime && arrivalTime !== '--:--' && eventType === 'departure' && (
                        <div className="train-card__detail-item">
                            Прибытие: <b>{arrivalTime}</b>
                        </div>
                    )}

                    {duration && (
                        <div className="train-card__detail-item">
                            В пути: {duration}
                        </div>
                    )}

                    {stopCount > 0 && (
                        <div className="train-card__detail-item">
                            <div>Остановок: {stopCount}</div>
                            {stopCount <= 10 && passengerStops.length > 0 && (
                                <div className="train-card__stops-list">
                                    {passengerStops.slice(0, 5).map((stop, idx) => (
                                        <span key={stop.code || stop.id || idx} className="stop-item">
                                            {stop.title || stop.name}
                                            {idx < Math.min(passengerStops.length, 5) - 1 && ', '}
                                        </span>
                                    ))}
                                    {stopCount > 5 && (
                                        <span className="stops-more">
                                            ... и ещё {stopCount - 5}
                                        </span>
                                    )}
                                </div>
                            )}
                            {stopCount > 10 && (
                                <div className="train-card__stops-note">
                                    (много остановок)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getExpressTypeName(type) {
    if (!type) return '';

    const typeMap = {
        'express': 'Ласточка',
        'fast': 'Экспресс',
        'regional': 'Пригородный',
        'aero': 'Аэроэкспресс',
    };

    return typeMap[type] || type;
}

function formatDuration(minutes) {
    if (!minutes || isNaN(minutes)) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) {
        return `${h}ч ${m}м`;
    } else if (h > 0) {
        return `${h}ч`;
    } else {
        return `${m}м`;
    }
}