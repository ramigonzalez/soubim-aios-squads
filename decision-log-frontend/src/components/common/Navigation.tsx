import { Fragment } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import { ingestionService } from '../../services/ingestionService'
import { LogOut, Home } from 'lucide-react'

/**
 * Navigation bar component with logout button and breadcrumbs.
 */
export function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  // Determine breadcrumbs based on current route
  const getBreadcrumbs = () => {
    const path = location.pathname
    const segments = path.split('/').filter(Boolean)

    const breadcrumbs = [
      { label: 'Home', href: '/projects' },
    ]

    if (segments.includes('projects') && segments.length > 1) {
      breadcrumbs.push({ label: 'Projects', href: '/projects' })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-blue-600">DecisionLog</h1>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                {index > 0 && <span className="text-gray-400">/</span>}
                <button
                  onClick={() => navigate(crumb.href)}
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  {index === 0 ? <Home className="w-4 h-4" /> : crumb.label}
                </button>
              </Fragment>
            ))}
          </div>

          {/* Ingestion Link (admin only) */}
          {user?.role === 'director' && <IngestionNavLink />}

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            {/* User Name */}
            {user && (
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function IngestionNavLink() {
  const { data } = useQuery('ingestion-pending-count', ingestionService.getPendingCount, {
    staleTime: 30_000,
  })

  const pendingCount = data?.pending ?? 0

  return (
    <Link
      to="/ingestion"
      className="flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition"
    >
      Ingestion
      {pendingCount > 0 && (
        <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {pendingCount}
        </span>
      )}
    </Link>
  )
}
