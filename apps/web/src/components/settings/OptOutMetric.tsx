import * as React from 'react'
import Link from 'next/link'

interface OptOutMetricProps {
  count: number
}

export function OptOutMetric({ count }: OptOutMetricProps) {
  return (
    <div className="flex items-center gap-2 py-3 text-[13px] text-muted-foreground italic">
      <span>
        {count === 0
          ? 'No patients have opted out of WhatsApp messages.'
          : `${count} patient${count === 1 ? '' : 's'} have opted out of WhatsApp messages.`}
      </span>
      {count > 0 && (
        <Link
          href="/patients?whatsapp_opt_out=true"
          className="text-primary not-italic underline-offset-4 hover:underline"
        >
          View opted-out patients
        </Link>
      )}
    </div>
  )
}
