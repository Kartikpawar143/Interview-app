import { ArrowUpRight, BookOpen, Network, Search, Wrench } from 'lucide-react'
import type { Navigate } from '../../lib/navigation'

export type AzureTopNavigationItem = 'overview' | 'questions' | 'visual' | 'scenarios' | 'az900'

export function AzureTopNavigation({ active, navigate }: { active?: AzureTopNavigationItem; navigate: Navigate }) {
  const links: { id: AzureTopNavigationItem; label: string; path: string; icon: typeof BookOpen; external?: boolean }[] = [
    { id: 'overview', label: 'Overview', path: '/azure', icon: BookOpen },
    { id: 'visual', label: 'Visual learning', path: '/azure/visual-learning', icon: Network },
    { id: 'scenarios', label: 'Troubleshooting labs', path: '/azure/scenarios', icon: Wrench },
    { id: 'az900', label: 'AZ-900 preparation', path: '/azure/az-900', icon: BookOpen, external: true },
    { id: 'questions', label: 'Browse questions', path: '/azure/questions', icon: Search },
  ]

  return <nav className="azure-admin-top-nav" aria-label="Azure learning areas">{links.map(({ id, label, path, icon: Icon, external }) => <button key={id} className={active === id ? 'is-active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => navigate(path)}><Icon size={15} /> {label} {external && <ArrowUpRight size={13} />}</button>)}</nav>
}
