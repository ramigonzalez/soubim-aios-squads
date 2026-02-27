import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import IngestionApproval from '../components/organisms/IngestionApproval'

export default function Ingestion() {
  const { user } = useAuthStore()

  if (!user || user.role !== 'director') {
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
