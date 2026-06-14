import { redirect } from 'next/navigation'

// /settings → redirect to clinic profile (default settings tab)
export default function SettingsPage() {
  redirect('/settings/clinic')
}
