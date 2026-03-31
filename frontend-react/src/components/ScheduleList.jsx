import TrainCard from './TrainCard';
import Loader from './Loader';

export default function ScheduleList({ schedule, loading, error, eventType }) {
    const trains = schedule?.schedule || schedule?.segments || [];

    if (loading) {
        return <Loader text="Загрузка расписания..." />;
    }

    if (error) {
        return (
            <div className="error-message">
                <span className="error__icon">⚠️</span>
                <span className="error__text">{error}</span>
            </div>
        );
    }

    if (!trains || trains.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty__icon">📭</span>
                <span className="empty__text">Расписание не найдено</span>
            </div>
        );
    }

    return (
        <div className="schedule-list">
            {trains.map((train, index) => (
                <TrainCard
                    key={train.id || train.uid || index}
                    train={train}
                    eventType={eventType}
                />
            ))}
        </div>
    );
}