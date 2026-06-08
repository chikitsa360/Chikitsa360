'use client'

import * as React from 'react'

interface Doctor {
  id: string
  name: string
  speciality: string | null
  default_fee: string | null
}

export function DoctorsSettingsClient({ clinicId: _clinicId }: { clinicId: string }) {
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editData, setEditData] = React.useState<Partial<Doctor>>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/v1/doctors')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDoctors(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function initials(name: string) {
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editData }),
      })
      if (res.ok) {
        const updated = await res.json()
        setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)))
        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-[13px] text-muted-foreground">Loading doctors...</div>
    )
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-foreground" style={{ letterSpacing: '-0.015em' }}>
          Doctors
        </h1>
        <a
          href="/onboarding/step-2"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Doctor
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {doctors.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-muted-foreground">
            No doctors added yet.
          </div>
        ) : (
          doctors.map((doc, idx) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 px-5 py-4 ${idx > 0 ? 'border-t border-border' : ''}`}
            >
              {/* Avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ background: 'rgba(10,110,255,0.1)', color: '#0A6EFF' }}
              >
                {initials(doc.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {editingId === doc.id ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editData.name ?? doc.name}
                      onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                      className="h-8 w-40 rounded-lg border border-border px-2 text-[13px] focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      value={editData.default_fee ?? doc.default_fee ?? ''}
                      onChange={(e) => setEditData((p) => ({ ...p, default_fee: e.target.value }))}
                      placeholder="Fee (₹)"
                      className="h-8 w-24 rounded-lg border border-border px-2 text-[13px] focus:border-primary focus:outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="text-[14px] font-semibold text-foreground">{doc.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[12px] text-muted-foreground">
                      {doc.speciality && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
                        >
                          {doc.speciality}
                        </span>
                      )}
                      {doc.default_fee && <span>₹{doc.default_fee} / visit</span>}
                    </div>
                  </>
                )}
              </div>

              {/* Edit actions */}
              {editingId === doc.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(doc.id)}
                    disabled={saving}
                    className="rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditData({}) }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingId(doc.id); setEditData({}) }}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
