import { brand } from '@/lib/brand'

export const metadata = { title: 'Data Processing Agreement' }

export default function DpaPage() {
  return (
    <>
      <h1>Data Processing Agreement</h1>
      <p>Last updated: 19 October 2026</p>

      <h2>1. Roles</h2>
      <p>
        This Data Processing Agreement (&ldquo;DPA&rdquo;) applies when a clinic uses {brand.meta.appName}{' '}
        to process patients&rsquo; personal data. Under the Digital Personal Data Protection Act,
        2023 (&ldquo;DPDP Act&rdquo;), the <strong>clinic is the Data Fiduciary</strong> — it
        determines why and how patient data is processed — and{' '}
        <strong>{brand.meta.appName} acts as a Data Processor</strong>, processing personal data only on
        the clinic&rsquo;s documented instructions.
      </p>

      <h2>2. Clinic (Data Fiduciary) obligations</h2>
      <ul>
        <li>
          Obtain valid consent (or rely on another lawful ground) before entering a patient&rsquo;s
          personal data or messaging them through the platform.
        </li>
        <li>Enter only data that is necessary for care, scheduling, and billing.</li>
        <li>Respond to patients&rsquo; requests to access, correct, or erase their data.</li>
        <li>Keep staff access limited to people who need it, and deactivate departed staff.</li>
      </ul>

      <h2>3. Our (Data Processor) obligations</h2>
      <ul>
        <li>Process patient data only to provide the Service — never for our own purposes.</li>
        <li>Maintain per-clinic data isolation, encryption in transit, and encrypted secrets at rest.</li>
        <li>Maintain role-based access control and audit logs of sensitive actions.</li>
        <li>
          Notify the clinic without undue delay of any personal data breach affecting its data, and
          cooperate with the clinic&rsquo;s obligations to the Data Protection Board of India.
        </li>
        <li>Delete or return personal data on termination, except where law requires retention.</li>
      </ul>

      <h2>4. Sub-processors</h2>
      <p>
        We use vetted infrastructure and messaging providers (hosting, database, WhatsApp Business
        Platform, SMS gateways) to deliver the Service. Each is bound by contractual obligations
        at least as protective as this DPA. A current list is available on request at{' '}
        {brand.meta.supportEmail}.
      </p>

      <h2>5. Data transfers</h2>
      <p>
        Data is processed on infrastructure that may be located outside India where permitted by
        the DPDP Act and applicable government notifications. We will not transfer personal data
        to any jurisdiction restricted by the Central Government.
      </p>

      <h2>6. Security incidents</h2>
      <p>
        In the event of a breach, we will inform the affected clinic with known details — nature,
        scope, and mitigation steps — so the clinic can meet its notification duties as Data
        Fiduciary.
      </p>

      <h2>7. Term</h2>
      <p>
        This DPA applies for as long as the clinic uses the Service and survives until all personal
        data has been deleted or returned.
      </p>
    </>
  )
}
