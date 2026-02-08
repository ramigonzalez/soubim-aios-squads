import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { User } from '../../types/auth'

describe('Auth Store (Zustand)', () => {
  const testUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'director',
    projects: ['proj-1', 'proj-2'],
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset auth store to initial state
    useAuthStore.getState().clearAuth()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('initializes with null user and token', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setAuth()', () => {
    it('sets user and token', () => {
      const token = 'test-token-123'
      useAuthStore.getState().setAuth(testUser, token)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(testUser)
      expect(state.token).toEqual(token)
      expect(state.isAuthenticated).toBe(true)
    })

    it('stores token in localStorage', () => {
      const token = 'test-token-123'
      useAuthStore.getState().setAuth(testUser, token)

      expect(localStorage.getItem('access_token')).toBe(token)
    })

    it('stores user object in localStorage', () => {
      const token = 'test-token-123'
      useAuthStore.getState().setAuth(testUser, token)

      const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      expect(storedUser).toEqual(testUser)
    })

    it('sets isAuthenticated to true', () => {
      useAuthStore.getState().setAuth(testUser, 'token')

      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('overwrites previous user and token', () => {
      const firstToken = 'token-1'
      const secondToken = 'token-2'
      const secondUser: User = {
        id: 'user-456',
        email: 'another@example.com',
        name: 'Another User',
        role: 'architect',
        projects: [],
      }

      useAuthStore.getState().setAuth(testUser, firstToken)
      useAuthStore.getState().setAuth(secondUser, secondToken)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(secondUser)
      expect(state.token).toEqual(secondToken)
      expect(localStorage.getItem('access_token')).toBe(secondToken)
    })
  })

  describe('clearAuth()', () => {
    it('clears user and token', () => {
      useAuthStore.getState().setAuth(testUser, 'test-token')
      useAuthStore.getState().clearAuth()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('removes token from localStorage', () => {
      useAuthStore.getState().setAuth(testUser, 'test-token')
      useAuthStore.getState().clearAuth()

      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('removes user from localStorage', () => {
      useAuthStore.getState().setAuth(testUser, 'test-token')
      useAuthStore.getState().clearAuth()

      expect(localStorage.getItem('auth_user')).toBeNull()
    })

    it('sets isAuthenticated to false', () => {
      useAuthStore.getState().setAuth(testUser, 'test-token')
      useAuthStore.getState().clearAuth()

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('initializeFromStorage()', () => {
    it('restores user and token from localStorage', () => {
      // Manually set localStorage
      const token = 'stored-token'
      localStorage.setItem('access_token', token)
      localStorage.setItem('auth_user', JSON.stringify(testUser))

      // Call initialize
      useAuthStore.getState().initializeFromStorage()

      const state = useAuthStore.getState()
      expect(state.token).toBe(token)
      expect(state.user).toEqual(testUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('does nothing when localStorage is empty', () => {
      useAuthStore.getState().initializeFromStorage()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('does not authenticate if only token exists', () => {
      localStorage.setItem('access_token', 'token-only')

      useAuthStore.getState().initializeFromStorage()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
    })

    it('does not authenticate if only user exists', () => {
      localStorage.setItem('auth_user', JSON.stringify(testUser))

      useAuthStore.getState().initializeFromStorage()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })

    it('handles corrupted user JSON gracefully', () => {
      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('auth_user', 'invalid json')

      expect(() => {
        useAuthStore.getState().initializeFromStorage()
      }).not.toThrow()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('Store Persistence', () => {
    it('persists across multiple getState calls', () => {
      const token = 'persistent-token'
      useAuthStore.getState().setAuth(testUser, token)

      // Get state multiple times
      const state1 = useAuthStore.getState()
      const state2 = useAuthStore.getState()

      expect(state1.user).toEqual(state2.user)
      expect(state1.token).toEqual(state2.token)
      expect(state1.isAuthenticated).toBe(state2.isAuthenticated)
    })

    it('survives multiple setAuth/clearAuth cycles', () => {
      for (let i = 0; i < 3; i++) {
        useAuthStore.getState().setAuth(testUser, `token-${i}`)
        expect(useAuthStore.getState().isAuthenticated).toBe(true)

        useAuthStore.getState().clearAuth()
        expect(useAuthStore.getState().isAuthenticated).toBe(false)
      }
    })
  })

  describe('Different User Roles', () => {
    it('stores director role correctly', () => {
      const directorUser: User = { ...testUser, role: 'director' }
      useAuthStore.getState().setAuth(directorUser, 'token')

      expect(useAuthStore.getState().user?.role).toBe('director')
    })

    it('stores architect role correctly', () => {
      const architectUser: User = { ...testUser, role: 'architect' }
      useAuthStore.getState().setAuth(architectUser, 'token')

      expect(useAuthStore.getState().user?.role).toBe('architect')
    })

    it('stores client role correctly', () => {
      const clientUser: User = { ...testUser, role: 'client' }
      useAuthStore.getState().setAuth(clientUser, 'token')

      expect(useAuthStore.getState().user?.role).toBe('client')
    })
  })

  describe('localStorage Integration', () => {
    it('stores token with correct key', () => {
      useAuthStore.getState().setAuth(testUser, 'my-token')

      expect(localStorage.getItem('access_token')).toBe('my-token')
    })

    it('stores user with correct key', () => {
      useAuthStore.getState().setAuth(testUser, 'token')

      const stored = localStorage.getItem('auth_user')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toEqual(testUser)
    })

    it('properly formats user JSON in localStorage', () => {
      useAuthStore.getState().setAuth(testUser, 'token')

      const stored = localStorage.getItem('auth_user')
      expect(() => JSON.parse(stored!)).not.toThrow()

      const parsed = JSON.parse(stored!)
      expect(parsed.id).toBe(testUser.id)
      expect(parsed.email).toBe(testUser.email)
      expect(parsed.projects).toEqual(testUser.projects)
    })
  })

  describe('Use Cases', () => {
    it('simulates complete login flow', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      // Login
      useAuthStore.getState().setAuth(testUser, 'token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user?.email).toBe(testUser.email)
      expect(localStorage.getItem('access_token')).toBe('token')

      // Logout
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('simulates page refresh with persistent session', () => {
      // Initial login
      useAuthStore.getState().setAuth(testUser, 'persistent-token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Simulate page refresh (reset store state without clearing localStorage)
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false })

      // Verify store was reset but localStorage persists
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(localStorage.getItem('access_token')).toBe('persistent-token')

      // App startup - restore from localStorage
      useAuthStore.getState().initializeFromStorage()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(testUser)
      expect(state.token).toBe('persistent-token')
    })

    it('simulates switching users', () => {
      const user1: User = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'director',
        projects: [],
      }

      const user2: User = {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'architect',
        projects: [],
      }

      // Login as user 1
      useAuthStore.getState().setAuth(user1, 'token-1')
      expect(useAuthStore.getState().user?.id).toBe('user-1')

      // Logout
      useAuthStore.getState().clearAuth()

      // Login as user 2
      useAuthStore.getState().setAuth(user2, 'token-2')
      expect(useAuthStore.getState().user?.id).toBe('user-2')
      expect(localStorage.getItem('access_token')).toBe('token-2')
    })
  })
})
