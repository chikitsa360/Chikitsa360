import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ToastProvider } from '@/components/ui/ToastProvider'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return <ToastProvider>{children}</ToastProvider>
}
