import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, BookOpen, Check, Cloud, Command, LoaderCircle, Network, Search, ShieldCheck, Sparkles, Terminal, Wrench } from 'lucide-react'
import { Header } from '../components/Header'
import { DepartmentCard } from '../components/DepartmentCard'
import { getDepartments } from '../lib/api'
import type { Department } from '../types/department'

const fallbackDepartments: Department[] = [
  { id: 'linux', name: 'Linux Administration', short_name: 'SYSTEMS / 01', description: 'Build a strong foundation in the operating system that powers the modern internet.', status: 'available', accent: 'green', topics: [] },
  { id: 'aws', name: 'AWS Cloud', short_name: 'CLOUD / 02', description: 'Build practical cloud knowledge across AWS services, architecture, and operations.', status: 'available', accent: 'orange', topics: [] },
  { id: 'azure', name: 'Microsoft Azure', short_name: 'CLOUD / 03', description: 'Explore Azure administration and prepare for AZ-900 with a separate certification course.', status: 'coming_soon', accent: 'blue', topics: [] },
]

const features = [
  { number: '01', icon: Search, title: 'Searchable question libraries', description: 'Browse and filter interview questions by topic and difficulty across available departments.' },
  { number: '02', icon: BookOpen, title: 'Answers with practical context', description: 'Build practical knowledge with focused explanations, examples, and troubleshooting guidance.' },
  { number: '03', icon: Network, title: 'Interactive visual learning', description: 'Explore visual guides that connect technical concepts and help test your understanding.' },
  { number: '04', icon: Terminal, title: 'Linux command practice', description: 'Use the Linux command reference and a safe browser-based terminal simulator.' },
  { number: '05', icon: ShieldCheck, title: 'AZ-900 study course', description: 'Study 20 sections and 40 lessons, then use original questions and configurable timed mock exams.' },
  { number: '06', icon: Wrench, title: 'Guided troubleshooting', description: 'Work through department-specific exercises and simulated scenarios.' },
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
  return <div id="top" className="app-shell home-platform"><Header /><main>
    <section className="hero section-wrap home-platform-hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> FIELDNOTES / TECHNICAL LEARNING</div><h1>Understand the work.<br /><span>Explain your thinking.</span></h1><p className="hero-description">A practical platform for learning technical concepts, exploring systems visually, preparing for interviews, and building certification knowledge.</p><div className="hero-actions"><a className="button-primary" href="#learning-paths">Choose a learning path <ArrowRight size={16} /></a><a className="text-link" href="#departments">Explore departments <ArrowDown size={14} /></a></div><div className="hero-footnote"><span><ShieldCheck size={15} /> Learn concepts with context</span><span className="footnote-divider" /><span><Command size={14} /> Practise at your own pace</span></div></div>
      <div className="hero-visual"><div className="visual-index">FIELDNOTES <span>—</span> LEARNING LOOP</div><div className="home-learning-loop"><div className="home-loop-step"><span>01</span><div><b>Learn the model</b><small>Build a clear mental picture.</small></div><BookOpen size={16} /></div><div className="home-loop-step"><span>02</span><div><b>Explore the system</b><small>Connect services and decisions.</small></div><Network size={16} /></div><div className="home-loop-step"><span>03</span><div><b>Practise your reasoning</b><small>Explain, troubleshoot, and review.</small></div><Check size={16} /></div><div className="home-loop-foot"><span><i /> SELF-PACED LEARNING</span><span>FIELDNOTES / 001</span></div></div><div className="visual-note"><span className="note-dot" /> From fundamentals to practical questions</div></div><div className="hero-rail" aria-hidden="true"><span>LEARN / EXPLORE / PRACTISE</span><i /></div>
    </section>

    <section className="departments section-wrap" id="departments"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> DEPARTMENT DIRECTORY</div><h2>Choose a discipline<span>.</span></h2></div><p>Start with an available learning path,<br />or see what is coming next.</p></div>
      {apiError && <div className="api-notice" role="status"><span className="notice-dot" /> Showing the saved department list. The API could not be reached.</div>}
      {loading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={18} /> Loading departments…</div> : <div className="department-grid">{displayed.map((department, index) => <DepartmentCard key={department.id} department={department} index={index} />)}</div>}
    </section>

    <section className="home-pathways section-wrap" id="learning-paths"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> LEARNING PATHWAYS</div><h2>Start with your goal<span>.</span></h2></div><p>Explore Linux, AWS Cloud, Azure administration,<br />and AZ-900 certification preparation.</p></div>
      <div className="home-pathway-grid">
        <article className="home-pathway-card"><div className="home-pathway-mark"><Terminal size={18} /><span>COMPLETED PATH</span></div><h3>Linux administration &amp; technical interviews</h3><p>Explore 11 topics, a 66-question library, detailed answers, command references, visual guides, Copilot exercises, and the safe terminal simulator.</p><a className="home-pathway-link" href="/linux">Open Linux learning <ArrowRight size={14} /></a></article>
        <article className="home-pathway-card home-pathway-aws"><div className="home-pathway-mark"><Cloud size={18} /><span>AWS CLOUD</span></div><h3>AWS architecture &amp; operations</h3><p>Explore 14 topic guides across AWS infrastructure, security, compute, networking, storage, reliability, and cost. Interview questions are being prepared.</p><a className="home-pathway-link" href="/aws">Open AWS Cloud learning <ArrowRight size={14} /></a></article>
        <article className="home-pathway-card home-pathway-azure"><div className="home-pathway-mark"><ShieldCheck size={18} /><span>AZ-900 CERTIFICATION PREPARATION</span></div><h3>Microsoft Azure Fundamentals</h3><p>Study 20 sections and 40 original lessons, practise with 100 original questions, and configure timed mock exams.</p><div className="home-pathway-links"><a className="home-pathway-link" href="/azure/az-900">Open AZ-900 course <ArrowRight size={14} /></a><a className="home-pathway-secondary" href="/azure/az-900/visual-learning"><Network size={14} /> Explore AZ-900 Visual Learning</a></div></article>
        <article className="home-pathway-card home-pathway-azure"><div className="home-pathway-mark"><Cloud size={18} /><span>AZURE ADMINISTRATION</span></div><h3>Azure operations &amp; interviews</h3><p>Review 14 administration topics, 84 original interview questions, and eight simulated troubleshooting scenarios.</p><a className="home-pathway-link" href="/azure">Open Azure administration <ArrowRight size={14} /></a></article>
      </div>
    </section>

    <section className="home-features section-wrap" id="platform-features"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AVAILABLE ACROSS FIELDNOTES</div><h2>Learn, inspect, and practise<span>.</span></h2></div><p>Tools are described in the context of the<br />department where they are available.</p></div><div className="home-feature-grid">{features.map(({ number, icon: Icon, title, description }) => <article className="home-feature" key={number}><div><span>{number}</span><Icon size={16} /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section>

    <section className="approach section-wrap" id="approach"><div className="approach-label"><Sparkles size={15} /> THE FIELDNOTES APPROACH</div><div className="approach-copy"><h2>Learn the why.<br />Remember the how.</h2><p>Strong technical interviews come from understanding trade-offs and communicating a clear line of reasoning. Fieldnotes pairs structured study with practical questions and visual models.</p></div><div className="approach-points"><div><span>01</span><b>Clarity over cramming</b></div><div><span>02</span><b>Principles you can apply</b></div><div><span>03</span><b>Steady, self-paced learning</b></div></div></section>
  </main><footer className="site-footer"><div className="footer-inner"><span className="footer-brand">fieldnotes<span>.</span></span><span>Thoughtful preparation for technical work.</span><span>© 2026 FIELDNOTES</span></div></footer></div>
}
