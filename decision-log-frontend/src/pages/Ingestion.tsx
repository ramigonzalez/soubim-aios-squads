import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useActiveOrganization } from '../hooks/useOrganizations'
import IngestionApproval from '../components/organisms/IngestionApproval'

/**
 * Ingestion queue. Story 12.7: open to organization owners/admins/reviewers (organization roles, not the
 * legacy `users.role`); the actions on each source follow its `can_review` / `can_manage` from the API.
 */
export default function Ingestion() {
  const { user } = useAuthStore()
  const { canReviewSomewhere, isLoading } = useActiveOrganization()

  if (!user) {
    return <Navigate to="/" replace />
  }
  if (isLoading) return null
  if (!canReviewSomewhere) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IngestionApproval />
      </div>
    </main>
  )
}
