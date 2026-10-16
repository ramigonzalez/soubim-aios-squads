/** Human title and date of an ingestion source (meeting · e-mail · document). */
import type { Source } from '../types/ingestion'

export function sourceTitle(source: Source): string {
  if (source.source_type === 'meeting') return source.title
  if (source.source_type === 'email') return source.subject
  return source.file_name
}

export function sourceDate(source: Source): string {
  if (source.source_type === 'meeting') return source.meeting_date || source.created_at
  if (source.source_type === 'email') return source.email_date || source.created_at
  return source.upload_date || source.created_at
}
