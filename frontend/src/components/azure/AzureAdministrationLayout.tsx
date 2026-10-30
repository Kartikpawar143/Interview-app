import { ArrowLeft, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AzureAdminScenario, AzureAdminTopic } from '../../types/azureAdmin'
import type { Az900VisualDiagram } from '../../types/azure'
import type { Navigate } from '../../lib/navigation'
import { AzureTopNavigation } from './AzureTopNavigation'
import { Brand } from '../Brand'

export function AzureAdministrationLayout({ children, topics, scenarios, diagrams, activeTopic, activeScenarioId, activeDiagramId, activeItem = 'overview', navigate, eyebrow = 'AZURE ADMINISTRATION' }: {
  children: ReactNode; topics: AzureAdminTopic[]; scenarios?: AzureAdminScenario[]; diagrams?: Az900VisualDiagram[]; activeTopic?: string; activeScenarioId?: string; activeDiagramId?: string; activeItem?: 'overview' | 'questions' | 'scenarios' | 'visual'; navigate: Navigate; eyebrow?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])
  const go = (path: string) => { setMenuOpen(false); navigate(path) }
  return <div className="learn-app"><header className="learn-header"><Brand variant="learn" onClick={() => go('/')} /><div className="learn-header-label"><span className="header-status-dot" /> TECHNICAL INTERVIEW PREP</div><button className="learn-home-link" onClick={() => go('/')}><ArrowLeft size={14} /> Home</button><button className="learn-menu-toggle" aria-label={menuOpen ? 'Close Azure navigation' : 'Open Azure navigation'} aria-expanded={menuOpen} aria-controls="azure-admin-sidebar" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></header>
    <div className="learn-frame">{menuOpen && <button className="learn-sidebar-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}<aside id="azure-admin-sidebar" className={`learn-sidebar azure-admin-sidebar${menuOpen ? ' is-open' : ''}`} aria-label={`${eyebrow} contextual navigation`}>
      {activeItem === 'visual' ? <div className="azure-admin-context"><div className="sidebar-section-label topic-label">AZURE DIAGRAMS <span>{String(diagrams?.length ?? 0).padStart(2, '0')}</span></div><nav className="topic-nav azure-context-nav" aria-label="Azure visual-learning diagrams">{diagrams?.length ? diagrams.map((diagram) => <button key={diagram.id} type="button" className={activeDiagramId === diagram.id ? 'is-active' : ''} aria-current={activeDiagramId === diagram.id ? 'page' : undefined} onClick={() => go(`/azure/visual-learning?diagram=${encodeURIComponent(diagram.id)}`)}><span className="topic-nav-number">{String(diagram.order).padStart(2, '0')}</span><span>{diagram.title}</span></button>) : <span className="azure-context-loading">Loading diagrams…</span>}</nav></div> : activeItem === 'scenarios' ? <div className="azure-admin-context"><div className="sidebar-section-label topic-label">TROUBLESHOOTING SCENARIOS <span>{String(scenarios?.length ?? 0).padStart(2, '0')}</span></div><nav className="topic-nav azure-context-nav" aria-label="Azure troubleshooting scenarios">{scenarios?.length ? scenarios.map((scenario, index) => <button key={scenario.id} type="button" className={activeScenarioId === scenario.id ? 'is-active' : ''} aria-current={activeScenarioId === scenario.id ? 'page' : undefined} onClick={() => go(`/azure/scenarios/${encodeURIComponent(scenario.slug)}`)}><span className="topic-nav-number">{String(index + 1).padStart(2, '0')}</span><span>{scenario.title}</span></button>) : <span className="azure-context-loading">Loading scenarios…</span>}</nav></div> : <div className="azure-admin-context"><div className="sidebar-section-label topic-label">TOPICS <span>{topics.length.toString().padStart(2, '0')}</span></div><nav className="topic-nav" aria-label="Azure administration topics">{topics.map((topic) => <button key={topic.id} className={activeTopic === topic.id ? 'is-active' : ''} aria-current={activeTopic === topic.id ? 'page' : undefined} onClick={() => go(`/azure/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-nav-number">{String(topic.order).padStart(2, '0')}</span><span>{topic.name}</span></button>)}</nav></div>}
    </aside><main className="learn-main azure-admin-main">
      <AzureTopNavigation active={activeItem === 'overview' && activeTopic ? undefined : activeItem} navigate={go} />
      {children}
    </main></div></div>
}
