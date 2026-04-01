import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            currentTab: 'station',

            selectedStation: null,

            routeFrom: null,
            routeTo: null,

            favorites: [],

            schedule: null,
            scheduleLoading: false,
            scheduleError: null,
            eventType: 'departure',

            setCurrentTab: (tab) => set({ currentTab: tab }),

            setSelectedStation: (station) => set({ selectedStation: station }),

            setRouteFrom: (station) => set({ routeFrom: station }),
            setRouteTo: (station) => set({ routeTo: station }),

            addFavorite: (station) => set((state) => ({
                favorites: [...state.favorites, station]
            })),

            removeFavorite: (index) => set((state) => ({
                favorites: state.favorites.filter((_, i) => i !== index)
            })),

            setSchedule: (data) => set({ schedule: data }),
            setScheduleLoading: (loading) => set({ scheduleLoading: loading }),
            setScheduleError: (error) => set({ scheduleError: error }),
            clearSchedule: () => set({
                schedule: null,
                scheduleLoading: false,
                scheduleError: null
            }),

            setEventType: (type) => set({ eventType: type }),
        }),
        {
            name: 'electric-storage',
            partialize: (state) => ({
                favorites: state.favorites
            })
        }
    )
);