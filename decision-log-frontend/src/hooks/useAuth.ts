import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    clearAuth,
  }
}
