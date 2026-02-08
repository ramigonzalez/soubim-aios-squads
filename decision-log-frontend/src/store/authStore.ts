import { create } from 'zustand'
import { User } from '../types/auth'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  initializeFromStorage: () => void
}

// Helper to get stored user data
function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('auth_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// Helper to get stored token
function getStoredToken(): string | null {
  return localStorage.getItem('access_token') || null
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    // Store both token and user object
    localStorage.setItem('access_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: () => {
    // Clear both token and user data
    localStorage.removeItem('access_token')
    localStorage.removeItem('auth_user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  // Initialize auth state from localStorage
  // Call this on app startup (in App.tsx useEffect)
  initializeFromStorage: () => {
    const storedToken = getStoredToken()
    const storedUser = getStoredUser()

    if (storedToken && storedUser) {
      set({ token: storedToken, user: storedUser, isAuthenticated: true })
    }
  },
}))
