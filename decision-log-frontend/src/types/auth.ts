export interface User {
  id: string
  email: string
  name: string
  role: 'director' | 'architect' | 'client'
  projects?: string[]
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
