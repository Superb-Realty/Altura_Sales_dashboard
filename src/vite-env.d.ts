/// <reference types="vite/client" />

interface Window {
  google?: { accounts: { id: {
    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; cancel_on_tap_outside?: boolean }) => void
    renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; text?: string; shape?: string; width?: number }) => void
    disableAutoSelect: () => void
  } } }
}
