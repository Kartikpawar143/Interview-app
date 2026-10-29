import { ArrowLeft, ArrowUpRight, BookOpen, Cloud, Menu, Network, Search, ShieldAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AwsTopic } from '../../types/aws'
import type { Navigate } from '../../lib/navigation'

export function AwsLayout({ children, topics, activeTopic, activeItem = 'overview', navigate }: {
  children: ReactNode
  topics: AwsTopic[]
  activeTopic?: string
  activeItem?: 'overview' | 'questions' | 'visual' | 'troubleshooting'
  navigate: Navigate
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])
  const go = (path: string) => { setMenuOpen(false); navigate(path) }

  return <div className="learn-app"><header className="learn-header">
    <button className="learn-brand" onClick={() => go('/')} aria-label="Return to Fieldnotes home"><span className="brand-mark"><Cloud size={16} /></span><span>fieldnotes<span className="brand-period">.</span></span></button>
    <div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL LEARNING / AWS CLOUD</div>
    <button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button>
    <button className="learn-menu-toggle" aria-label={menuOpen ? 'Close AWS navigation' : 'Open AWS navigation'} aria-expanded={menuOpen} aria-controls="aws-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
  </header>
  <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
    <aside id="aws-sidebar" className={`learn-sidebar aws-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="AWS Cloud navigation">
      <button className="sidebar-back" onClick={() => go('/')}><ArrowLeft size={13} /> All departments</button>
      <div className="sidebar-section-label">AWS CLOUD / INTERVIEW PREP</div>
      <button className={`sidebar-overview${activeItem === 'overview' && !activeTopic ? ' is-active' : ''}`} aria-current={activeItem === 'overview' && !activeTopic ? 'page' : undefined} onClick={() => go('/aws')}><Cloud size={15} /> Overview</button>
      <button className={`sidebar-question-bank${activeItem === 'questions' ? ' is-active' : ''}`} aria-current={activeItem === 'questions' ? 'page' : undefined} onClick={() => go('/aws/questions')}><Search size={15} /> Browse questions</button>
      <button className={`sidebar-visual-link${activeItem === 'visual' ? ' is-active' : ''}`} aria-current={activeItem === 'visual' ? 'page' : undefined} onClick={() => go('/aws/visual-learning')}><Network size={15} /> Visual learning</button>
      <button className={`sidebar-visual-link${activeItem === 'troubleshooting' ? ' is-active' : ''}`} aria-current={activeItem === 'troubleshooting' ? 'page' : undefined} onClick={() => go('/aws/troubleshooting')}><ShieldAlert size={15} /> Troubleshooting labs</button>
      <div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2, '0')}</span></div>
      <nav className="topic-nav" aria-label="AWS Cloud topics">{topics.map((topic) => <button key={topic.id} className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/aws/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(topic.order).padStart(2, '0')}</span><span>{topic.name}</span></button>)}</nav>
      <button className="sidebar-command-link" onClick={() => go('/aws/questions')}><BookOpen size={15} /> Question library <ArrowUpRight size={13} /></button>
      <div className="sidebar-foot"><span className="sidebar-foot-icon"><Cloud size={14} /></span><span><b>Learn AWS with context</b><small>Use AWS concepts without connecting to an account.</small></span></div>
    </aside>
    <main className="learn-main">{children}</main>
  </div>
  </div>
}
