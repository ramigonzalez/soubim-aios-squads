import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import ChangePassword from '../../pages/ChangePassword'
import api from '../../services/api'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function fill(current: string, next: string, confirm = next) {
  await userEvent.type(screen.getByLabelText('Current password'), current)
  await userEvent.type(screen.getByLabelText('New password'), next)
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePassword (Story 12.13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('changes the password and shows a success message', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: null })
    setup()
    await fill('old-password', 'new-password-1')
    expect(post).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'old-password',
      new_password: 'new-password-1',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it.each([
    ['old-password', 'new-password-1', 'other-password', 'The confirmation does not match the new password.'],
    ['old-password', 'short', 'short', 'The new password needs at least 8 characters.'],
    ['same-password', 'same-password', 'same-password', 'The new password must be different from the current one.'],
  ])('validates the form before calling the API (%s → %s)', async (current, next, confirm, message) => {
    const post = vi.spyOn(api, 'post')
    setup()
    await fill(current, next, confirm)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    [400, 'invalid_current_password', 'The current password is incorrect.'],
    [400, 'no_password_set', 'Your account signs in with Google and has no password.'],
    [400, 'password_too_long', 'The new password is too long.'],
    [429, 'Too many requests', 'Too many attempts.'],
    [500, 'boom', 'Could not change the password.'],
  ])('maps the API answer %s %s to a message', async (status, detail, message) => {
    vi.spyOn(api, 'post').mockRejectedValue({ response: { status, data: { detail } } })
    setup()
    await fill('old-password', 'new-password-1')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
