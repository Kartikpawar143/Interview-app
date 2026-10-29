import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, BookOpen, Command, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from '../components/Header'
import { TerminalArt } from '../components/TerminalArt'
import { DepartmentCard } from '../components/DepartmentCard'
import { getDepartments } from '../lib/api'
import type { Department } from '../types/department'

const fallbackDepartments: Department[] = [
  { id: 'linux', name: 'Linux Administration', short_name: 'SYSTEMS / 01', description: 'Build a strong foundation in the operating system that powers the modern internet.', status: 'available', accent: 'green', topics: [] },
  { id: 'aws', name: 'AWS Cloud', short_name: 'CLOUD / 02', description: 'Explore the building blocks behind secure, scalable cloud infrastructure.', status: 'coming_soon', accent: 'orange', topics: [] },
  { id: 'azure', name: 'Microsoft Azure', short_name: 'CLOUD / 03', description: 'Get ready to design and operate solutions across the Azure ecosystem.', status: 'coming_soon', accent: 'blue', topics: [] },
]

export default function HomePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    let active = true
    getDepartments().then((data) => { if (active) setDepartments(data) }).catch(() => { if (active) { setDepartments(fallbackDepartments); setApiError(true) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const displayed = departments.length ? departments : fallbackDepartments
  return <div id="top" className="app-shell"><Header /><main>
    <section className="hero section-wrap"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE ENGINEER'S FIELD GUIDE</div><h1>Master Your Next<br /><span>Technical Interview</span></h1><p className="hero-description">Practical knowledge for the moments that matter. Build real understanding, sharpen your instincts, and move forward with confidence.</p><div className="hero-actions"><a className="button-primary" href="/linux">Explore Linux <ArrowRight size={16} /></a><a className="text-link" href="#departments">Browse departments <ArrowDown size={14} /></a></div><div className="hero-footnote"><span><ShieldCheck size={15} /> Built for real-world interviews</span><span className="footnote-divider" /><span><Command size={14} /> Learn at your own pace</span></div></div><div className="hero-visual"><div className="visual-index">FIG 01 <span>—</span> PREPARE WITH PURPOSE</div><TerminalArt /><div className="visual-note"><span className="note-dot" /> A better way to get interview-ready</div></div><div className="hero-rail" aria-hidden="true"><span>01 / 03</span><i /></div></section>
    <section className="departments section-wrap" id="departments"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING PATH</div><h2>Choose your discipline<span>.</span></h2></div><p>Focused paths through the fundamentals and beyond.<br />Start with the systems that power everything.</p></div>
      {apiError && <div className="api-notice" role="status"><span className="notice-dot" /> Showing the latest department list from this device. The API could not be reached.</div>}
      {loading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={18} /> Loading departments…</div> : <div className="department-grid">{displayed.map((department, index) => <DepartmentCard key={department.id} department={department} index={index} />)}</div>}
    </section>
    <section className="roadmap-pages section-wrap" aria-label="Cloud department previews">
      {displayed.filter((department) => department.status === 'coming_soon').map((department) => <article className={`roadmap-page roadmap-${department.id}`} id={department.id} key={department.id}>
        <div className="roadmap-mark"><span>{department.short_name}</span><span className="roadmap-icon"><Command size={19} /></span></div>
        <div className="roadmap-content"><div className="eyebrow"><span className="eyebrow-line" /> COMING SOON</div><h2>{department.name}<span>.</span></h2><p>{department.description} This learning path is in development. We’ll share a thoughtful, practical curriculum here when it’s ready.</p><a href="#departments" className="roadmap-back">Back to departments <ArrowRight size={14} /></a></div>
        <div className="roadmap-index" aria-hidden="true">FIELDNOTES / {department.id.toUpperCase()}</div>
      </article>)}
    </section>
    <section className="linux-section section-wrap" id="linux"><div className="linux-shell"><div className="linux-left"><div className="eyebrow"><span className="eyebrow-line" /> START HERE / LINUX ADMINISTRATION</div><h2>Strong fundamentals.<br /><span>Lasting confidence.</span></h2><p>Explore 66 practical interview questions across 11 Linux topics, with answers, commands, troubleshooting guidance, and follow-up prompts.</p><a className="linux-link" href="/linux">Open the Linux question library <ArrowRight size={15} /></a></div><div className="learning-outline"><div className="outline-head"><span>LEARNING PATH</span><span>11 TOPICS / 66 QUESTIONS</span></div><div className="outline-row"><span className="outline-number">01</span><div><b>Linux fundamentals &amp; architecture</b><small>Kernel, boot, processes, and core system interfaces</small></div><span className="outline-state"><BookOpen size={15} /></span></div><div className="outline-row"><span className="outline-number">02</span><div><b>Filesystems &amp; permissions</b><small>Mounts, access modes, ACLs, and disk usage</small></div><span className="outline-state"><BookOpen size={15} /></span></div><div className="outline-row"><span className="outline-number">03</span><div><b>Networking, DNS &amp; SSH</b><small>Addressing, routing, resolver configuration, and authentication</small></div><span className="outline-state"><BookOpen size={15} /></span></div><div className="outline-row"><span className="outline-number">04</span><div><b>And 8 more topics</b><small>Browse, search, and filter the full question library</small></div><span className="outline-state"><ArrowRight size={15} /></span></div></div></div></section>
    <section className="approach section-wrap" id="approach"><div className="approach-label"><Sparkles size={15} /> THE FIELDNOTES APPROACH</div><div className="approach-copy"><h2>Learn the why.<br />Remember the how.</h2><p>Great interviews are conversations, not recitals. We focus on the mental models and practical foundations that help you reason through unfamiliar problems and explain your thinking clearly.</p></div><div className="approach-points"><div><span>01</span><b>Clarity over cramming</b></div><div><span>02</span><b>Principles you can apply</b></div><div><span>03</span><b>Built for steady progress</b></div></div></section>
  </main><footer className="site-footer"><div className="footer-inner"><span className="footer-brand">fieldnotes<span>.</span></span><span>Thoughtful preparation for the work ahead.</span><span>© 2025 FIELDNOTES</span></div></footer></div>
}

