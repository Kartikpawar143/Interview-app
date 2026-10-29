import { ArrowUpRight, Check, Clock3, Cloud, Terminal } from 'lucide-react'
import type { Department } from '../types/department'

const icons = { linux: Terminal, aws: Cloud, azure: Cloud }

export function DepartmentCard({ department, index }: { department: Department; index: number }) {
  const Icon = icons[department.id as keyof typeof icons] ?? Cloud
  const available = department.status === 'available' || department.id === 'azure'
  const destination = department.id === 'azure' ? '/azure' : '/linux'
  return <article className={`department-card ${available ? 'is-available' : 'is-coming'}`} style={{ animationDelay: `${index * 90}ms` }}>
    <div className="card-top"><span className={`department-icon icon-${department.id}`}><Icon size={20} strokeWidth={1.8} /></span><span className={`status ${available ? 'status-ready' : ''}`}>{available ? <><Check size={12} /> AVAILABLE NOW</> : <><Clock3 size={12} /> COMING SOON</>}</span></div>
    <div className="card-copy"><div className="card-kicker">{department.short_name}</div><h3>{department.name}</h3><p>{department.description}</p></div>
    {department.id !== 'aws' && <div className="card-bottom"><span>{department.id === 'azure' ? '14 topics · 84 original interview questions' : '66 questions across 11 topics'}</span><a href={destination} aria-label={department.id === 'azure' ? 'Explore Azure administration' : 'Explore Linux Administration'}><ArrowUpRight size={18} /></a></div>}
  </article>
}
