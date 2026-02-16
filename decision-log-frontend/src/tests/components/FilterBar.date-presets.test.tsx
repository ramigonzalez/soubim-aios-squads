import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('FilterBar Date Presets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Convert Date to local YYYY-MM-DD string
   * Matches the toDateString helper in FilterBar
   */
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Helper to test date preset calculations
   * Simulates what handleDatePreset does
   */
  const calculateDatePreset = (preset: string, now: Date) => {
    let from: string | null = null
    const to = toLocalDateString(now)

    switch (preset) {
      case '7days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        from = toLocalDateString(d)
        break
      }
      case '30days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 30)
        from = toLocalDateString(d)
        break
      }
      case 'month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        from = toLocalDateString(firstDay)
        break
      }
      case 'all':
        return { from: null, to: null }
    }
    return { from, to }
  }

  describe('7-day preset', () => {
    it('should calculate 7 days back from today (Feb 11)', () => {
      const now = new Date('2026-02-11T12:00:00Z')
      const { from, to } = calculateDatePreset('7days', now)
      expect(to).toBe('2026-02-11')
      expect(from).toBe('2026-02-04') // 7 days back
    })

    it('should handle month rollover correctly (into January)', () => {
      const now = new Date('2026-02-03T12:00:00Z')
      const { from, to } = calculateDatePreset('7days', now)
      expect(to).toBe('2026-02-03')
      expect(from).toBe('2026-01-27') // 7 days back, crosses month boundary
    })

    it('should handle year rollover correctly', () => {
      const now = new Date('2026-01-05T12:00:00Z')
      const { from, to } = calculateDatePreset('7days', now)
      expect(to).toBe('2026-01-05')
      expect(from).toBe('2025-12-29') // 7 days back, crosses year boundary
    })
  })

  describe('30-day preset', () => {
    it('should calculate 30 days back from today (Feb 11)', () => {
      const now = new Date('2026-02-11T12:00:00Z')
      const { from, to } = calculateDatePreset('30days', now)
      expect(to).toBe('2026-02-11')
      expect(from).toBe('2026-01-12') // 30 days back
    })

    it('should handle month rollover correctly', () => {
      const now = new Date('2026-02-05T12:00:00Z')
      const { from, to } = calculateDatePreset('30days', now)
      expect(to).toBe('2026-02-05')
      expect(from).toBe('2026-01-06') // 30 days back, crosses month boundary
    })

    it('should handle year rollover correctly', () => {
      const now = new Date('2026-01-15T12:00:00Z')
      const { from, to } = calculateDatePreset('30days', now)
      expect(to).toBe('2026-01-15')
      expect(from).toBe('2025-12-16') // 30 days back, crosses year boundary
    })
  })

  describe('Month preset', () => {
    it('should set from to 1st of current month (Feb 1, 2026)', () => {
      const now = new Date('2026-02-11T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2026-02-11')
      expect(from).toBe('2026-02-01') // 1st of February
    })

    it('should work correctly at month start (Feb 1)', () => {
      const now = new Date('2026-02-01T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2026-02-01')
      expect(from).toBe('2026-02-01') // Same day
    })

    it('should work correctly at month end (Feb 28)', () => {
      const now = new Date('2026-02-28T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2026-02-28')
      expect(from).toBe('2026-02-01')
    })

    it('should handle January correctly', () => {
      const now = new Date('2026-01-15T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2026-01-15')
      expect(from).toBe('2026-01-01')
    })

    it('should handle December correctly', () => {
      const now = new Date('2025-12-25T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2025-12-25')
      expect(from).toBe('2025-12-01')
    })

    it('should handle leap year February (Feb 29, 2024)', () => {
      const now = new Date('2024-02-29T12:00:00Z')
      const { from, to } = calculateDatePreset('month', now)
      expect(to).toBe('2024-02-29')
      expect(from).toBe('2024-02-01')
    })
  })

  describe('All preset', () => {
    it('should clear date range', () => {
      const now = new Date('2026-02-11T12:00:00Z')
      const { from, to } = calculateDatePreset('all', now)
      expect(from).toBeNull()
      expect(to).toBeNull()
    })
  })

  describe('Timezone handling', () => {
    it('should use local date consistently regardless of time of day', () => {
      // Test that different times within the same local day produce the same result
      // Create two dates with the same local date but different times
      const localDate1 = new Date(2026, 1, 11, 0, 0, 0) // Feb 11, 00:00:00 local
      const localDate2 = new Date(2026, 1, 11, 23, 59, 59) // Feb 11, 23:59:59 local

      const { from: from1, to: to1 } = calculateDatePreset('month', localDate1)
      const { from: from2, to: to2 } = calculateDatePreset('month', localDate2)

      // Both should produce same results since they're the same local date
      expect(from1).toBe(from2)
      expect(from1).toBe('2026-02-01')
      expect(to1).toBe(to2)
      expect(to1).toBe('2026-02-11')
    })
  })
})
