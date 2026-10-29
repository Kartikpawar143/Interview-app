import { ArrowLeft, BookOpen, Menu, Network, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Az900Section } from '../../types/azure'
import type { Navigate } from '../../lib/navigation'

export function AzureLayout({ children, sections, activeSectionId, navigate, openSection, openOverview, openExam }: {
  children: ReactNode
  sections: Az900Section[]
  activeSectionId?: string
  navigate: Navigate
  openSection: (section: Az900Section) => void
  openOverview: () => void
  openExam: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const home = () => { setMenuOpen(false); navigate('/') }
  const overview = () => { setMenuOpen(false); openOverview() }

  return <div className="learn-app"><header className="learn-header">
    <button className="learn-brand" onClick={home} aria-label="Return to Fieldnotes home"><span className="brand-mark"><Terminal size={16} /></span><span>fieldnotes<span className="brand-period">.</span></span></button>
    <div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div>
    <button className="learn-home-link" onClick={home}><ArrowLeft size={14} /> Home</button>
    <button className="learn-menu-toggle" aria-label={menuOpen ? 'Close AZ-900 navigation' : 'Open AZ-900 navigation'} aria-expanded={menuOpen} aria-controls="azure-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
  </header>
  <div className="learn-frame">
    {menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
    <aside id="azure-sidebar" className={`learn-sidebar az900-course-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="AZ-900 learning navigation">
      <button className="sidebar-back" onClick={home}><ArrowLeft size={13} /> All departments</button>
      <div className="sidebar-section-label">AZ-900 CERTIFICATION PREP</div>
      <button className={`sidebar-overview${!activeSectionId ? ' is-active' : ''}`} aria-current={!activeSectionId ? 'page' : undefined} onClick={overview}><BookOpen size={15} /> Course overview</button>
      <button className="sidebar-question-bank" onClick={() => { setMenuOpen(false); openExam() }}><BookOpen size={15} /> Timed practice exam</button>
      <button className="sidebar-question-bank" onClick={() => { setMenuOpen(false); navigate('/azure/az-900/visual-learning') }}><Network size={15} /> Visual learning</button>
      <div className="sidebar-section-label topic-label">COURSE SECTIONS <span>{sections.length.toString().padStart(2, '0')}</span></div>
      <nav className="topic-nav" aria-label="AZ-900 sections">{sections.map((section) => <button key={section.id} type="button" className={activeSectionId === section.id ? 'is-active' : ''} aria-current={activeSectionId === section.id ? 'page' : undefined} onClick={() => { setMenuOpen(false); openSection(section) }}><span className="topic-nav-number">{String(section.number).padStart(2, '0')}</span><span>{section.title}</span></button>)}</nav>
    </aside>
    <main className="learn-main">{children}</main>
  </div>
  </div>
}
