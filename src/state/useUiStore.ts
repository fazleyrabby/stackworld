import { create } from 'zustand';

const COACH_DISMISSED_KEY = 'stackworld.coach-dismissed';

interface UiState {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  isEventLogOpen: boolean;
  activeInspectorTab: 'metrics' | 'config' | 'logs';
  isCoachOpen: boolean;

  setSelectedEntityId: (id: string | null) => void;
  setHoveredEntityId: (id: string | null) => void;
  toggleEventLog: () => void;
  setEventLogOpen: (open: boolean) => void;
  setActiveInspectorTab: (tab: 'metrics' | 'config' | 'logs') => void;
  setCoachOpen: (open: boolean) => void;
  dismissCoach: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedEntityId: 'server-prod-1', // Pre-select server on load
  hoveredEntityId: null,
  isEventLogOpen: false,
  activeInspectorTab: 'metrics',
  // Show the onboarding guide automatically on first visit only.
  isCoachOpen: typeof window === 'undefined' ? false : localStorage.getItem(COACH_DISMISSED_KEY) !== '1',

  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  toggleEventLog: () => set((state) => ({ isEventLogOpen: !state.isEventLogOpen })),
  setEventLogOpen: (open) => set({ isEventLogOpen: open }),
  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),
  setCoachOpen: (open) => set({ isCoachOpen: open }),
  dismissCoach: () => {
    try {
      localStorage.setItem(COACH_DISMISSED_KEY, '1');
    } catch {
      /* storage unavailable */
    }
    set({ isCoachOpen: false });
  },
}));
