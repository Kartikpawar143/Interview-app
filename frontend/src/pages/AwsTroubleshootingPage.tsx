import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Clock3, ExternalLink, FileText, Lightbulb, LoaderCircle, RotateCcw, ShieldAlert, TerminalSquare } from 'lucide-react'
import { AwsLayout } from '../components/aws/AwsLayout'
import { getAwsQuestions, getAwsTopics, getAwsTroubleshootingLabs, getAwsVisualDiagrams } from '../lib/api'
import { scoreLabAttempt } from '../lib/awsTroubleshooting'
import type { Navigate } from '../lib/navigation'
import type { AwsQuestion, AwsTopic, AwsTroubleshootingLab, AwsVisualDiagram, AwsVisualNode } from '../types/aws'

const PROGRESS_KEY = 'fieldnotes.aws.troubleshooting.v1'
type LabProgress = Record<string, { bestScore: number; attempts: number; completed: boolean }>

function readProgress(): LabProgress {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item && typeof item === 'object' && Number.isFinite((item as { bestScore?: unknown }).bestScore))) as LabProgress
  } catch { return {} }
}

function edgePath(from: AwsVisualNode, to: AwsVisualNode) {
  const width = 166, height = 82
  const sx = from.x + width / 2, sy = from.y + height / 2, tx = to.x + width / 2, ty = to.y + height / 2
  const dx = tx - sx, dy = ty - sy
  const factor = 1 / Math.max(Math.abs(dx) / (width / 2), Math.abs(dy) / (height / 2))
  return `M ${sx + dx * factor} ${sy + dy * factor} L ${tx - dx * factor} ${ty - dy * factor}`
}

