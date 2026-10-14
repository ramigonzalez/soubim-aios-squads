import axios, { AxiosInstance, AxiosError } from 'axios'
import { ACTIVE_ORGANIZATION_KEY } from '../store/organizationStore'
import { isOrganizationBlocked } from '../lib/organizationBlocked'

const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Story 12.5: active organization (the backend checks membership; 403 if not a member)
  const organizationId = localStorage.getItem(ACTIVE_ORGANIZATION_KEY)
  if (organizationId) {
    config.headers['X-Organization-Id'] = organizationId
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (isOrganizationBlocked(error) && error.config?.url !== '/auth/login') {
      // Story 12.13: the session ends; the login page shows "conta suspensa"
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem(ACTIVE_ORGANIZATION_KEY)
      window.location.href = '/login?blocked=1'
    } else if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem(ACTIVE_ORGANIZATION_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
