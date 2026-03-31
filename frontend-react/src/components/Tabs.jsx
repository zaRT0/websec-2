import { useStore } from '../store/useStore';

export default function Tabs() {
    const { currentTab, setCurrentTab } = useStore();

    return (
        <div className="tabs">
            <button
                className={`tab__button ${currentTab === 'station' ? 'tab__button--active' : ''}`}
                onClick={() => setCurrentTab('station')}
            >
                По станции
            </button>
            <button
                className={`tab__button ${currentTab === 'route' ? 'tab__button--active' : ''}`}
                onClick={() => setCurrentTab('route')}
            >
                По маршруту
            </button>
        </div>
    );
}