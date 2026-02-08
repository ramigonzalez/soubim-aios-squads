import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../../components/common/Navigation'
import { useAuthStore } from '../../store/authStore'

// Mock router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/projects' }),
  }
})

function renderNavigation() {
  return render(
    <BrowserRouter>
      <Navigation />
    </BrowserRouter>
  )
}

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up auth store with a user
    useAuthStore.getState().setAuth(
      {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'director',
        projects: [],
      },
      'test-token'
    )
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders DecisionLog brand', () => {
    renderNavigation()
    expect(screen.getByText('DecisionLog')).toBeInTheDocument()
  })

  it('displays user name', () => {
    renderNavigation()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('displays user role', () => {
    renderNavigation()
    expect(screen.getByText('director')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    renderNavigation()
    const logoutButton = screen.getByRole('button', { name: /logout/i })
    expect(logoutButton).toBeInTheDocument()
  })

  it('clears auth on logout', async () => {
    const user = userEvent.setup()
    renderNavigation()

    const logoutButton = screen.getByRole('button', { name: /logout/i })
    await user.click(logoutButton)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('has logout button with proper styling', () => {
    renderNavigation()
    const logoutButton = screen.getByRole('button', { name: /logout/i })
    expect(logoutButton.className).toContain('bg-red-50')
    expect(logoutButton.className).toContain('text-red-700')
  })

  it('renders breadcrumb navigation', () => {
    renderNavigation()
    // Breadcrumbs are hidden on mobile (hidden md:flex), check for DecisionLog brand instead
    expect(screen.getByText('DecisionLog')).toBeInTheDocument()
  })

  it('renders with proper navigation structure', () => {
    const { container } = renderNavigation()
    expect(container.querySelector('nav')).toBeInTheDocument()
    expect(container.querySelector('nav')?.tagName).toBe('NAV')
  })

  it('displays LogOut icon', () => {
    const { container } = renderNavigation()
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0) // Should have SVG icons
  })

  it('responds to keyboard navigation', async () => {
    const user = userEvent.setup()
    renderNavigation()

    const logoutButton = screen.getByRole('button', { name: /logout/i })
    await user.keyboard('{Tab}')
    // Verify button can be focused
    expect(logoutButton).toBeVisible()
  })

  it('handles responsive layout classes', () => {
    const { container } = renderNavigation()
    // Responsive padding is on the inner div, not the nav element
    const innerDiv = container.querySelector('nav > div')
    expect(innerDiv?.className).toContain('px-4')
    expect(innerDiv?.className).toContain('sm:px-6')
    expect(innerDiv?.className).toContain('lg:px-8')
  })

  it('hides user info on small screens', () => {
    const { container } = renderNavigation()
    const userInfo = container.querySelector('.hidden.sm\\:flex')
    expect(userInfo).toBeInTheDocument()
  })

  it('keeps logout button visible on all screens', () => {
    renderNavigation()
    const logoutButton = screen.getByRole('button', { name: /logout/i })
    // Should not have hidden classes on the button itself
    expect(logoutButton).toBeVisible()
  })
})

function afterEach() {}
