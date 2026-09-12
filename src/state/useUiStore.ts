import { create } from 'zustand';

interface UiState {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  isEventLogOpen: boolean;
  activeInspectorTab: 'metrics' | 'config' | 'logs';

  setSelectedEntityId: (id: string | null) => void;
  setHoveredEntityId: (id: string | null) => void;
  toggleEventLog: () => void;
  setEventLogOpen: (open: boolean) => void;
  setActiveInspectorTab: (tab: 'metrics' | 'config' | 'logs') => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedEntityId: 'server-prod-1', // Pre-select server on load
  hoveredEntityId: null,
  isEventLogOpen: false,
  activeInspectorTab: 'metrics',

  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  toggleEventLog: () => set((state) => ({ isEventLogOpen: !state.isEventLogOpen })),
  setEventLogOpen: (open) => set({ isEventLogOpen: open }),
  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),
}));