export function AwsTroubleshootingPage({ navigate, slug }: { navigate: Navigate; slug?: string }) {
  const [labs, setLabs] = useState<AwsTroubleshootingLab[]>([])
  const [topics, setTopics] = useState<AwsTopic[]>([])
  const [questions, setQuestions] = useState<AwsQuestion[]>([])
  const [diagrams, setDiagrams] = useState<AwsVisualDiagram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<LabProgress>(() => readProgress())
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [openedEvidence, setOpenedEvidence] = useState<string[]>([])
  const [diagnosticIndex, setDiagnosticIndex] = useState(0)
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({})
  const [diagnosticMistakes, setDiagnosticMistakes] = useState<Record<string, number>>({})
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<Record<string, string>>({})
  const [shownHints, setShownHints] = useState<string[]>([])
  const [rootAnswer, setRootAnswer] = useState('')
  const [rootMistakes, setRootMistakes] = useState(0)
  const [rootFeedback, setRootFeedback] = useState('')
  const lab = labs.find((item) => item.slug === slug || item.id === slug)
  const diagram = useMemo(() => diagrams.find((item) => item.id === lab?.diagram_id), [diagrams, lab])
  const currentNode = diagram?.nodes.find((node) => node.id === selectedNodeId) ?? diagram?.nodes.find((node) => lab?.node_ids.includes(node.id))
  const correctSteps = lab?.diagnostic_steps.filter((step) => diagnosticAnswers[step.id] === step.options.find((option) => option.correct)?.id).length ?? 0
  const completed = Boolean(lab && rootAnswer === lab.root_cause_id && diagnosticIndex >= lab.diagnostic_steps.length)
  const maxScore = lab ? lab.diagnostic_steps.length * 10 + 20 : 0
  const score = lab ? scoreLabAttempt(lab, diagnosticAnswers, diagnosticMistakes, completed, rootMistakes, shownHints.length) : 0
  const selectedTopic = topics.find((topic) => topic.id === lab?.topic_id)
  const relatedQuestions = lab?.related_question_ids.map((id) => questions.find((question) => question.id === id)).filter((question): question is AwsQuestion => Boolean(question)) ?? []

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAwsTroubleshootingLabs(controller.signal), getAwsTopics(controller.signal), getAwsQuestions({}, controller.signal), getAwsVisualDiagrams(controller.signal)])
      .then(([labData, topicData, questionData, diagramData]) => { setLabs(labData); setTopics(topicData); setQuestions(questionData); setDiagrams(diagramData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load AWS troubleshooting labs.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setSelectedNodeId(''); setOpenedEvidence([]); setDiagnosticIndex(0); setDiagnosticAnswers({}); setDiagnosticMistakes({}); setDiagnosticFeedback({}); setShownHints([]); setRootAnswer(''); setRootMistakes(0); setRootFeedback('')
  }, [slug])

  const persistCompletion = (scoreValue: number) => {
    if (!lab) return
    const next = { ...progress, [lab.id]: { bestScore: Math.max(progress[lab.id]?.bestScore ?? 0, scoreValue), attempts: (progress[lab.id]?.attempts ?? 0) + 1, completed: true } }
    setProgress(next)
    try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch { /* Keep this attempt usable when storage is unavailable. */ }
  }
  const resetAttempt = () => { setSelectedNodeId(''); setOpenedEvidence([]); setDiagnosticIndex(0); setDiagnosticAnswers({}); setDiagnosticMistakes({}); setDiagnosticFeedback({}); setShownHints([]); setRootAnswer(''); setRootMistakes(0); setRootFeedback('') }
  const selectDiagnostic = (stepId: string, optionId: string) => {
    if (!lab || diagnosticAnswers[stepId]) return
    const step = lab.diagnostic_steps.find((item) => item.id === stepId)
    const option = step?.options.find((item) => item.id === optionId)
    if (!option) return
    if (option.correct) { setDiagnosticAnswers((current) => ({ ...current, [stepId]: optionId })); setDiagnosticIndex((index) => index + 1) }
    else { setDiagnosticMistakes((current) => ({ ...current, [stepId]: (current[stepId] ?? 0) + 1 })); setDiagnosticFeedback((current) => ({ ...current, [stepId]: option.feedback })) }
  }
  const selectRootCause = (optionId: string) => {
    if (!lab || rootAnswer) return
    if (optionId === lab.root_cause_id) { setRootAnswer(optionId); persistCompletion(Math.max(0, correctSteps * 10 + 20 - Object.values(diagnosticMistakes).reduce((sum, count) => sum + count * 3, 0) - rootMistakes * 3 - shownHints.length * 2)) }
    else { setRootMistakes((count) => count + 1); setRootFeedback(lab.root_cause_options.find((option) => option.id === optionId)?.feedback ?? 'Review the evidence and try another cause.') }
  }
  const showHint = (stepId: string) => setShownHints((current) => current.includes(stepId) ? current : [...current, stepId])

  return <AwsLayout topics={topics} activeTopic={selectedTopic?.id} activeItem="troubleshooting" navigate={navigate}>
    <div className="learn-content aws-content aws-labs-page">
      <div className="learn-breadcrumb" aria-label="Breadcrumb"><button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} /><button onClick={() => navigate('/aws')}>AWS CLOUD</button><ChevronRight size={12} /><span>TROUBLESHOOTING LABS</span></div>
      <div className="aws-labs-simulated-banner"><ShieldAlert size={16} /><span><b>SIMULATED LAB ENVIRONMENT</b> Evidence and actions are fictional training content. No AWS command or cloud operation is executed.</span></div>
      {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading troubleshooting labs…</div>}
      {!loading && error && <div className="browser-state browser-error" role="alert"><b>AWS troubleshooting labs are unavailable</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
      {!loading && !error && !lab && <>
        <header className="aws-labs-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AWS CLOUD / INCIDENT RESPONSE PRACTICE</div><h1>Trace the evidence.<br /><span>Find the cause.</span></h1><p>Work through 12 simulated incidents using architecture context, logs, configuration evidence, and safe diagnostic choices.</p></div><div className="aws-labs-heading-count"><b>{labs.length}</b><span>SIMULATED<br />LABS</span></div></header>
        <div className="aws-labs-summary"><span><Check size={14} /> {Object.values(progress).filter((item) => item.completed).length} completed</span><span><CircleHelp size={14} /> Hints and mistakes affect score</span><span><TerminalSquare size={14} /> No live AWS actions</span></div>
        {labs.length ? <div className="aws-labs-grid">{labs.map((item, index) => { const record = progress[item.id]; return <button type="button" className="aws-lab-card" key={item.id} onClick={() => navigate(`/aws/troubleshooting/${encodeURIComponent(item.slug)}`)}><span className="aws-lab-card-top"><span>{String(index + 1).padStart(2, '0')} / {item.category}</span>{record?.completed ? <Check size={15} aria-label="Completed" /> : <ChevronRight size={16} />}</span><h2>{item.title}</h2><p>{item.summary}</p><span className="aws-lab-card-bottom"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><span>{item.diagnostic_steps.length} diagnostic steps</span>{record?.completed && <b>Best {record.bestScore}</b>}</span></button> })}</div> : <div className="browser-state empty-state"><b>No simulated AWS labs are available</b></div>}
      </>}
      {!loading && !error && lab && <>
        <button className="back-to-questions" onClick={() => navigate('/aws/troubleshooting')}><ArrowLeft size={14} /> Back to all labs</button>
        <header className="aws-lab-detail-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SIMULATED INCIDENT / {lab.category.toUpperCase()}</div><h1>{lab.title}<span>.</span></h1><p>{lab.summary}</p><div className="aws-lab-detail-tags"><span className={`difficulty-badge difficulty-${lab.difficulty}`}>{lab.difficulty}</span><span><Clock3 size={13} /> 8–12 min</span><span>NO LIVE AWS OPERATIONS</span></div></div><div className="aws-lab-score"><span>ATTEMPT SCORE</span><b>{score} <small>/ {maxScore}</small></b><span>{completed ? 'COMPLETED' : `${diagnosticIndex} / ${lab.diagnostic_steps.length} checks`}</span></div></header>
        <section className="aws-lab-symptoms"><div className="section-overline">INCIDENT SYMPTOMS</div><ul>{lab.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}</ul></section>
        {diagram && <section className="aws-lab-architecture"><div className="aws-lab-section-heading"><div><span className="section-overline">ARCHITECTURE CONTEXT / REUSED AWS DIAGRAM</span><h2>{diagram.title}</h2><p>{diagram.summary} Select a component to associate evidence with its role.</p></div><button type="button" onClick={() => navigate('/aws/visual-learning')}>Open visual learning <ArrowRight size={13} /></button></div>
          <div className="aws-lab-svg-viewport" role="group" aria-label="Simulated lab architecture, select a component">
            <svg className="aws-lab-svg" viewBox={`0 0 ${diagram.width} ${diagram.height}`} role="group" aria-label={`${diagram.title} with original AWS architecture connections`}>
              <g className="aws-lab-groups" aria-hidden="true">{diagram.groups.map((group) => <g key={group.id} className={`aws-lab-boundary boundary-${group.kind}`}><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="9"/><text x={group.x + 14} y={group.y + 22}>{group.title}</text><text x={group.x + 14} y={group.y + 39}>{group.caption}</text></g>)}</g>
              <g className="aws-lab-edges">{diagram.edges.map((edge) => { const from = diagram.nodes.find((node) => node.id === edge.source); const to = diagram.nodes.find((node) => node.id === edge.target); if (!from || !to) return null; const mx = (from.x + to.x + 166) / 2, my = (from.y + to.y + 82) / 2; return <g key={edge.id} className={`aws-lab-edge-wrap ${lab.node_ids.includes(edge.source) && lab.node_ids.includes(edge.target) ? 'is-relevant' : ''}`}><path d={edgePath(from, to)} className={`aws-lab-edge kind-${edge.kind}`} markerEnd={`url(#lab-arrow-${diagram.id}-${edge.kind})`}/><text x={mx} y={my - 7} textAnchor="middle">{edge.label}</text></g> })}</g>
              <defs>{(['traffic','authorization','control','event','replication','monitoring','recovery','containment'] as const).map((kind) => <marker key={kind} id={`lab-arrow-${diagram.id}-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker>)}</defs>
              {diagram.nodes.map((node) => <g key={node.id} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`Inspect ${node.label}${lab.node_ids.includes(node.id) ? ', relevant to this lab' : ''}`} aria-pressed={(currentNode?.id ?? lab.node_ids[0]) === node.id} className={`aws-lab-node${lab.node_ids.includes(node.id) ? ' is-relevant' : ''}${(currentNode?.id ?? lab.node_ids[0]) === node.id ? ' is-selected' : ''}`} onClick={() => setSelectedNodeId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNodeId(node.id) } }}><rect width="166" height="82" rx="7"/><rect className="aws-lab-node-badge" x="10" y="12" width="36" height="22" rx="4"/><text className="aws-lab-node-code" x="28" y="27" textAnchor="middle">{node.code}</text><text className="aws-lab-node-label" x="54" y="29">{node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}</text><text className="aws-lab-node-meta" x="83" y="64" textAnchor="middle">{lab.node_ids.includes(node.id) ? 'LAB COMPONENT' : node.services[0]}</text></g>)}
            </svg>
          </div>
          {currentNode && <div className="aws-lab-node-inspector" aria-live="polite"><b>{currentNode.label}</b><p>{currentNode.description}</p><span>{currentNode.purpose}</span><span className="aws-lab-node-services">{currentNode.services.join(' · ')}</span></div>}
        </section>}
        <div className="aws-lab-workbench">
          <section className="aws-lab-evidence-panel"><div className="aws-lab-section-heading"><div><span className="section-overline">01 / INSPECT EVIDENCE</span><h2>Logs and configuration</h2><p>Open the evidence needed for the current diagnostic step.</p></div><span className="aws-lab-evidence-progress">{openedEvidence.length} / {lab.evidence.length} inspected</span></div><div className="aws-lab-evidence-list">{lab.evidence.map((item) => { const open = openedEvidence.includes(item.id); const node = diagram?.nodes.find((entry) => entry.id === item.node_id); return <article className={`aws-lab-evidence${open ? ' is-open' : ''}`} key={item.id}><button type="button" aria-expanded={open} onClick={() => { setOpenedEvidence((current) => open ? current : [...current, item.id]); setSelectedNodeId(item.node_id) }}><span className={`aws-lab-evidence-kind kind-${item.kind}`}>{item.kind === 'log' ? <TerminalSquare size={14}/> : item.kind === 'metric' ? <CircleHelp size={14}/> : <FileText size={14}/>} {item.kind}</span><b>{item.label}</b><ChevronRight size={14}/></button>{open && <div className="aws-lab-evidence-content"><pre>{item.content}</pre>{node && <span>Component: {node.label}</span>}</div>}</article> })}</div>
            {diagnosticIndex > 0 && <div className="aws-lab-passed-steps" aria-live="polite"><b>Diagnostic progress</b>{lab.diagnostic_steps.slice(0, diagnosticIndex).map((step) => { const answer = step.options.find((option) => option.id === diagnosticAnswers[step.id]); return <p key={step.id}><Check size={12}/> {answer?.feedback}</p> })}</div>}
            {!completed && diagnosticIndex < lab.diagnostic_steps.length && <div className="aws-lab-diagnostic"><div className="section-overline">02 / DIAGNOSTIC ACTION {String(diagnosticIndex + 1).padStart(2, '0')} OF {String(lab.diagnostic_steps.length).padStart(2, '0')}</div><h2>{lab.diagnostic_steps[diagnosticIndex].prompt}</h2><p className="aws-lab-evidence-requirement">Evidence to review: {lab.diagnostic_steps[diagnosticIndex].evidence_ids.map((id) => lab.evidence.find((item) => item.id === id)?.label).join(' · ')}</p><p className="aws-lab-action-hint">{lab.diagnostic_steps[diagnosticIndex].evidence_ids.every((id) => openedEvidence.includes(id)) ? 'Evidence reviewed. Choose a diagnostic action.' : 'You can choose an action now or inspect the evidence first.'}</p><div className="aws-lab-options">{lab.diagnostic_steps[diagnosticIndex].options.map((option) => { const wasSelected = diagnosticAnswers[lab.diagnostic_steps[diagnosticIndex].id] === option.id; return <button type="button" key={option.id} disabled={Boolean(diagnosticAnswers[lab.diagnostic_steps[diagnosticIndex].id])} className={`${wasSelected ? 'is-correct' : ''}`} onClick={() => selectDiagnostic(lab.diagnostic_steps[diagnosticIndex].id, option.id)}><span>{option.correct ? <Check size={14}/> : <ArrowRight size={14}/>}</span>{option.label}</button> })}</div>{diagnosticMistakes[lab.diagnostic_steps[diagnosticIndex].id] > 0 && <p className="aws-lab-feedback is-incorrect" role="status">{diagnosticFeedback[lab.diagnostic_steps[diagnosticIndex].id]} Incorrect attempts reduce the score.</p>}{shownHints.includes(lab.diagnostic_steps[diagnosticIndex].id) && <p className="aws-lab-hint" role="status"><Lightbulb size={14}/>{lab.diagnostic_steps[diagnosticIndex].hint}</p>}<button className="aws-lab-hint-button" type="button" onClick={() => showHint(lab.diagnostic_steps[diagnosticIndex].id)} disabled={shownHints.includes(lab.diagnostic_steps[diagnosticIndex].id)}><Lightbulb size={14}/> {shownHints.includes(lab.diagnostic_steps[diagnosticIndex].id) ? 'Hint revealed' : 'Show progressive hint'}</button></div>}
            {diagnosticIndex >= lab.diagnostic_steps.length && !completed && <section className="aws-lab-root-cause"><div className="section-overline">03 / IDENTIFY THE ROOT CAUSE</div><h2>What best explains the incident?</h2><div className="aws-lab-options">{lab.root_cause_options.map((option) => <button type="button" key={option.id} onClick={() => selectRootCause(option.id)}><span>{option.correct ? <Check size={14}/> : <CircleHelp size={14}/>}</span>{option.label}</button>)}</div>{rootMistakes > 0 && <p className="aws-lab-feedback is-incorrect" role="status">{rootFeedback}</p>}</section>}
            {completed && <section className="aws-lab-completion" aria-live="polite"><div className="aws-lab-complete-mark"><Check size={18}/></div><div className="section-overline">SIMULATED INCIDENT RESOLVED</div><h2>Root cause identified</h2><p>{lab.root_cause_explanation}</p><div className="aws-lab-completion-columns"><div><b>Safe remediation</b><ol>{lab.remediation.map((item) => <li key={item}>{item}</li>)}</ol></div><div><b>Verification plan</b><ol>{lab.verification.map((item) => <li key={item}>{item}</li>)}</ol></div></div><div className="aws-lab-interview-notes"><b>Interview takeaways</b><ul>{lab.interview_takeaways.map((item) => <li key={item}>{item}</li>)}</ul></div><button type="button" className="aws-lab-retry" onClick={resetAttempt}><RotateCcw size={14}/> Retry lab</button></section>}
          </section>
          <aside className="aws-lab-side-panel"><div className="section-overline">LAB PROGRESS</div><div className="aws-lab-progress-track"><span style={{ width: `${Math.min(100, completed ? 100 : (diagnosticIndex / (lab.diagnostic_steps.length + 1)) * 100)}%` }}/></div><p>{completed ? 'All diagnostics complete.' : `${diagnosticIndex} of ${lab.diagnostic_steps.length} diagnostic checks complete.`}</p><button type="button" className="aws-lab-reset" onClick={resetAttempt}><RotateCcw size={14}/> Reset / retry</button><div className="aws-lab-reference"><div className="section-overline">RELATED TOPIC</div><button type="button" onClick={() => navigate(`/aws/topics/${encodeURIComponent(lab.topic_id)}`)}><BookOpen size={14}/>{selectedTopic?.name ?? lab.topic_id}<ArrowRight size={13}/></button></div><div className="aws-lab-reference"><div className="section-overline">INTERVIEW LIBRARY</div>{relatedQuestions.map((question) => <button type="button" key={question.id} onClick={() => navigate(`/aws/questions/${encodeURIComponent(question.slug)}`)}>{question.question}<ExternalLink size={12}/></button>)}</div><div className="aws-lab-reference"><div className="section-overline">ARCHITECTURE DIAGRAM</div><button type="button" onClick={() => navigate('/aws/visual-learning')}><CircleHelp size={14}/>{diagram?.title ?? 'Open visual learning'}<ArrowRight size={13}/></button></div></aside>
        </div>
      </>}
      <footer className="learn-footer"><span>FIELDNOTES / AWS TROUBLESHOOTING</span><span>Simulated evidence · No account access or cloud operations</span></footer>
    </div>
  </AwsLayout>
}
