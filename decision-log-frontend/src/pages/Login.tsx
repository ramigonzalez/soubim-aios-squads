import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { safeRedirect } from '../lib/safeRedirect'
import { GoogleSignInButton } from '../components/organisms/GoogleSignInButton'

export function Login() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  // Story 12.5: come back to the invitation page after logging in (same-site paths only)
  const destination = safeRedirect(useSearchParams()[0].get('redirect'))
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data

      setAuth(user, access_token)
      navigate(destination)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      // Story 13.11: 429 = rate limited (the backend detail is English-only)
      setError(e?.response?.status === 429 ? t('login.rateLimited') : e?.response?.data?.detail || t('login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
      <div className="w-full max-w-md mx-4">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg mb-2 shadow-lg">
            <h1 className="text-3xl font-bold tracking-tight">DecisionLog</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">{t('login.tagline')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.email.label')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-medium transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder={t('login.email.placeholder')}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.password.label')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-medium transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder={t('login.password.placeholder')}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium flex items-start gap-2"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t('login.submitting')}
                </span>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>

          {/* Story 12.8: Sign in with Google (hidden when the server has it disabled) */}
          <div className="mt-5">
            <GoogleSignInButton redirect={destination} />
          </div>

          {/* Demo Info */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-600 text-center">
              <strong>{t('login.demo.title')}</strong>
            </p>
            <p className="text-xs text-slate-600 text-center mt-1">
              {t('login.demo.hint')}{' '}
              <code className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded font-mono font-bold">
                "password"
              </code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          {t('login.footer')}
        </p>
      </div>
    </div>
  )
}
