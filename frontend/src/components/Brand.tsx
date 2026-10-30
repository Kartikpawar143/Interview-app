import { Terminal } from 'lucide-react'
import { useState } from 'react'

export function Brand({ variant = 'site', onClick }: { variant?: 'site' | 'learn'; onClick?: () => void }) {
  const [logoUnavailable, setLogoUnavailable] = useState(false)
  const logo = logoUnavailable
    ? <><span className="brand-mark"><Terminal size={variant === 'site' ? 17 : 16} strokeWidth={2.2} /></span><span>fieldnotes<span className="brand-period">.</span></span></>
    : <img className="fieldnotes-logo" src="/images/fieldnotes-logo.svg" alt="" aria-hidden="true" onError={() => setLogoUnavailable(true)} />

  if (variant === 'learn') return <button type="button" className="learn-brand" onClick={onClick} aria-label="Return to Fieldnotes home">{logo}</button>
  return <a className="brand" href="#top" aria-label="Fieldnotes home">{logo}</a>
}
