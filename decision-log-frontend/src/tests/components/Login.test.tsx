import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Login } from '../../pages/Login'
import * as apiModule from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Render helper that wraps component in Router
function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login Component', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth()
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /decisionlog/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('renders email input with correct attributes', () => {
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    expect(emailInput.type).toBe('email')
    expect(emailInput.placeholder).toBe('you@example.com')
  })

  it('renders password input with masking', () => {
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')
    expect(passwordInput.placeholder).toBe('••••••••')
  })

  it('renders demo mode note', () => {
    renderLogin()

    expect(screen.getByText(/demo:/i)).toBeInTheDocument()
    // Check for the demo password specifically (in code element)
    expect(screen.getByText('"password"')).toBeInTheDocument()
  })

  it('requires email field', async () => {
    renderLogin()

    const form = screen.getByRole('button', { name: /login/i }).closest('form') as HTMLFormElement
    expect(form.querySelector('input[type="email"]')).toHaveAttribute('required')
  })

  it('requires password field', async () => {
    renderLogin()

    const form = screen.getByRole('button', { name: /login/i }).closest('form') as HTMLFormElement
    expect(form.querySelector('input[type="password"]')).toHaveAttribute('required')
  })

  it('updates email input value on change', async () => {
    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    await user.type(emailInput, 'test@example.com')

    expect(emailInput.value).toBe('test@example.com')
  })

  it('updates password input value on change', async () => {
    renderLogin()
    const user = userEvent.setup()

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    await user.type(passwordInput, 'password123')

    expect(passwordInput.value).toBe('password123')
  })

  it('submits form with email and password', async () => {
    const mockApi = apiModule.default as any
    mockApi.post.mockResolvedValue({
      data: {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'director',
          projects: [],
        },
      },
    })

    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      })
    })
  })

  it('stores auth token and user on successful login', async () => {
    const mockApi = apiModule.default as any
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'director' as const,
      projects: [],
    }

    mockApi.post.mockResolvedValue({
      data: {
        access_token: 'test-token',
        token_type: 'bearer',
        user: testUser,
      },
    })

    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('test-token')
      expect(state.user).toEqual(testUser)
    })
  })

  it('displays loading state during form submission', async () => {
    const mockApi = apiModule.default as any
    mockApi.post.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i }) as HTMLButtonElement

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    // Check that button shows loading text
    expect(submitButton).toHaveTextContent(/logging in/i)
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on login failure', async () => {
    const mockApi = apiModule.default as any
    mockApi.post.mockRejectedValue({
      response: {
        status: 401,
        data: {
          detail: 'Invalid email or password',
        },
      },
    })

    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('displays generic error on network failure', async () => {
    const mockApi = apiModule.default as any
    mockApi.post.mockRejectedValue({
      response: undefined, // Network error
    })

    renderLogin()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it.skip('clears error message when user starts typing', async () => {
    const mockApi = apiModule.default as any
    mockApi.post.mockRejectedValue({
      response: {
        status: 401,
        data: {
          detail: 'Invalid email or password',
        },
      },
    })

    renderLogin()
    const user = userEvent.setup()

    // First, trigger an error
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })

    // Clear the input and type again
    await user.clear(emailInput)
    await user.type(emailInput, 'correct@example.com')

    // Error should be cleared
    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })

  it('prevents submission with empty email', async () => {
    const mockApi = apiModule.default as any
    renderLogin()

    const form = screen.getByRole('button', { name: /login/i }).closest('form') as HTMLFormElement

    // HTML5 form validation prevents submission
    expect((form.querySelector('input[type="email"]') as HTMLInputElement).required).toBe(true)
  })

  it('prevents submission with empty password', async () => {
    const mockApi = apiModule.default as any
    renderLogin()

    const form = screen.getByRole('button', { name: /login/i }).closest('form') as HTMLFormElement

    // HTML5 form validation prevents submission
    expect((form.querySelector('input[type="password"]') as HTMLInputElement).required).toBe(true)
  })

  it('button shows correct text states', async () => {
    const mockApi = apiModule.default as any
    // Add delay to API call so we can catch loading state
    mockApi.post.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'director',
            projects: [],
          },
        },
      }), 100))
    )

    renderLogin()
    const user = userEvent.setup()

    const submitButton = screen.getByRole('button', { name: /login/i })

    // Initially shows "Login"
    expect(submitButton).toHaveTextContent('Login')

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    // During submission shows "Logging in..."
    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/logging in/i)
    })
  })
})
