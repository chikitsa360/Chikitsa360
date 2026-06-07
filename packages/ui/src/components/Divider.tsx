import { cn } from '@chikitsa360/core'

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) {
    return <hr className={cn('border-border', className)} />
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 border-t border-border" />
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
