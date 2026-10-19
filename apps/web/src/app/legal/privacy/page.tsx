import { brand } from '@/lib/brand'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: 19 October 2026</p>

      <h2>1. Scope</h2>
      <p>
        This policy explains how {brand.meta.appName} collects and processes personal data when clinics
        use our platform and when patients interact with clinic booking pages, WhatsApp flows, and
        reminders. It is designed to meet the requirements of the Digital Personal Data Protection
        Act, 2023 (&ldquo;DPDP Act&rdquo;).
      </p>

      <h2>2. Data we process</h2>
      <ul>
        <li>
          <strong>Clinic account data</strong> — clinic name, address, staff names, phone numbers,
          and roles, used to operate your account.
        </li>
        <li>
          <strong>Patient data entered by clinics</strong> — name, phone number, gender, age,
          appointment history, visit notes, and billing records. The clinic is the Data Fiduciary
          for this data; we process it only on the clinic&rsquo;s instructions.
        </li>
        <li>
          <strong>Booking data from patients</strong> — name and phone number submitted on public
          booking pages or via WhatsApp to book an appointment.
        </li>
        <li>
          <strong>Technical data</strong> — logs and device information needed for security and
          service operation.
        </li>
      </ul>

      <h2>3. How we use data</h2>
      <ul>
        <li>Operating appointments, reminders, confirmations, and billing for your clinic.</li>
        <li>Sending WhatsApp/SMS messages that the clinic or patient initiates.</li>
        <li>Securing the Service, preventing abuse, and meeting legal obligations.</li>
      </ul>
      <p>We do not sell personal data or use patient data for advertising.</p>

      <h2>4. Message channels</h2>
      <p>
        WhatsApp messages are delivered via Meta&rsquo;s WhatsApp Business Platform; SMS fallback
        is delivered via licensed telecom providers. Patients can opt out of WhatsApp messages at
        any time by replying STOP, and the platform honours that choice.
      </p>

      <h2>5. Storage and security</h2>
      <ul>
        <li>Each clinic&rsquo;s data is isolated in a separate database schema.</li>
        <li>Data is encrypted in transit; credentials and integration secrets are encrypted at rest.</li>
        <li>Access is role-based: receptionists, doctors, and owners see only what their role permits.</li>
      </ul>

      <h2>6. Your rights (patients)</h2>
      <p>
        Under the DPDP Act you may request access, correction, or erasure of your personal data,
        and may withdraw consent for messaging. Contact your clinic first (it is the Data
        Fiduciary); you may also reach us at {brand.meta.supportEmail} and we will assist or route the
        request to the clinic.
      </p>

      <h2>7. Retention</h2>
      <p>
        We retain data while the clinic&rsquo;s account is active. On account closure, data is
        exported on request and then deleted, except where retention is required by law (e.g.
        billing records).
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy from time to time; material changes will be notified in the app
        or by email.
      </p>
    </>
  )
}
