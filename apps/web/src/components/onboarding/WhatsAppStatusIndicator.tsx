'use client'

import * as React from 'react'

const STEPS = [
  { label: 'Number Registered' },
  { label: 'Templates Submitted' },
  { label: 'Verified' },
]

interface WhatsAppStatusIndicatorProps {
  completedSteps: number // 0, 1, 2, or 3
}

export function WhatsAppStatusIndicator({ completedSteps }: WhatsAppStatusIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((step, idx) => {
        const isComplete = idx < completedSteps
        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold"
                style={
                  isComplete
                    ? { background: '#10B981', color: '#fff' }
                    : { background: '#E2E8F0', color: '#94A3B8' }
                }
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className="mt-1.5 whitespace-nowrap text-[11px] font-medium"
                style={{ color: isComplete ? '#10B981' : '#94A3B8' }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="mx-2 mb-4 h-[2px] w-12 transition-colors"
                style={{ background: isComplete ? '#10B981' : '#E2E8F0' }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
