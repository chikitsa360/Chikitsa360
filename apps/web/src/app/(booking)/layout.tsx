/**
 * Booking route group layout — no sidebar, no auth, fully public.
 * Minimal HTML shell for the public-facing booking pages.
 */
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
