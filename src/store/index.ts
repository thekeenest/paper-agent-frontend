import { create } from 'zustand'
import type { TaskStatusResponse, TaskProgress, AnalyticsData } from '@/types/api'

interface TaskState {
  // Active task tracking
  activeTaskId: string | null
  taskStatus: TaskStatusResponse | null
  taskProgress: TaskProgress | null
  analytics: AnalyticsData | null
  
  // WebSocket
  wsConnected: boolean
  
  // Actions
  setActiveTask: (taskId: string | null) => void
  setTaskStatus: (status: TaskStatusResponse | null) => void
  setTaskProgress: (progress: TaskProgress | null) => void
  setAnalytics: (analytics: AnalyticsData | null) => void
  setWsConnected: (connected: boolean) => void
  reset: () => void
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTaskId: null,
  taskStatus: null,
  taskProgress: null,
  analytics: null,
  wsConnected: false,
  
  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  setTaskStatus: (status) => set({ taskStatus: status }),
  setTaskProgress: (progress) => set({ taskProgress: progress }),
  setAnalytics: (analytics) => set({ analytics }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  reset: () => set({
    activeTaskId: null,
    taskStatus: null,
    taskProgress: null,
    analytics: null,
    wsConnected: false,
  }),
}))

// Theme store
interface ThemeState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    return { theme: newTheme }
  }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
}))
