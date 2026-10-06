/**
 * Meeting thumbnail (Story 13.12): a fixed 16:9 box (no layout shift) with a lazy-loaded image.
 * Without a `src`, or when the image fails to load (e.g. an expired link), it shows a neutral
 * placeholder with the optional `children` (duration, platform, ...).
 */
import { useState, type ReactNode } from 'react'
import { Video } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MeetingThumbnailProps {
  src?: string | null
  alt: string
  className?: string
  children?: ReactNode
}

export function MeetingThumbnail({ src, alt, className, children }: MeetingThumbnailProps) {
  const [failed, setFailed] = useState(false)
  const showImage = !!src && !failed
  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-md bg-gray-100', className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          data-testid="meeting-thumbnail-placeholder"
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center text-xs text-gray-500"
        >
          <Video className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {children}
        </div>
      )}
    </div>
  )
}
