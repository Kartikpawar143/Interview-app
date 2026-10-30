import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Clock3, ExternalLink, LoaderCircle, Network, RotateCcw, Search, ShieldAlert, ShieldCheck, Wrench, X } from 'lucide-react'
import { AzureAdministrationLayout } from '../components/azure/AzureAdministrationLayout'
import { getAzureAdminQuestion, getAzureAdminQuestions, getAzureAdminTopics, getAzureScenario, getAzureScenarios } from '../lib/api'
import type { AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic, AzureAdminDifficulty } from '../types/azureAdmin'
import type { Navigate } from '../lib/navigation'

type View = 'overview' | 'topic' | 'questions' | 'question' | 'scenarios' | 'scenario'
const levels: AzureAdminDifficulty[] = ['beginner', 'intermediate', 'advanced']
const SCENARIO_PROGRESS_KEY = 'fieldnotes.azure.scenarios.v1'
type ScenarioProgress = Record<string, { bestScore: number; attempts: number; completed: boolean }>

function readScenarioProgress(): ScenarioProgress {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SCENARIO_PROGRESS_KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ScenarioProgress : {}
  } catch { return {} }
}

export function AzureAdministrationPage({ navigate, view, slug }: { navigate: Navigate; view: View; slug?: string }) {
  const [topics, setTopics] = useState<AzureAdminTopic[]>([])
  const [questions, setQuestions] = useState<AzureAdminQuestion[]>([])
  const [scenarios, setScenarios] = useState<AzureAdminScenario[]>([])
  const [question, setQuestion] = useState<AzureAdminQuestion | null>(null)
  const [scenario, setScenario] = useState<AzureAdminScenario | null>(null)
  const [topicFilter, setTopicFilter] = useState('')
  const [difficulty, setDifficulty] = useState<AzureAdminDifficulty | ''>('')
  const [query, setQuery] = useState('')
  const [reviewedChecks, setReviewedChecks] = useState<string[]>([])
  const [rootCauseRevealed, setRootCauseRevealed] = useState(false)
  const [runCompleted, setRunCompleted] = useState(false)
  const [scenarioProgress, setScenarioProgress] = useState<ScenarioProgress>(() => readScenarioProgress())
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
  const activeScenario = view === 'scenario' ? scenarios.find((item) => item.slug === slug || item.id === slug) : undefined
  const checkedCount = scenario ? reviewedChecks.length : 0
  const scenarioScore = scenario ? Math.round(checkedCount / Math.max(1, scenario.diagnostic_steps.length) * 100) : 0
  const scenarioQuestions = scenario ? questions.filter((item) => item.topic_id === scenario.topic_id).slice(0, 4) : []
  const completedScenarioCount = scenarios.filter((item) => scenarioProgress[item.id]?.completed).length

  useEffect(() => { setReviewedChecks([]); setRootCauseRevealed(false); setRunCompleted(false) }, [slug])

  const finishScenario = () => {
    if (!scenario || reviewedChecks.length < scenario.diagnostic_steps.length) return
    const current = scenarioProgress[scenario.id]
    const next = { ...scenarioProgress, [scenario.id]: { bestScore: Math.max(current?.bestScore ?? 0, scenarioScore), attempts: (current?.attempts ?? 0) + 1, completed: true } }
    setScenarioProgress(next)
    setRunCompleted(true)
    try { window.localStorage.setItem(SCENARIO_PROGRESS_KEY, JSON.stringify(next)) } catch { /* Keep this scenario usable when storage is unavailable. */ }
  }
  const resetScenario = () => { setReviewedChecks([]); setRootCauseRevealed(false); setRunCompleted(false) }

  return <AzureAdministrationLayout topics={topics} scenarios={scenarios} activeScenarioId={activeScenario?.id} activeTopic={activeTopic?.id} activeItem={view === 'questions' || view === 'question' ? 'questions' : view === 'scenarios' || view === 'scenario' ? 'scenarios' : 'overview'} navigate={navigate} eyebrow={view === 'questions' || view === 'question' ? 'QUESTION LIBRARY' : view === 'scenarios' || view === 'scenario' ? 'TROUBLESHOOTING LABS' : 'AZURE ADMINISTRATION'}>
    <div className="learn-content azure-admin-content">
      <div className="learn-breadcrumb"><button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} /><button onClick={() => navigate('/azure')}>AZURE</button>{view !== 'overview' && <><ChevronRight size={12} /><span>{view === 'question' || view === 'questions' ? 'QUESTION LIBRARY' : view === 'scenario' || view === 'scenarios' ? 'TROUBLESHOOTING' : activeTopic?.name.toUpperCase() ?? 'TOPIC'}</span></>}</div>
      {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading Azure administration content…</div>}
      {!loading && error && <div className="browser-state browser-error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
      {!loading && !error && view === 'overview' && <>
        <section className="dashboard-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> AZURE / ADMINISTRATION &amp; INTERVIEW PREP</div><h1>Operate Azure<br /><span>with confidence.</span></h1><p>Practical administration concepts, original interview questions, and simulated troubleshooting guides. This learning area is separate from the AZ-900 certification course.</p></div><div className="question-total"><strong>{questions.length}</strong><span>ORIGINAL<br />QUESTIONS</span></div></section>
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
        <div className="azure-labs-simulated-banner"><ShieldAlert size={16} /><span><b>SIMULATED LAB ENVIRONMENT</b> Checks are training content. No Azure command or resource operation is executed.</span></div>
        {view === 'scenarios' && <>
          <header className="azure-labs-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AZURE / INCIDENT RESPONSE PRACTICE</div><h1>Trace the symptoms.<br /><span>Build your diagnosis.</span></h1><p>Review each simulated incident, inspect the diagnostic checks, and connect observations to safe remediation.</p></div><div className="azure-labs-heading-count"><b>{scenarios.length}</b><span>SIMULATED<br />LABS</span></div></header>
          <div className="azure-labs-summary"><span><Check size={14} /> {completedScenarioCount} completed</span><span><CircleHelp size={14} /> {scenarios.reduce((total, item) => total + item.diagnostic_steps.length, 0)} diagnostic checks</span><span><ShieldCheck size={14} /> No live Azure operations</span></div>
          {scenarios.length ? <div className="azure-labs-grid">{scenarios.map((item, index) => { const record = scenarioProgress[item.id]; return <button type="button" className="azure-lab-card" key={item.id} onClick={() => navigate(`/azure/scenarios/${encodeURIComponent(item.slug)}`)}><span className="azure-lab-card-top"><span>{String(index + 1).padStart(2, '0')} / {getTopic(item.topic_id)?.name ?? 'AZURE'}</span>{record?.completed ? <Check size={15} aria-label="Completed" /> : <ChevronRight size={16} />}</span><h2>{item.title}</h2><p>{item.symptoms[0]}</p><span className="azure-lab-card-bottom"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><span>{item.diagnostic_steps.length} diagnostic checks</span>{record?.completed && <b>Best {record.bestScore}%</b>}</span></button> })}</div> : <div className="browser-state empty-state"><b>No simulated Azure labs are available</b></div>}
        </>}
        {view === 'scenario' && scenario && <article className="azure-admin-scenario-detail">
          <button className="back-to-questions" onClick={() => navigate('/azure/scenarios')}><ArrowLeft size={14} /> Back to all labs</button>
          <header className="azure-lab-detail-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SIMULATED INCIDENT / {(getTopic(scenario.topic_id)?.name ?? 'AZURE').toUpperCase()}</div><h1>{scenario.title}<span>.</span></h1><p>{scenario.symptoms[0]}</p><div className="azure-lab-detail-tags"><span className={`difficulty-badge difficulty-${scenario.difficulty}`}>{scenario.difficulty}</span><span><CircleHelp size={13} /> {scenario.diagnostic_steps.length} diagnostic checks</span><span>NO LIVE OPERATIONS</span></div></div><div className="azure-lab-score"><span>REVIEW SCORE</span><b>{scenarioScore}<small>/ 100</small></b><span>{runCompleted ? 'COMPLETED' : `${checkedCount} / ${scenario.diagnostic_steps.length} checks`}</span></div></header>
          <section className="azure-lab-symptoms"><div className="section-overline">INCIDENT SYMPTOMS</div><ul>{scenario.symptoms.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <div className="azure-lab-workbench">
            <section className="azure-lab-check-panel"><div className="azure-lab-section-heading"><div><span className="section-overline">01 / INSPECT DIAGNOSTIC CHECKS</span><h2>Investigation guide</h2><p>Review each check and its expected observation to build a diagnosis.</p></div><span className="azure-lab-check-count">{checkedCount} / {scenario.diagnostic_steps.length} reviewed</span></div>
              <div className="azure-lab-check-list">{scenario.diagnostic_steps.map((item, index) => { const reviewed = reviewedChecks.includes(item.step); return <article className={`azure-lab-check${reviewed ? ' is-reviewed' : ''}`} key={item.step}><div className="azure-lab-check-heading"><span>CHECK {String(index + 1).padStart(2, '0')}</span>{reviewed && <Check size={14} />}</div><h3>{item.step}</h3><p>{item.check}</p>{reviewed && <div className="azure-lab-observation"><b>Expected observation</b><p>{item.expected_observation}</p></div>}<button type="button" aria-expanded={reviewed} onClick={() => setReviewedChecks((current) => reviewed ? current.filter((step) => step !== item.step) : [...current, item.step])}>{reviewed ? 'Hide expected observation' : 'Reveal expected observation'} <ChevronRight size={14} /></button></article> })}</div>
              {rootCauseRevealed && <section className="azure-lab-root-cause"><div className="section-overline">02 / REASON THROUGH ROOT CAUSES</div><h2>Connect the observations</h2><p>{scenario.root_cause_reasoning}</p><button type="button" className="azure-lab-complete-button" disabled={runCompleted} onClick={finishScenario}>{runCompleted ? 'Lab completed' : 'Complete lab'} <Check size={14} /></button>{runCompleted && <p className="azure-lab-complete-message" role="status">Lab complete. You reviewed all diagnostic checks and the root-cause reasoning.</p>}</section>}
              {!rootCauseRevealed && <section className="azure-lab-root-cause-prompt"><div className="section-overline">02 / IDENTIFY THE ROOT CAUSE</div><h2>Ready to connect the evidence?</h2><p>Reveal the reasoning after reviewing all {scenario.diagnostic_steps.length} diagnostic checks.</p><button type="button" className="azure-lab-complete-button" disabled={checkedCount !== scenario.diagnostic_steps.length} onClick={() => setRootCauseRevealed(true)}>Reveal root-cause reasoning <ArrowRight size={14} /></button></section>}
              {runCompleted && <section className="azure-lab-resolution"><div className="azure-lab-complete-mark"><Check size={18} /></div><div className="section-overline">SIMULATED INCIDENT RESOLVED</div><h2>Safe next steps</h2><div className="azure-lab-resolution-columns"><div><b>Safe remediation</b><ol>{scenario.safe_remediation.map((item) => <li key={item}>{item}</li>)}</ol></div><div><b>Safety notes</b><ul>{scenario.safety_notes.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>}
            </section>
            <aside className="azure-lab-side-panel"><div className="section-overline">LAB PROGRESS</div><div className="azure-lab-progress-track" role="progressbar" aria-label="Diagnostic review progress" aria-valuemin={0} aria-valuemax={scenario.diagnostic_steps.length} aria-valuenow={checkedCount}><span style={{ width: `${scenarioScore}%` }} /></div><p>{runCompleted ? 'All diagnostic checks reviewed.' : `${checkedCount} of ${scenario.diagnostic_steps.length} diagnostic checks reviewed.`}</p>{scenarioProgress[scenario.id]?.completed && <small>Best review score: {scenarioProgress[scenario.id].bestScore}% · {scenarioProgress[scenario.id].attempts} {scenarioProgress[scenario.id].attempts === 1 ? 'attempt' : 'attempts'}</small>}<button type="button" className="azure-lab-reset" onClick={resetScenario}><RotateCcw size={14} /> Reset / retry</button>
              <div className="azure-lab-reference"><div className="section-overline">RELATED TOPIC</div><button type="button" onClick={() => navigate(`/azure/topics/${encodeURIComponent(getTopic(scenario.topic_id)?.slug ?? scenario.topic_id)}`)}><BookOpen size={14} />{getTopic(scenario.topic_id)?.name ?? scenario.topic_id}<ArrowRight size={13} /></button></div>
              <div className="azure-lab-reference"><div className="section-overline">INTERVIEW LIBRARY</div>{scenarioQuestions.map((item) => <button type="button" key={item.id} onClick={() => navigate(`/azure/questions/${encodeURIComponent(item.slug)}`)}>{item.question}<ExternalLink size={12} /></button>)}</div>
              <div className="azure-lab-reference"><div className="section-overline">AZURE VISUAL LEARNING</div><button type="button" onClick={() => navigate('/azure/visual-learning')}><Network size={14} />Open related diagrams<ArrowRight size={13} /></button></div>
            </aside>
          </div>
        </article>}
      </>}
      {!loading && !error && view === 'question' && !question && <div className="browser-state empty-state"><b>Question not found</b><button onClick={() => navigate('/azure/questions')}>Browse questions</button></div>}
      {!loading && !error && view === 'scenario' && !scenario && <div className="browser-state empty-state"><b>Scenario not found</b><button onClick={() => navigate('/azure/scenarios')}>Browse scenarios</button></div>}
      {!loading && !error && view === 'topic' && !activeTopic && <div className="browser-state empty-state"><b>Topic not found</b><button onClick={() => navigate('/azure')}>Azure overview</button></div>}
      <footer className="learn-footer"><span>FIELDNOTES / AZURE ADMINISTRATION</span><span>Simulated learning · No resource deployments</span><a href="https://learn.microsoft.com/azure/" target="_blank" rel="noreferrer">Microsoft Azure documentation</a></footer>
    </div>
  </AzureAdministrationLayout>
}

function AdminDetailSection({ n, title, children }: { n: string; title: string; children: ReactNode }) { return <section className="detail-section"><div className="detail-section-title"><span>{n}</span><h2>{title}</h2></div>{children}</section> }
