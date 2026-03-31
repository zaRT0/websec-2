import { useState, useRef } from 'react';
import { useStore } from './store/useStore';
import { apiService } from './services/api';
import Header from './components/Header';
import Tabs from './components/Tabs';
import SearchForm from './components/SearchForm';
import ScheduleList from './components/ScheduleList';
import MapModal from './components/MapModal';

function App() {
  const {
    currentTab,
    schedule,
    scheduleLoading,
    scheduleError,
    setSchedule,
    setScheduleLoading,
    setScheduleError,
    clearSchedule,
    eventType,
    favorites,
    selectedStation,
    setSelectedStation
  } = useStore();

  const [mapOpen, setMapOpen] = useState(false);
  const searchFormRef = useRef(null);

  const handleSearchComplete = async (stationCode, date, event, toStationCode = null) => {
    setScheduleLoading(true);
    setScheduleError(null);
    clearSchedule();

    try {
      let data;

      if (toStationCode) {
        data = await apiService.getRouteSchedule(stationCode, toStationCode, date);
      } else {
        data = await apiService.getStationSchedule(stationCode, date, event);
      }

      setSchedule(data);

      if (searchFormRef.current && selectedStation?.title) {
        searchFormRef.current.updateStationField?.(selectedStation.title);
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
      setScheduleError(error.response?.data?.message || 'Ошибка загрузки расписания');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleOpenMap = () => setMapOpen(true);
  const handleCloseMap = () => setMapOpen(false);

  return (
    <div className="app">
      <Header />

      <main className="main container">
        <section className="section" id="search">
          <h2 className="section__title"> Поиск расписания</h2>
          <Tabs />
          <SearchForm
            ref={searchFormRef}
            onSearchComplete={handleSearchComplete}
            onOpenMap={handleOpenMap}
          />
        </section>

        {(schedule || scheduleLoading || scheduleError) && (
          <section className="section">
            <h2 className="section__title"> Расписание</h2>
            <ScheduleList
              schedule={schedule}
              loading={scheduleLoading}
              error={scheduleError}
              eventType={eventType}
            />
          </section>
        )}

        <section className="section" id="favorites">
          <h2 className="section__title"> Избранное</h2>
          {favorites && favorites.length > 0 ? (
            <div className="favorites-list">
              {favorites.map((station, index) => (
                <div key={station.code || index} className="favorite-card">
                  <div className="favorite-card__name">{station.name || station.title}</div>
                  <div className="favorite-card__type">{station.type || 'Станция'}</div>
                  <div className="favorite-card__actions">
                    <button
                      className="favorite-card__btn favorite-card__btn--view"
                      onClick={() => {
                        setSelectedStation({ code: station.code, title: station.name });
                        handleSearchComplete(station.code, new Date().toISOString().split('T')[0], 'departure');
                      }}
                    >
                      Показать
                    </button>
                    <button
                      className="favorite-card__btn favorite-card__btn--remove"
                      onClick={() => useStore.getState().removeFavorite(index)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty__icon">📭</span>
              <span className="empty__text">Нет избранных станций</span>
            </div>
          )}
        </section>

        <section className="section" id="about">
          <h2 className="section__title">О сервисе</h2>
          <div className="about__content">
            <p>Сервис для поиска расписания пригородных поездов по станциям России.</p>
            <ul className="about__features">
              <li>Поиск по названию станции</li>
              <li>Поиск по маршруту между станциями</li>
              <li>Поиск ближайших станций на карте</li>
              <li>Сохранение избранных станций</li>
              <li>Адаптивный дизайн</li>
            </ul>
            <div className="about__note">
              <p><strong>Данные:</strong> Яндекс.Расписания API</p>
            </div>
          </div>
        </section>
      </main>

      <MapModal
        isOpen={mapOpen}
        onClose={handleCloseMap}
        onStationSelect={handleSearchComplete}
        searchFormRef={searchFormRef}
      />

      <footer className="footer">
        <div className="footer__container">
          <p className="footer__text">© 2025 Электрички РФ. Учебный проект.</p>
          <p className="footer__note">
            Данные: <a href="https://yandex.ru/dev/rasp/" target="_blank" rel="noopener noreferrer">Яндекс.Расписания API</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;