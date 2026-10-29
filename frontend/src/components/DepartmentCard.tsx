import { ArrowUpRight, Check, Clock3, Cloud, Terminal } from 'lucide-react'
import type { Department } from '../types/department'

const icons = { linux: Terminal, aws: Cloud, azure: Cloud }

export function DepartmentCard({ department, index }: { department: Department; index: number }) {
  const Icon = icons[department.id as keyof typeof icons] ?? Cloud
  const available = department.status === 'available'
  return <article className={`department-card ${available ? 'is-available' : 'is-coming'}`} style={{ animationDelay: `${index * 90}ms` }}>
    <div className="card-top"><span className={`department-icon icon-${department.id}`}><Icon size={20} strokeWidth={1.8} /></span><span className={`status ${available ? 'status-ready' : ''}`}>{available ? <><Check size={12} /> AVAILABLE NOW</> : <><Clock3 size={12} /> COMING SOON</>}</span></div>
    <div className="card-copy"><div className="card-kicker">{department.short_name}</div><h3>{department.name}</h3><p>{department.description}</p></div>
    <div className="card-bottom"><span>{available ? '66 questions across 11 topics' : 'On the roadmap'}</span>{available ? <a href="/linux" aria-label="Explore Linux Administration questions"><ArrowUpRight size={18} /></a> : <a className="coming-link" href={`#${department.id}`} aria-label={`Explore ${department.name} coming soon page`}><ArrowUpRight size={16} /></a>}</div>
  </article>
}
