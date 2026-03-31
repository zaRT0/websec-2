import { useStore } from '../store/useStore';

export default function StationAutocomplete({
    stations,
    onSelect,
    containerId
}) {
    const { addFavorite } = useStore();

    if (!stations || stations.length === 0) {
        return null;
    }

    return (
        <div className={`autocomplete-results active`} id={containerId}>
            {stations.slice(0, 10).map((station, index) => (
                <div
                    key={station.code || index}
                    className="autocomplete-item"
                    onClick={() => onSelect(station)}
                >
                    <span className="autocomplete-item__name">
                        {station.title || station.station_name || 'Неизвестно'}
                    </span>
                    <span className="autocomplete-item__type">
                        {station.station_type || 'Станция'}
                    </span>
                </div>
            ))}
        </div>
    );
}