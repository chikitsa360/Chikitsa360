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
      const payload: { name?: string; speciality?: string; default_fee?: number | null } = {}
      if (editData.name !== undefined) payload.name = editData.name
      if (editData.speciality !== undefined) payload.speciality = editData.speciality ?? undefined
      if (editData.default_fee !== undefined) {
        const feeVal = editData.default_fee === '' || editData.default_fee === null
          ? null
          : parseInt(String(editData.default_fee), 10)
        payload.default_fee = feeVal !== null && !isNaN(feeVal) ? feeVal : null
      }

      const res = await fetch(`/api/v1/doctors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json() as Doctor
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
                  <div className="space-y-3 pt-1">
                    {/* Name field */}
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-foreground/70">Name</label>
                      <input
                        type="text"
                        value={editData.name ?? doc.name}
                        onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-border px-3 text-[13px] focus:border-primary focus:outline-none"
                      />
                    </div>
                    {/* Default fee field */}
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <label className="text-[12px] font-medium text-foreground/70">
                          Default Consultation Fee (INR)
                        </label>
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Optional
                        </span>
                      </div>
                      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-border focus-within:border-primary">
                        <span className="flex h-full items-center border-r border-border bg-muted px-2.5 text-[13px] text-muted-foreground select-none">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={editData.default_fee ?? doc.default_fee ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            setEditData((p) => ({ ...p, default_fee: raw }))
                          }}
                          placeholder="e.g. 500"
                          className="h-full flex-1 bg-transparent px-3 text-[13px] focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Auto-populates when creating appointments for this doctor. Receptionists can override per appointment.
                      </p>
                    </div>
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
