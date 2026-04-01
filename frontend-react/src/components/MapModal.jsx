import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import { getSourceOfVectorLayerByName } from '../utils/layerHelpers';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat as olToLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Overlay from 'ol/Overlay';

export default function MapModal({ isOpen, onClose, onStationSelect }) {
    const mapContainerRef = useRef(null);
    const popupRef = useRef(null);
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStation, setSelectedStationLocal] = useState(null);
    const [popupPosition, setPopupPosition] = useState(null);

    const {
        setSelectedStation,
        addFavorite
    } = useStore();

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const vectorSource = new VectorSource();
        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                image: new CircleStyle({
                    radius: 8,
                    fill: new Fill({ color: '#00B4DB' }),
                    stroke: new Stroke({ color: 'white', width: 2 })
                })
            })
        });

        vectorLayer.set('name', 'stations-layer');

        const newMap = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat([37.6173, 55.7558]),
                zoom: 10,
            }),
        });

        mapRef.current = newMap;
        setMap(newMap);

        newMap.on('pointermove', (e) => {
            const feature = newMap.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (feature) {
                const name = feature.get('name');
                mapContainerRef.current.style.cursor = 'pointer';
                mapContainerRef.current.title = name || '';
            } else {
                mapContainerRef.current.style.cursor = '';
                mapContainerRef.current.title = '';
            }
        });

        const popupElement = document.createElement('div');
        popupElement.className = 'map-popup';
        popupElement.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            min-width: 200px;
            z-index: 1000;
        `;

        const popup = new Overlay({
            element: popupElement,
            offset: [0, -10],
            positioning: 'bottom-center',
            stopEvent: true,
        });
        newMap.addOverlay(popup);
        popupRef.current = popup;

        newMap.on('click', (e) => {
            const clickedFeature = newMap.forEachFeatureAtPixel(e.pixel, (f) => f);

            if (clickedFeature) {
                const station = clickedFeature.get('stationData');
                if (station) {
                    setSelectedStationLocal(station);
                    setPopupPosition(e.coordinate);
                    popup.setPosition(e.coordinate);

                    popupElement.innerHTML = `
                        <div style="font-weight:700;margin-bottom:12px;font-size:15px;">${station.title}</div>
                        <div style="font-size:12px;color:#666;margin-bottom:12px;">${station.station_type || 'Станция'}</div>
                        <div style="display:flex;gap:8px;">
                            <button class="popup-btn-primary" style="flex:1;padding:10px 16px;background:#00B4DB;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">🔍 Расписание</button>
                            <button class="popup-btn-favorite" style="padding:10px 16px;background:#FF9800;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">⭐</button>
                        </div>
                    `;

                    popupElement.querySelector('.popup-btn-primary').onclick = () => handleShowSchedule(station);
                    popupElement.querySelector('.popup-btn-favorite').onclick = () => handleAddFavorite(station);
                }
                return;
            }

            const coord = e.coordinate;
            const lonLat = olToLonLat(coord);

            setLoading(true);
            popup.setPosition(undefined);
            setSelectedStationLocal(null);

            apiService.searchStationsByCoords(lonLat[1], lonLat[0], 50)
                .then((data) => {
                    setStations(data.stations || []);

                    const vectorSource = getSourceOfVectorLayerByName(newMap, 'stations-layer');
                    if (vectorSource) {
                        vectorSource.clear();

                        (data.stations || []).forEach((station) => {
                            const lng = station.lng || station.lon;
                            const lat = station.lat;
                            if (!lng || !lat) return;

                            const feature = new Feature({
                                geometry: new Point(fromLonLat([lng, lat])),
                                name: station.title,
                                code: station.code,
                            });
                            feature.set('stationData', station);
                            vectorSource.addFeature(feature);
                        });

                        if (data.stations?.length > 0) {
                            const extent = vectorSource.getExtent();
                            newMap.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 14 });
                        }
                    }
                })
                .catch((error) => console.error('Ошибка:', error))
                .finally(() => setLoading(false));
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(null);
                mapRef.current = null;
            }
        };
    }, [isOpen]);

    const handleShowSchedule = (station) => {
        setSelectedStation(station);
        onClose();

        if (onStationSelect) {
            const today = new Date().toISOString().split('T')[0];
            onStationSelect(station.code, today, 'departure');
        }
    };

    const handleAddFavorite = (station) => {
        addFavorite({
            code: station.code,
            name: station.title,
            type: station.station_type || 'Станция'
        });
    };

    const handleSelectFromList = (station) => handleShowSchedule(station);

    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal__overlay" onClick={onClose}></div>
            <div className="modal__content modal__content--wide">
                <button className="modal__close" onClick={onClose}>✕</button>
                <h2 className="modal__title">🗺️ Карта станций</h2>

                <div className="modal__body">
                    <p className="modal__text">Кликните по карте чтобы найти ближайшие станции</p>

                    <div
                        ref={mapContainerRef}
                        className="map-container"
                        style={{ height: '450px', width: '100%' }}
                        title=""
                    ></div>

                    {loading && <div className="loader"><div className="loader__spinner"></div></div>}

                    {stations.length > 0 && (
                        <div className="coords-results">
                            <h3 style={{ marginBottom: '16px' }}>Найдено станций: {stations.length}</h3>
                            <div className="schedule-list">
                                {stations.slice(0, 10).map((station, index) => {
                                    const lng = station.lng || station.lon;
                                    const lat = station.lat;
                                    if (!lng || !lat || !station.title) return null;

                                    return (
                                        <div
                                            key={station.code || index}
                                            className="train-card"
                                            onClick={() => handleSelectFromList(station)}
                                            title={station.title}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="train-card__direction">{station.title}</div>
                                            <div className="train-card__type">{station.station_type || 'Станция'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}