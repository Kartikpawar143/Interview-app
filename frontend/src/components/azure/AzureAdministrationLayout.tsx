import { ArrowLeft, ArrowUpRight, BookOpen, Menu, Search, Terminal, X, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AzureAdminTopic } from '../../types/azureAdmin'
import type { Navigate } from '../../lib/navigation'

export function AzureAdministrationLayout({ children, topics, activeTopic, activeItem = 'overview', navigate, eyebrow = 'AZURE ADMINISTRATION' }: {
  children: ReactNode; topics: AzureAdminTopic[]; activeTopic?: string; activeItem?: 'overview' | 'questions' | 'scenarios'; navigate: Navigate; eyebrow?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])
  const go = (path: string) => { setMenuOpen(false); navigate(path) }
  return <div className="learn-app"><header className="learn-header"><button className="learn-brand" onClick={() => go('/')} aria-label="Return to Fieldnotes home"><span className="brand-mark"><Terminal size={16} /></span><span>fieldnotes<span className="brand-period">.</span></span></button><div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div><button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button><button className="learn-menu-toggle" aria-label={menuOpen ? 'Close Azure navigation' : 'Open Azure navigation'} aria-expanded={menuOpen} aria-controls="azure-admin-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></header>
    <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}<aside id="azure-admin-sidebar" className={`learn-sidebar azure-admin-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Azure administration navigation"><button className="sidebar-back" onClick={() => go('/')}><ArrowLeft size={13} /> All departments</button><div className="sidebar-section-label">{eyebrow}</div><button className={`sidebar-overview${activeItem === 'overview' && !activeTopic ? ' is-active' : ''}`} aria-current={activeItem === 'overview' && !activeTopic ? 'page' : undefined} onClick={() => go('/azure')}><BookOpen size={15} /> Overview</button><button className={`sidebar-question-bank${activeItem === 'questions' ? ' is-active' : ''}`} aria-current={activeItem === 'questions' ? 'page' : undefined} onClick={() => go('/azure/questions')}><Search size={15} /> Browse questions</button><div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2, '0')}</span></div><nav className="topic-nav" aria-label="Azure administration topics">{topics.map((topic) => <button key={topic.id} className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/azure/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(topic.order).padStart(2, '0')}</span><span>{topic.name}</span></button>)}</nav><button className={`sidebar-command-link${activeItem === 'scenarios' ? ' is-active' : ''}`} aria-current={activeItem === 'scenarios' ? 'page' : undefined} onClick={() => go('/azure/scenarios')}><Wrench size={15} /> Troubleshooting labs <ArrowUpRight size={13} /></button><button className="sidebar-command-link azure-admin-cert-link" onClick={() => go('/azure/az-900')}><BookOpen size={15} /> AZ-900 preparation <ArrowUpRight size={13} /></button><div className="sidebar-foot"><span className="sidebar-foot-icon"><Search size={14} /></span><span><b>Learn with intention</b><small>Understand the why behind each answer.</small></span></div></aside><main className="learn-main">{children}</main></div></div>
}
