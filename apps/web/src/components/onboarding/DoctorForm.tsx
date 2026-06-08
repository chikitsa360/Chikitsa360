'use client'

import * as React from 'react'

const SPECIALITIES = [
  'General Medicine',
  'Dermatology',
  'Dentistry',
  'Orthopaedics',
  'Gynaecology',
  'Paediatrics',
  'Ophthalmology',
  'ENT',
  'Other',
]

export interface DoctorRowData {
  name: string
  phone: string
  speciality: string
  defaultFee: string
}

interface DoctorFormRowProps {
  index: number
  data: DoctorRowData
  onChange: (index: number, data: DoctorRowData) => void
  onRemove?: (index: number) => void
  errors?: {
    name?: string
    phone?: string
  }
}

export function DoctorFormRow({ index, data, onChange, onRemove, errors }: DoctorFormRowProps) {
  function update(field: keyof DoctorRowData, value: string) {
    onChange(index, { ...data, [field]: value })
  }

  return (
    <div className="mb-5 rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Doctor {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-[12px] text-muted-foreground hover:text-error transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Full Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            maxLength={100}
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Dr. Priya Sharma"
            className={inputClass(!!errors?.name)}
          />
          {errors?.name && <p className="mt-1 text-[12px] text-error">{errors.name}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Mobile Number <span className="text-error">*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={data.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
            placeholder="10-digit mobile"
            className={inputClass(!!errors?.phone)}
          />
          {errors?.phone && <p className="mt-1 text-[12px] text-error">{errors.phone}</p>}
        </div>

        {/* Speciality */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">Speciality</label>
          <select
            value={data.speciality}
            onChange={(e) => update('speciality', e.target.value)}
            className={inputClass(false)}
          >
            <option value="">Select speciality</option>
            {SPECIALITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Fee */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Default Consultation Fee (₹)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={data.defaultFee}
            onChange={(e) => update('defaultFee', e.target.value)}
            placeholder="e.g. 500"
            className={inputClass(false)}
          />
        </div>
      </div>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-[13px] text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'transition-colors',
    hasError ? 'border-error focus:ring-error/30 focus:border-error' : 'border-border',
  ].join(' ')
}
