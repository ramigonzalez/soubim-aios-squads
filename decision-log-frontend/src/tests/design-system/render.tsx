import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { afterAll, beforeAll } from 'vitest'
import i18n from '../../i18n'
import { ToastProvider, TooltipProvider } from '../../design-system'

/** Design-system tests assert pt-BR, the product's primary language (REVAMP-MAPPING §6.1 #6). */
export function usePortuguese() {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR')
  })
  afterAll(async () => {
    await i18n.changeLanguage('en')
  })
}

export function renderUi(ui: ReactElement) {
  return render(
    <TooltipProvider>
      <ToastProvider>{ui}</ToastProvider>
    </TooltipProvider>,
  )
}
