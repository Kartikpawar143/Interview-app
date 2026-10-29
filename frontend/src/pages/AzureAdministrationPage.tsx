import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, LoaderCircle, Search, ShieldCheck, Wrench, X } from 'lucide-react'
import { AzureAdministrationLayout } from '../components/azure/AzureAdministrationLayout'
import { getAzureAdminQuestion, getAzureAdminQuestions, getAzureAdminTopics, getAzureScenario, getAzureScenarios } from '../lib/api'
import type { AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic, AzureAdminDifficulty } from '../types/azureAdmin'
import type { Navigate } from '../lib/navigation'

type View = 'overview' | 'topic' | 'questions' | 'question' | 'scenarios' | 'scenario'
const levels: AzureAdminDifficulty[] = ['beginner', 'intermediate', 'advanced']

export function AzureAdministrationPage({ navigate, view, slug }: { navigate: Navigate; view: View; slug?: string }) {
  const [topics, setTopics] = useState<AzureAdminTopic[]>([])
  const [questions, setQuestions] = useState<AzureAdminQuestion[]>([])
  const [scenarios, setScenarios] = useState<AzureAdminScenario[]>([])
  const [question, setQuestion] = useState<AzureAdminQuestion | null>(null)
  const [scenario, setScenario] = useState<AzureAdminScenario | null>(null)
  const [topicFilter, setTopicFilter] = useState('')
  const [difficulty, setDifficulty] = useState<AzureAdminDifficulty | ''>('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAzureAdminTopics(controller.signal), getAzureAdminQuestions({}, controller.signal), getAzureScenarios(controller.signal)])
      .then(([topicData, questionData, scenarioData]) => { setTopics(topicData); setQuestions(questionData); setScenarios(scenarioData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load Azure administration content.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (view !== 'question' || !slug) { setQuestion(null); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    getAzureAdminQuestion(slug, controller.signal).then(setQuestion).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this question.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [view, slug])

  useEffect(() => {
    if (view !== 'scenario' || !slug) { setScenario(null); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    getAzureScenario(slug, controller.signal).then(setScenario).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this scenario.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [view, slug])

  const activeTopic = view === 'topic' ? topics.find((item) => item.slug === slug || item.id === slug) : undefined
  const visibleQuestions = useMemo(() => questions.filter((item) => (!topicFilter || item.topic_id === topicFilter) && (!difficulty || item.difficulty === difficulty) && (!activeTopic || item.topic_id === activeTopic.id) && (!query.trim() || `${item.question} ${item.short_answer} ${item.topic} ${item.services.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))), [questions, topicFilter, difficulty, activeTopic, query])
  const related = question ? questions.filter((item) => item.topic_id === question.topic_id && item.slug !== question.slug).slice(0, 4) : []
  const getTopic = (id: string) => topics.find((item) => item.id === id)

  return <AzureAdministrationLayout topics={topics} activeTopic={activeTopic?.id} activeItem={view === 'questions' || view === 'question' ? 'questions' : view === 'scenarios' || view === 'scenario' ? 'scenarios' : 'overview'} navigate={navigate} eyebrow={view === 'questions' || view === 'question' ? 'QUESTION LIBRARY' : view === 'scenarios' || view === 'scenario' ? 'TROUBLESHOOTING LABS' : 'AZURE ADMINISTRATION'}>
    <div className="learn-content azure-admin-content">
      <div className="learn-breadcrumb"><button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} /><button onClick={() => navigate('/azure')}>AZURE</button>{view !== 'overview' && <><ChevronRight size={12} /><span>{view === 'question' || view === 'questions' ? 'QUESTION LIBRARY' : view === 'scenario' || view === 'scenarios' ? 'TROUBLESHOOTING' : activeTopic?.name.toUpperCase() ?? 'TOPIC'}</span></>}</div>
      {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading Azure administration content…</div>}
      {!loading && error && <div className="browser-state browser-error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
      {!loading && !error && view === 'overview' && <>
        <section className="dashboard-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> AZURE / ADMINISTRATION &amp; INTERVIEW PREP</div><h1>Operate Azure<br /><span>with confidence.</span></h1><p>Practical administration concepts, original interview questions, and simulated troubleshooting guides. This learning area is separate from the AZ-900 certification course.</p></div><div className="question-total"><strong>{questions.length}</strong><span>ORIGINAL<br />QUESTIONS</span></div></section>
        <div className="dashboard-stats"><div><BookOpenIcon /> <b>{topics.length}</b> learning topics</div><span className="stats-rule" /><div><Wrench size={15} /> <b>{scenarios.length}</b> guided scenarios</div><button onClick={() => navigate('/azure/questions')}>Browse question library <ArrowRight size={14} /></button></div>
        <section className="azure-admin-cert-banner"><div><span className="section-overline">A SEPARATE LEARNING PATH</span><h2>Preparing for the AZ-900 exam?</h2><p>Open the dedicated certification course for lessons, knowledge checks, progress tracking, and timed mock exams.</p></div><button className="button-primary" onClick={() => navigate('/azure/az-900')}>AZ-900 Certification Preparation <ArrowRight size={15} /></button></section>
        <section className="topic-section"><div className="list-section-heading"><div><span className="section-overline">ADMINISTRATION FIELD GUIDE</span><h2>Explore Azure topics<span>.</span></h2></div><span className="section-count">{topics.length} TOPICS</span></div><div className="topic-cards">{topics.map((item) => <button className="topic-card" key={item.id} onClick={() => navigate(`/azure/topics/${encodeURIComponent(item.slug)}`)}><span className="topic-card-index">{String(item.order).padStart(2, '0')}</span><span className="topic-card-copy"><b>{item.name}</b><small>{item.description}</small></span><span className="topic-card-count"><small>QUESTIONS</small>{questions.filter((q) => q.topic_id === item.id).length}</span></button>)}</div></section>
        <section className="topic-section"><div className="list-section-heading"><div><span className="section-overline">PRACTICE INCIDENT RESPONSE</span><h2>Guided troubleshooting scenarios</h2></div><button className="azure-admin-text-link" onClick={() => navigate('/azure/scenarios')}>View all <ArrowRight size={14} /></button></div><div className="azure-admin-scenario-grid">{scenarios.slice(0, 4).map((item) => <button key={item.id} className="topic-card" onClick={() => navigate(`/azure/scenarios/${encodeURIComponent(item.slug)}`)}><span className="topic-card-index"><Wrench size={15} /></span><span className="topic-card-copy"><b>{item.title}</b><small>{item.symptoms[0]}</small></span><ChevronRight size={16} /></button>)}</div></section>
      </>}
      {!loading && !error && (view === 'questions' || view === 'topic') && <>
        <section className="dashboard-heading"><div><div className="eyebrow">AZURE ADMINISTRATION / ORIGINAL INTERVIEW MATERIAL</div><h1>{view === 'topic' ? activeTopic?.name ?? 'Topic not found' : 'Browse questions'}<span>.</span></h1><p>{view === 'topic' ? activeTopic?.description : 'Search and filter practical questions across Azure administration and operations.'}</p></div><div className="question-total"><strong>{visibleQuestions.length}</strong><span>QUESTIONS<br />MATCHED</span></div></section>
        <section className="question-browser"><div className="question-controls"><label className="search-field"><Search size={16} /><span className="sr-only">Search Azure interview questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, services, or concepts…" /><kbd>/</kbd>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label><label className="filter-label"><span className="sr-only">Filter by topic</span><select value={activeTopic?.id ?? topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="">All topics</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="filter-label"><span className="sr-only">Filter by difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as AzureAdminDifficulty | '')}><option value="">All levels</option>{levels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
          {visibleQuestions.length ? <div className="question-list">{visibleQuestions.map((item) => <button className="question-row" key={item.id} onClick={() => navigate(`/azure/questions/${encodeURIComponent(item.slug)}`)}><div className="question-row-main"><div className="question-row-meta"><span>{item.topic}</span><span className="meta-divider">/</span><span>ORIGINAL PRACTICE</span></div><h3>{item.question}</h3><p>{item.short_answer}</p></div><div className="question-row-end"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><ChevronRight size={17} /></div></button>)}</div> : <div className="browser-state empty-state"><Search size={20} /><b>No matching questions</b><span>Try another search or clear a filter.</span><button onClick={() => { setQuery(''); setTopicFilter(''); setDifficulty('') }}>Clear filters</button></div>}
        </section>
      </>}
      {!loading && !error && view === 'question' && question && <>
        <button className="back-to-questions" onClick={() => navigate(`/azure/topics/${encodeURIComponent(question.topic_id)}`)}><ArrowLeft size={14} /> Back to {question.topic}</button><article className="question-detail"><header className="detail-heading"><div className="detail-meta"><span>AZURE / {String(getTopic(question.topic_id)?.order ?? 0).padStart(2, '0')}</span><span className="meta-divider">/</span><span>{question.topic}</span><span className={`difficulty-badge difficulty-${question.difficulty}`}>{question.difficulty}</span></div><h1>{question.question}</h1><div className="detail-submeta"><span><Clock3 size={13} /> Original interview preparation</span><span>{question.id.toUpperCase()}</span></div></header>
          <section className="answer-summary"><div className="answer-label"><Check size={14} /> THE SHORT ANSWER</div><p>{question.short_answer}</p></section>
          <AdminDetailSection n="01" title="Technical explanation"><div className="prose-block"><p>{question.detailed_explanation}</p></div></AdminDetailSection>
          <AdminDetailSection n="02" title="Services and configuration"><ul className="detail-bullets">{question.services.map((service) => <li key={service}>{service}</li>)}</ul></AdminDetailSection>
          <AdminDetailSection n="03" title="Real-world example"><div className="detail-note"><Wrench size={15} /><p>{question.real_world_example}</p></div></AdminDetailSection>
          <AdminDetailSection n="04" title="Troubleshooting approach"><ol className="detail-steps">{question.troubleshooting_steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></AdminDetailSection>
          <section className="detail-section detail-split"><div><div className="detail-section-title"><span>05</span><h2>Common mistakes</h2></div><ul className="detail-bullets">{question.common_mistakes.map((item) => <li key={item}>{item}</li>)}</ul></div><div><div className="detail-section-title"><span>06</span><h2>Cost considerations</h2></div><div className="prose-block"><p>{question.cost_considerations}</p></div></div></section>
          <section className="followup-section"><div className="section-overline">KEEP GOING / FOLLOW-UP QUESTIONS</div>{question.follow_up_questions.map((item, i) => <div className="followup-row" key={item}><span>{String(i + 1).padStart(2, '0')}</span><p>{item}</p></div>)}</section>
        </article><section className="related-section"><div className="list-section-heading"><div><span className="section-overline">CONTINUE IN THIS TOPIC</span><h2>Related questions</h2></div><button onClick={() => navigate(`/azure/topics/${encodeURIComponent(question.topic_id)}`)}>View all <ArrowRight size={14} /></button></div><div className="related-list">{related.map((item) => <button key={item.id} onClick={() => navigate(`/azure/questions/${encodeURIComponent(item.slug)}`)}><span>{item.id.slice(-2)}</span><b>{item.question}</b><small>{item.difficulty}</small><ChevronRight size={15} /></button>)}</div></section>
      </>}
      {!loading && !error && (view === 'scenarios' || view === 'scenario') && <>
        <section className="dashboard-heading"><div><div className="eyebrow"><Wrench size={14} /> SIMULATED INCIDENT PRACTICE</div><h1>{view === 'scenario' ? scenario?.title ?? 'Scenario not found' : 'Troubleshooting labs'}<span>.</span></h1><p>Guided, simulated examples for building a repeatable diagnostic approach. These steps do not connect to or change Azure resources.</p></div><div className="question-total"><strong>{scenarios.length}</strong><span>SCENARIOS</span></div></section>
        {view === 'scenarios' && <div className="azure-admin-scenario-list">{scenarios.map((item) => <button className="question-row" key={item.id} onClick={() => navigate(`/azure/scenarios/${encodeURIComponent(item.slug)}`)}><div className="question-row-main"><div className="question-row-meta"><span>{getTopic(item.topic_id)?.name}</span><span className="meta-divider">/</span><span>SIMULATED</span></div><h3>{item.title}</h3><p>{item.symptoms[0]}</p></div><div className="question-row-end"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><ChevronRight size={17} /></div></button>)}</div>}
        {view === 'scenario' && scenario && <article className="azure-admin-scenario-detail"><button className="back-to-questions" onClick={() => navigate('/azure/scenarios')}><ArrowLeft size={14} /> All troubleshooting labs</button><div className="az900-disclaimer">Simulated training example. No commands are executed and no Azure resource is accessed.</div><AdminDetailSection n="01" title="Symptoms"><ul className="detail-bullets">{scenario.symptoms.map((item) => <li key={item}>{item}</li>)}</ul></AdminDetailSection>{scenario.diagnostic_steps.map((item, index) => <section className="detail-section azure-admin-check" key={item.step}><div className="detail-section-title"><span>{String(index + 2).padStart(2, '0')}</span><h2>{item.step}</h2></div><div className="prose-block"><p>{item.check}</p></div><div className="detail-note"><Check size={15} /><p><b>Expected observation:</b> {item.expected_observation}</p></div></section>)}<AdminDetailSection n="05" title="Reason through root causes"><div className="prose-block"><p>{scenario.root_cause_reasoning}</p></div></AdminDetailSection><AdminDetailSection n="06" title="Safe remediation"><ul className="detail-bullets">{scenario.safe_remediation.map((item) => <li key={item}>{item}</li>)}</ul></AdminDetailSection><AdminDetailSection n="07" title="Safety notes"><ul className="detail-bullets">{scenario.safety_notes.map((item) => <li key={item}>{item}</li>)}</ul></AdminDetailSection></article>}
      </>}
      {!loading && !error && view === 'question' && !question && <div className="browser-state empty-state"><b>Question not found</b><button onClick={() => navigate('/azure/questions')}>Browse questions</button></div>}
      {!loading && !error && view === 'scenario' && !scenario && <div className="browser-state empty-state"><b>Scenario not found</b><button onClick={() => navigate('/azure/scenarios')}>Browse scenarios</button></div>}
      {!loading && !error && view === 'topic' && !activeTopic && <div className="browser-state empty-state"><b>Topic not found</b><button onClick={() => navigate('/azure')}>Azure overview</button></div>}
      <footer className="learn-footer"><span>FIELDNOTES / AZURE ADMINISTRATION</span><span>Simulated learning · No resource deployments</span><a href="https://learn.microsoft.com/azure/" target="_blank" rel="noreferrer">Microsoft Azure documentation</a></footer>
    </div>
  </AzureAdministrationLayout>
}

function AdminDetailSection({ n, title, children }: { n: string; title: string; children: ReactNode }) { return <section className="detail-section"><div className="detail-section-title"><span>{n}</span><h2>{title}</h2></div>{children}</section> }
function BookOpenIcon() { return <Clock3 size={15} /> }
