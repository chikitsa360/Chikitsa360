/**
 * Event registration route group layout — no sidebar, no auth, fully public.
 * Similar to (booking) route group used for web booking link.
 */
export default function EventRegistrationLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#F0F4FF]">{children}</main>
}
