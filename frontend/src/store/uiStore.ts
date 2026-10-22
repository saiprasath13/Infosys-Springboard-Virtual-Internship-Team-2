import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // Mobile drawer
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMobileSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeMobileSidebar: () => set({ sidebarOpen: false }),
}));
