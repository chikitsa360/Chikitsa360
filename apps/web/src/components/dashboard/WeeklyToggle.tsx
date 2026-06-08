interface WeeklyToggleProps {
  view: 'today' | 'week'
  onChange: (v: 'today' | 'week') => void
}

export function WeeklyToggle({ view, onChange }: WeeklyToggleProps) {
  return (
    <div className="flex items-center rounded-full p-1" style={{ background: 'var(--color-muted, #F1F5F9)' }}>
      {(['today', 'week'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="rounded-full px-4 py-1.5 text-[13px] transition-all duration-200"
          style={
            view === v
              ? { background: 'white', color: 'var(--color-primary)', fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: '#64748B', fontWeight: 400 }
          }
        >
          {v === 'today' ? 'Today' : 'This Week'}
        </button>
      ))}
    </div>
  )
}
