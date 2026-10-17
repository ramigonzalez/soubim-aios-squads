import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useActiveOrganization } from '../hooks/useOrganizations'
import IngestionInbox from './IngestionInbox'

/**
 * Ingestion queue. Story 12.7: open to organization owners/admins/reviewers (organization roles, not the
 * legacy `users.role`); the actions on each source follow its `can_review` / `can_manage` from the API.
 * Story 13.16: Fathom webhook meetings without a project are rows of the Pendentes table (no separate box).
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
    <IngestionInbox />
  )
}
