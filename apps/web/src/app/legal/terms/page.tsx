import { brand } from '@/lib/brand'

export const metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: 19 October 2026</p>

      <h2>1. About the service</h2>
      <p>
        {brand.meta.appName} is a clinic management platform that helps clinics manage appointments,
        patient records, billing, reminders, and patient communication (the &ldquo;Service&rdquo;).
        These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between the clinic that
        registers an account (&ldquo;you&rdquo;, the &ldquo;Clinic&rdquo;) and the operator of{' '}
        {brand.meta.appName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate clinic and contact information during onboarding.</li>
        <li>
          You are responsible for all activity under your account, including staff users
          (doctors and receptionists) you invite.
        </li>
        <li>
          You must keep login access secure. Notify us immediately of any unauthorised use.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Use the Service only for lawful clinic operations.</li>
        <li>
          Do not send unsolicited or bulk messages through WhatsApp or SMS features in violation
          of applicable telecom and platform policies.
        </li>
        <li>Do not attempt to access other clinics&rsquo; data or probe the Service&rsquo;s security.</li>
      </ul>

      <h2>4. Patient data</h2>
      <p>
        You retain ownership of patient data you enter into the Service. We process it on your
        behalf as described in the <a href="/legal/dpa">Data Processing Agreement</a> and{' '}
        <a href="/legal/privacy">Privacy Policy</a>. As the healthcare provider, you are the Data
        Fiduciary for your patients&rsquo; personal data under the Digital Personal Data Protection
        Act, 2023 (&ldquo;DPDP Act&rdquo;).
      </p>

      <h2>5. Subscription and billing</h2>
      <p>
        The Service is offered on subscription plans. Fees, plan limits (such as the number of
        doctors), and renewal terms are shown at the time of purchase. If a plan expires, public
        booking and messaging features may be limited until renewal; your data remains intact.
      </p>

      <h2>6. Availability and support</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted operation. Planned
        maintenance and factors outside our control (including third-party messaging platforms)
        may affect the Service. Support is available at {brand.meta.supportEmail}.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service at any time and may request an export of your data. We may
        suspend or terminate accounts that violate these Terms, with notice where practicable.
        After termination we retain data only as required by law, then delete it.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        The Service supports clinic administration; it does not provide medical advice, and
        clinical decisions remain solely yours. To the maximum extent permitted by law, our
        aggregate liability for claims arising out of the Service is limited to the fees you paid
        in the twelve months preceding the claim.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be notified in the app
        or by email. Continued use after the effective date constitutes acceptance.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at the operator&rsquo;s registered
        place of business have exclusive jurisdiction.
      </p>
    </>
  )
}
