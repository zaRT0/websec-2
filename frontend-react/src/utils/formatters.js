export function formatTime(isoTime) {
    if (!isoTime) return '--:--';

    const date = new Date(isoTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

export const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function getExpressTypeName(type) {
    if (!type) return '';

    const typeMap = {
        'express': 'Ласточка',
        'fast': 'Экспресс',
        'regional': 'Пригородный',
        'aero': 'Аэроэкспресс',
    };

    return typeMap[type] || type;
}

export function formatDuration(minutes) {
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