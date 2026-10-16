/**
 * 404 for unknown addresses: says what happened in plain words and offers one way on —
 * the projects when signed in, otherwise "Entrar".
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../design-system'
import { AuthShell } from '../components/templates/AuthShell'
import { useAuthStore } from '../store/authStore'

export default function NotFound() {
  const { t } = useTranslation('common')
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return (
    <AuthShell title={t('notFound.title')} description={t('notFound.text')}>
      <p className="font-mono text-mono-sm text-ink-3">{t('notFound.code')}</p>
      <Button asChild variant="primary" size="lg" className="w-full">
        <Link to={isAuthenticated ? '/projects' : '/login'}>{isAuthenticated ? t('notFound.projects') : t('notFound.login')}</Link>
      </Button>
    </AuthShell>
  )
}
