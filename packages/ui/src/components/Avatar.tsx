'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const showImage = src && !imgError
  const initials = name ? getInitials(name) : '?'
  const hue = name ? nameToHue(name) : 200

  return (
    <span
      role="img"
      aria-label={name ?? 'avatar'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none overflow-hidden',
        sizeMap[size],
        className
      )}
      style={!showImage ? { backgroundColor: `hsl(${hue} 55% 55%)`, color: '#fff' } : undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ''}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </span>
  )
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
}: {
  avatars: AvatarProps[]
  max?: number
  size?: AvatarProps['size']
}) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((a, i) => (
        <Avatar
          key={i}
          {...a}
          size={size}
          className={cn('ring-2 ring-background', a.className)}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full',
            'bg-muted text-muted-foreground font-semibold ring-2 ring-background text-xs',
            sizeMap[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
