/**
 * Manual upload helpers (Story 13.5): file validation and transcript decoding.
 * The server validates again; these checks give feedback before a large upload starts.
 */

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'] as const
/** Default server limit (RECORDING_MAX_BYTES); the server answers 413 if its own limit is lower. */
export const MAX_VIDEO_BYTES = 2 * 1024 ** 3
export const MAX_TRANSCRIPT_BYTES = 2 * 1024 ** 2

export type FileProblem = 'extension' | 'tooLarge' | 'empty'

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}

export function videoProblem(file: { name: string; size: number }): FileProblem | null {
  if (!(VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) return 'extension'
  if (file.size <= 0) return 'empty'
  if (file.size > MAX_VIDEO_BYTES) return 'tooLarge'
  return null
}

export function transcriptProblem(file: { name: string; size: number }): FileProblem | null {
  if (extensionOf(file.name) !== '.txt') return 'extension'
  if (file.size <= 0) return 'empty'
  if (file.size > MAX_TRANSCRIPT_BYTES) return 'tooLarge'
  return null
}

/**
 * Decode a .txt file: UTF-8 (BOM removed); if the bytes are not valid UTF-8 (common in
 * Brazilian Windows exports) fall back to Latin-1/Windows-1252.
 */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer) // the decoder drops a leading BOM
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

/** Default title from a file name: no extension, underscores as spaces. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim()
}
