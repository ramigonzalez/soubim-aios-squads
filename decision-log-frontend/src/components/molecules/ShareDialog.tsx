/**
 * ShareDialog — Share link management dialog for Milestone Timeline (Story 8.4).
 *
 * Uses Radix Dialog for accessible modal behavior.
 * Allows admins to generate, copy, and revoke share links.
 */

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Copy, Check, Link2, Trash2, Eye, Loader2 } from 'lucide-react'
import {
  useShareLinks,
  useCreateShareLink,
  useRevokeShareLink,
} from '../../hooks/useSharedLinks'

interface ShareDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ projectId, open, onOpenChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const { data, isLoading } = useShareLinks(projectId)
  const createMutation = useCreateShareLink(projectId)
  const revokeMutation = useRevokeShareLink(projectId)

  const activeLink = data?.links?.[0] ?? null

  const handleGenerate = async () => {
    try {
      await createMutation.mutateAsync(30)
    } catch (error) {
      console.error('Error generating share link:', error)
    }
  }

  const handleCopy = async () => {
    if (!activeLink) return
    const url = `${window.location.origin}/shared/milestones/${activeLink.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleRevoke = async () => {
    if (!activeLink) return
    try {
      await revokeMutation.mutateAsync(activeLink.share_token)
      setConfirmRevoke(false)
    } catch (error) {
      console.error('Error revoking share link:', error)
    }
  }

  const formatExpiration = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50 focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Share Milestone Timeline
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 p-1 rounded">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-gray-600 mb-4">
            Generate a read-only link to share the milestone timeline with clients and providers.
          </Dialog.Description>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : activeLink ? (
            /* Active link exists */
            <div className="space-y-4">
              {/* Link URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
                  <Link2 className="w-4 h-4 inline mr-1 text-gray-400" />
                  {`${window.location.origin}/shared/milestones/${activeLink.share_token}`}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Expires on {formatExpiration(activeLink.expires_at)}</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Viewed {activeLink.view_count} time{activeLink.view_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Revoke */}
              {confirmRevoke ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700 mb-2">
                    Are you sure? This will immediately invalidate the shared link.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRevoke}
                      disabled={revokeMutation.isLoading}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {revokeMutation.isLoading ? 'Revoking...' : 'Yes, revoke'}
                    </button>
                    <button
                      onClick={() => setConfirmRevoke(false)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRevoke(true)}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Revoke Link
                </button>
              )}
            </div>
          ) : (
            /* No active link */
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">
                No active share link. Generate one to share the milestone timeline.
              </p>
              <button
                onClick={handleGenerate}
                disabled={createMutation.isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {createMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Generate Link
                  </>
                )}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
