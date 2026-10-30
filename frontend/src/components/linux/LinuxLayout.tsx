import { ArrowLeft, BookOpen, Command, Menu, Network, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LinuxTopic } from '../../types/linux'
import type { LinuxDiagram } from '../../data/linuxDiagrams'
import type { Navigate } from '../../lib/navigation'
import { Brand } from '../Brand'

interface LinuxLayoutProps {
  children: ReactNode
  topics: LinuxTopic[]
  activeTopic?: string
  diagrams?: LinuxDiagram[]
  activeDiagramId?: string
  onSelectDiagram?: (id: string) => void
  navigate: Navigate
  eyebrow?: string
  activeItem?: 'overview' | 'visual' | 'questions' | 'commands'
}

export function LinuxLayout({ children, topics, activeTopic, diagrams, activeDiagramId, onSelectDiagram, navigate, eyebrow = 'LINUX LEARNING PATH', activeItem = 'overview' }: LinuxLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const go = (path: string) => { setMenuOpen(false); navigate(path) }
  const selectDiagram = (id: string) => { setMenuOpen(false); onSelectDiagram?.(id) }

  return <div className="learn-app linux-learn-app"><header className="learn-header"><Brand variant="learn" onClick={() => go('/')} /><div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div><button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button><button className="learn-menu-toggle" aria-label={menuOpen ? 'Close Linux navigation' : 'Open Linux navigation'} aria-expanded={menuOpen} aria-controls="linux-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></header>
    <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}<aside id="linux-sidebar" className={`learn-sidebar linux-sidebar${menuOpen ? ' is-open' : ''}`} aria-label={`${eyebrow} navigation`}><div className="linux-context">{activeItem === 'visual' ? <><div className="sidebar-section-label topic-label">VISUAL DIAGRAMS <span>{String(diagrams?.length ?? 0).padStart(2,'0')}</span></div><nav className="topic-nav linux-diagram-nav" aria-label="Linux visual-learning diagrams">{diagrams?.map((diagram, index) => <button key={diagram.id} type="button" className={activeDiagramId === diagram.id ? 'is-active' : ''} aria-current={activeDiagramId === diagram.id ? 'page' : undefined} onClick={() => selectDiagram(diagram.id)}><span className="topic-nav-number">{String(index + 1).padStart(2,'0')}</span><span>{diagram.title}</span></button>)}</nav></> : <><div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2,'0')}</span></div><nav className="topic-nav" aria-label="Linux topics">{topics.map((topic, index) => <button key={topic.id} type="button" className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/linux/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(index + 1).padStart(2,'0')}</span><span>{topic.name}</span></button>)}</nav></>}</div></aside><main className="learn-main linux-main"><nav className="linux-top-nav" aria-label="Linux learning areas">
      <button className={activeItem === 'overview' && !activeTopic ? 'is-active' : ''} aria-current={activeItem === 'overview' && !activeTopic ? 'page' : undefined} onClick={() => go('/linux')}><BookOpen size={15} /> Overview</button>
      <button className={activeItem === 'visual' ? 'is-active' : ''} aria-current={activeItem === 'visual' ? 'page' : undefined} onClick={() => go('/linux/visual-learning')}><Network size={15} /> Visual learning</button>
      <button className={activeItem === 'questions' ? 'is-active' : ''} aria-current={activeItem === 'questions' ? 'page' : undefined} onClick={() => go('/linux/questions')}><Search size={15} /> Browse questions</button>
      <button className={activeItem === 'commands' ? 'is-active' : ''} aria-current={activeItem === 'commands' ? 'page' : undefined} onClick={() => go('/linux/commands')}><Command size={15} /> Command reference</button>
    </nav>{children}</main></div>
  </div>
}
