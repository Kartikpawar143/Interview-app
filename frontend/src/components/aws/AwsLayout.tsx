import { ArrowLeft, Cloud, Menu, Network, Search, ShieldAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AwsTopic, AwsTroubleshootingLab, AwsVisualDiagram } from '../../types/aws'
import type { Navigate } from '../../lib/navigation'
import { Brand } from '../Brand'

export function AwsLayout({ children, topics, diagrams, labs, activeDiagramId, activeLabId, activeTopic, activeItem = 'overview', navigate }: {
  children: ReactNode
  topics: AwsTopic[]
  diagrams?: AwsVisualDiagram[]
  labs?: AwsTroubleshootingLab[]
  activeDiagramId?: string
  activeLabId?: string
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
    <Brand variant="learn" onClick={() => go('/')} />
    <div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL LEARNING / AWS CLOUD</div>
    <button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button>
    <button className="learn-menu-toggle" aria-label={menuOpen ? 'Close AWS navigation' : 'Open AWS navigation'} aria-expanded={menuOpen} aria-controls="aws-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
  </header>
  <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
    <aside id="aws-sidebar" className={`learn-sidebar aws-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="AWS contextual navigation">
      {activeItem === 'visual' ? <div className="aws-context"><div className="sidebar-section-label topic-label aws-diagram-label">VISUAL DIAGRAMS <span>{String(diagrams?.length ?? 0).padStart(2, '0')}</span></div><nav className="topic-nav aws-diagram-nav" aria-label="AWS visual-learning diagrams">{diagrams?.length ? diagrams.map((diagram) => <button key={diagram.id} type="button" className={activeDiagramId === diagram.id ? 'is-active' : ''} aria-current={activeDiagramId === diagram.id ? 'page' : undefined} onClick={() => go(`/aws/visual-learning?diagram=${encodeURIComponent(diagram.id)}`)}><span className="topic-nav-number">{String(diagram.order).padStart(2, '0')}</span><span>{diagram.title}</span></button>) : <span className="aws-diagram-loading">Loading diagrams…</span>}</nav></div> : activeItem === 'troubleshooting' ? <div className="aws-context"><div className="sidebar-section-label topic-label aws-lab-label">TROUBLESHOOTING LABS <span>{String(labs?.length ?? 0).padStart(2, '0')}</span></div><nav className="topic-nav aws-lab-nav" aria-label="AWS troubleshooting labs">{labs?.length ? labs.map((lab, index) => <button key={lab.id} type="button" className={activeLabId === lab.id ? 'is-active' : ''} aria-current={activeLabId === lab.id ? 'page' : undefined} onClick={() => go(`/aws/troubleshooting/${encodeURIComponent(lab.slug)}`)}><span className="topic-nav-number">{String(index + 1).padStart(2, '0')}</span><span>{lab.title}</span></button>) : <span className="aws-diagram-loading">Loading labs…</span>}</nav></div> : <div className="aws-context"><div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2, '0')}</span></div><nav className="topic-nav" aria-label="AWS Cloud topics">{topics.map((topic) => <button key={topic.id} className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/aws/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(topic.order).padStart(2, '0')}</span><span>{topic.name}</span></button>)}</nav></div>}
    </aside>
    <main className="learn-main aws-main"><nav className="aws-top-nav" aria-label="AWS learning areas">
      <button className={activeItem === 'overview' && !activeTopic ? 'is-active' : ''} aria-current={activeItem === 'overview' && !activeTopic ? 'page' : undefined} onClick={() => go('/aws')}><Cloud size={15} /> Overview</button>
      <button className={activeItem === 'visual' ? 'is-active' : ''} aria-current={activeItem === 'visual' ? 'page' : undefined} onClick={() => go('/aws/visual-learning')}><Network size={15} /> Visual learning</button>
      <button className={activeItem === 'troubleshooting' ? 'is-active' : ''} aria-current={activeItem === 'troubleshooting' ? 'page' : undefined} onClick={() => go('/aws/troubleshooting')}><ShieldAlert size={15} /> Troubleshooting labs</button>
      <button className={activeItem === 'questions' ? 'is-active' : ''} aria-current={activeItem === 'questions' ? 'page' : undefined} onClick={() => go('/aws/questions')}><Search size={15} /> Question library</button>
    </nav>{children}</main>
  </div>
  </div>
}
