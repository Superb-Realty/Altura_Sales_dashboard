import { useEffect, useRef, useState } from 'react'
import superbLogo from './assets/Superb_logo/superb.jpeg'

type User = { email: string; name: string }
type Props = { onAuthenticated: (token: string, user: User) => void }
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function AuthGate({ onAuthenticated }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState(clientId ? 'Sign in with an approved Google account to continue.' : 'Google sign-in is not configured yet.')
  useEffect(() => {
    if (!clientId) return
    const render = () => {
      if (!window.google || !buttonRef.current) return
      window.google.accounts.id.initialize({ client_id: clientId, cancel_on_tap_outside: false, callback: async ({ credential }) => {
        setMessage('Verifying your access…')
        try {
          const response = await fetch('/api/auth', { headers: { Authorization: `Bearer ${credential}` }, cache: 'no-store' })
          const result = await response.json() as { user?: User; error?: string }
          if (!response.ok || !result.user) throw new Error(result.error || 'Unable to verify this account.')
          onAuthenticated(credential, result.user)
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to verify this account.') }
      } })
      buttonRef.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300 })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) { render(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = render
    script.onerror = () => setMessage('Google sign-in could not be loaded. Please check your connection and try again.')
    document.head.append(script)
  }, [onAuthenticated])
  return <main className="auth-page"><section className="auth-card" aria-labelledby="sign-in-title"><img src={superbLogo} alt="Superb Realty" /><p className="auth-eyebrow">AMBER SALES REPORT</p><h1 id="sign-in-title">Private dashboard</h1><p>{message}</p>{clientId && <div className="google-sign-in" ref={buttonRef} />}</section></main>
}
