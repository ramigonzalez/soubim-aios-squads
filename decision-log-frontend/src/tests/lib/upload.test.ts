import { describe, it, expect } from 'vitest'
import { decodeText, MAX_VIDEO_BYTES, titleFromFileName, transcriptProblem, videoProblem } from '../../lib/upload'

describe('upload helpers (Story 13.5)', () => {
  it('validates video extension and size', () => {
    expect(videoProblem({ name: 'a.MP4', size: 10 })).toBeNull()
    expect(videoProblem({ name: 'a.mov', size: 10 })).toBeNull()
    expect(videoProblem({ name: 'a.avi', size: 10 })).toBe('extension')
    expect(videoProblem({ name: 'a.mp4', size: 0 })).toBe('empty')
    expect(videoProblem({ name: 'a.mp4', size: MAX_VIDEO_BYTES + 1 })).toBe('tooLarge')
  })

  it('validates the transcript', () => {
    expect(transcriptProblem({ name: 'a.txt', size: 5 })).toBeNull()
    expect(transcriptProblem({ name: 'a.docx', size: 5 })).toBe('extension')
    expect(transcriptProblem({ name: 'a.txt', size: 3 * 1024 ** 2 })).toBe('tooLarge')
  })

  it('decodes UTF-8 (BOM removed) and falls back to Latin-1', () => {
    const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('ação')])
    expect(decodeText(utf8.buffer)).toBe('ação')
    const latin1 = new Uint8Array([0x61, 0xe7, 0xe3, 0x6f]) // "ação" in Latin-1
    expect(decodeText(latin1.buffer)).toBe('ação')
  })

  it('derives a title from the file name', () => {
    expect(titleFromFileName('reuniao_obra_12.mp4')).toBe('reuniao obra 12')
  })
})
