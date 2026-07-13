import { redirect } from 'next/navigation'

// Root → redirect to dashboard (auth middleware handles unauthenticated users in Phase 4)
export default function Home() {
  redirect('/dashboard')
}
