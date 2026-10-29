import { ArrowLeft, ArrowRight, BookOpen, Menu, Network, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Navigate } from '../../lib/navigation'

export function AzureVisualLearningLayout({ children, navigate }: { children: ReactNode; navigate: Navigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  const go = (path: string) => { setMenuOpen(false); navigate(path) }

  return <div className="learn-app"><header className="learn-header">
    <button className="learn-brand" onClick={() => go('/')} aria-label="Return to Fieldnotes home"><span className="brand-mark"><Terminal size={16} /></span><span>fieldnotes<span className="brand-period">.</span></span></button>
    <div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div>
    <button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button>
    <button className="learn-menu-toggle" aria-label={menuOpen ? 'Close visual learning navigation' : 'Open visual learning navigation'} aria-expanded={menuOpen} aria-controls="az900-visual-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
  </header>
  <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
    <aside id="az900-visual-sidebar" className={`learn-sidebar az900-visual-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="AZ-900 visual learning navigation">
      <button className="sidebar-back" onClick={() => go('/')}><ArrowLeft size={13} /> All departments</button>
      <div className="sidebar-section-label">AZ-900 VISUAL LEARNING</div>
      <button className="sidebar-overview" onClick={() => go('/azure/az-900')}><BookOpen size={15} /> Certification course</button>
      <button className="sidebar-visual-link is-active" aria-current="page" onClick={() => go('/azure/az-900/visual-learning')}><Network size={15} /> Visual learning</button>
      <button className="sidebar-command-link" onClick={() => go('/azure')}><ArrowRight size={15} /> Azure administration <ArrowRight size={13} /></button>
      <div className="az900-visual-sidebar-spacer" aria-hidden="true" />
      <div className="sidebar-foot"><span className="sidebar-foot-icon"><Network size={14} /></span><span><b>Explore the relationships</b><small>Inspect a concept, then test your understanding.</small></span></div>
    </aside>
    <main className="learn-main">{children}</main>
  </div>
  </div>
}
