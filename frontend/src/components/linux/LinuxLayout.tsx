import { ArrowLeft, ArrowUpRight, BookOpen, Command, Menu, Network, Search, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LinuxTopic } from '../../types/linux'
import type { Navigate } from '../../lib/navigation'

interface LinuxLayoutProps {
  children: ReactNode
  topics: LinuxTopic[]
  activeTopic?: string
  navigate: Navigate
  eyebrow?: string
}

export function LinuxLayout({ children, topics, activeTopic, navigate, eyebrow = 'LINUX LEARNING PATH' }: LinuxLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const go = (path: string) => { setMenuOpen(false); navigate(path) }

  return <div className="learn-app"><header className="learn-header"><button className="learn-brand" onClick={() => go('/')} aria-label="Return to Fieldnotes home"><span className="brand-mark"><Terminal size={16} /></span><span>fieldnotes<span className="brand-period">.</span></span></button><div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div><button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button><button className="learn-menu-toggle" aria-label={menuOpen ? 'Close Linux navigation' : 'Open Linux navigation'} aria-expanded={menuOpen} aria-controls="linux-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></header>
    <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}<aside id="linux-sidebar" className={`learn-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Linux learning navigation"><button className="sidebar-back" onClick={() => go('/')}><ArrowLeft size={13} /> All departments</button><div className="sidebar-section-label">{eyebrow}</div><button className={`sidebar-overview ${!activeTopic ? 'is-active' : ''}`} onClick={() => go('/linux')}><BookOpen size={15} /> Overview</button><button className="sidebar-question-bank" onClick={() => go('/linux/questions')}><BookOpen size={15} /> Browse All Questions</button><button className={`sidebar-visual-link${eyebrow === 'VISUAL LEARNING' ? ' is-active' : ''}`} onClick={() => go('/linux/visual-learning')}><Network size={15} /> Visual learning</button><div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2,'0')}</span></div><nav className="topic-nav" aria-label="Linux topics">{topics.map((topic, index) => <button key={topic.id} type="button" className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/linux/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(index + 1).padStart(2,'0')}</span><span>{topic.name}</span></button>)}</nav><button className="sidebar-command-link" onClick={() => go('/linux/commands')}><Command size={15} /> Command reference <ArrowUpRight size={13} /></button><div className="sidebar-foot"><span className="sidebar-foot-icon"><Search size={14} /></span><span><b>Learn with intention</b><small>Understand the why behind each answer.</small></span></div></aside><main className="learn-main">{children}</main></div>
  </div>
}
