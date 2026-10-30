import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
// @ts-ignore Anime.js is already used by the Linux and Azure visual-learning pages.
import { animate } from 'animejs'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Network, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { AwsLayout } from '../components/aws/AwsLayout'
import { getAwsQuestions, getAwsTopics, getAwsVisualDiagrams } from '../lib/api'
import type { Navigate } from '../lib/navigation'
import type { AwsQuestion, AwsTopic, AwsVisualDiagram, AwsVisualEdge, AwsVisualNode } from '../types/aws'
import { buildAwsVisualQuiz, clampWalkthroughStep, getAwsNodeConnections, getAwsNodeLearningNotes, getWalkthroughEdgeIds, layoutAwsEdgeLabels, scoreAwsVisualQuiz, wrapAwsNodeLabel, walkthroughCaption } from '../lib/awsVisualLearning'

const NODE_W = 166
const NODE_H = 82
const GUIDED_DIAGRAMS = new Set(['vpc-networking', 'iam-authorization', 'cicd-pipeline', 'backup-disaster-recovery'])

function edgePath(from: AwsVisualNode, to: AwsVisualNode) {
  const sx = from.x + NODE_W / 2, sy = from.y + NODE_H / 2
  const tx = to.x + NODE_W / 2, ty = to.y + NODE_H / 2
  const dx = tx - sx, dy = ty - sy
  const factor = 1 / Math.max(Math.abs(dx) / (NODE_W / 2), Math.abs(dy) / (NODE_H / 2))
  return `M ${sx + dx * factor} ${sy + dy * factor} L ${tx - dx * factor} ${ty - dy * factor}`
}

export function AwsVisualLearningPage({ navigate, requestedDiagramId }: { navigate: Navigate; requestedDiagramId?: string }) {
  const [diagrams, setDiagrams] = useState<AwsVisualDiagram[]>([])
  const [topics, setTopics] = useState<AwsTopic[]>([])
  const [questions, setQuestions] = useState<AwsQuestion[]>([])
  const [diagramId, setDiagramId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [sequenceStep, setSequenceStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [staticMode, setStaticMode] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const selectedAnimationRef = useRef<ReturnType<typeof animate> | null>(null)
  const diagram = useMemo(() => diagrams.find((item) => item.id === diagramId), [diagrams, diagramId])
  const selectedNode = diagram?.nodes.find((node) => node.id === selectedNodeId) ?? diagram?.nodes[0]
  const sequenceIds = diagram?.sequence ?? []
  const relatedQuestions = useMemo(() => selectedNode ? selectedNode.question_ids.map((id) => questions.find((item) => item.id === id)).filter((item): item is AwsQuestion => Boolean(item)) : [], [selectedNode, questions])
  const quiz = useMemo(() => diagram ? buildAwsVisualQuiz(diagram, questions) : [], [diagram, questions])
  const quizScore = scoreAwsVisualQuiz(quiz, quizAnswers)
  const quizAnsweredCount = Object.keys(quizAnswers).filter((id) => quiz.some((item) => item.id === id)).length
  const quizComplete = quiz.length > 0 && quizAnsweredCount === quiz.length
  const practiceQuestions = useMemo(() => {
    if (!diagram) return []
    const seen = new Set<string>()
    return diagram.nodes.flatMap((node) => node.question_ids.flatMap((id) => {
      const question = questions.find((item) => item.id === id)
      if (!question || seen.has(id)) return []
      seen.add(id)
      return [{ question, node }]
    }))
  }, [diagram, questions])
  const connections = useMemo(() => diagram && selectedNode ? getAwsNodeConnections(diagram, selectedNode.id) : [], [diagram, selectedNode])
  const edgeLabelLayouts = useMemo(() => diagram ? layoutAwsEdgeLabels(diagram, NODE_W, NODE_H) : [], [diagram])
  const nodeNotes = useMemo(() => selectedNode ? getAwsNodeLearningNotes(selectedNode, relatedQuestions, questions) : { commonMistakes: [], securityConsiderations: [] }, [selectedNode, relatedQuestions, questions])
  const activeEdgeIds = useMemo(() => diagram && !staticMode ? getWalkthroughEdgeIds(diagram, sequenceStep) : [], [diagram, sequenceStep, staticMode])
  const walkthroughCaptionText = diagram ? walkthroughCaption(diagram, sequenceStep) : ''
  const hasGuidedWalkthrough = Boolean(diagram && (GUIDED_DIAGRAMS.has(diagram.id) || diagram.sequence.length > 1))
  const topic = selectedNode && topics.find((item) => item.id === selectedNode.topic_id)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAwsVisualDiagrams(controller.signal), getAwsTopics(controller.signal), getAwsQuestions({}, controller.signal)])
      .then(([diagramData, topicData, questionData]) => {
        setDiagrams(diagramData.sort((a, b) => a.order - b.order))
        setTopics(topicData)
        setQuestions(questionData)
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load AWS visual learning.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!diagrams.length) return
    setDiagramId(diagrams.find((item) => item.id === requestedDiagramId)?.id ?? diagrams[0].id)
  }, [diagrams, requestedDiagramId])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => () => { selectedAnimationRef.current?.cancel(); if (timerRef.current !== null) window.clearTimeout(timerRef.current) }, [])

  useEffect(() => {
    if (!playing || !diagram || reducedMotion || staticMode) return
    if (sequenceStep >= sequenceIds.length) { setPlaying(false); return }
    timerRef.current = window.setTimeout(() => {
      const nextStep = clampWalkthroughStep(sequenceStep + 1, sequenceIds.length)
      setSequenceStep(nextStep)
      const id = sequenceIds[nextStep - 1]
      if (id) { setSelectedNodeId(id); const element = document.getElementById(`awsvisual-node-${diagram.id}-${id}`); if (element) { selectedAnimationRef.current?.cancel(); selectedAnimationRef.current = animate(element, { scale: [1, 1.04, 1], duration: 520, ease: 'outCubic' }) } }
    }, 900)
    return () => { if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null } }
  }, [playing, diagram, reducedMotion, staticMode, sequenceStep, sequenceIds])

  useEffect(() => { setSelectedNodeId(diagram?.nodes[0]?.id ?? ''); setSequenceStep(0); setPlaying(false); setStaticMode(false); setQuizAnswers({}); selectedAnimationRef.current?.cancel() }, [diagramId])

  const setWalkthroughStep = useCallback((step: number) => {
    const nextStep = clampWalkthroughStep(step, sequenceIds.length)
    setSequenceStep(nextStep)
    setStaticMode(false)
    const id = sequenceIds[nextStep - 1]
    if (id && diagram) {
      setSelectedNodeId(id)
      if (!reducedMotion) { selectedAnimationRef.current?.cancel(); const element = document.getElementById(`awsvisual-node-${diagram.id}-${id}`); if (element) selectedAnimationRef.current = animate(element, { scale: [1, 1.04, 1], duration: 520, ease: 'outCubic' }) }
    }
  }, [sequenceIds, diagram, reducedMotion])
  const chooseNode = (id: string, element?: SVGElement | null) => {
    setPlaying(false)
    setSelectedNodeId(id)
    setStaticMode(true)
    if (!reducedMotion && element) { selectedAnimationRef.current?.cancel(); selectedAnimationRef.current = animate(element, { scale: [{ to: 1.035, duration: 125 }, { to: 1, duration: 220 }], ease: 'outCubic' }) }
  }
  const play = () => {
    if (reducedMotion) {
      setWalkthroughStep(sequenceStep + 1)
      return
    }
    if (sequenceStep >= sequenceIds.length) setWalkthroughStep(0)
    setStaticMode(false)
    setPlaying(true)
  }
  const replay = () => { setPlaying(false); setWalkthroughStep(0); if (!reducedMotion) setPlaying(true) }
  const reset = () => { setPlaying(false); setStaticMode(false); setWalkthroughStep(0); setSelectedNodeId(diagram?.nodes[0].id ?? ''); selectedAnimationRef.current?.cancel() }
  const onNodeKeyDown = (event: ReactKeyboardEvent<SVGGElement>, id: string) => {
    const currentIndex = diagram?.nodes.findIndex((node) => node.id === id) ?? -1
    const nextIndex = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? Math.min(currentIndex + 1, (diagram?.nodes.length ?? 1) - 1) : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? (diagram?.nodes.length ?? 1) - 1 : -1
    if (nextIndex >= 0 && diagram) { event.preventDefault(); const next = diagram.nodes[nextIndex]; chooseNode(next.id); document.getElementById(`awsvisual-node-${diagram.id}-${next.id}`)?.focus(); return }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseNode(id, event.currentTarget) }
  }

  return <AwsLayout topics={topics} diagrams={diagrams} activeDiagramId={diagram?.id} activeItem="visual" activeTopic={selectedNode?.topic_id} navigate={navigate}>
    <div className="learn-content aws-visual-page">
      <div className="learn-breadcrumb"><button onClick={() => navigate('/aws')}>AWS CLOUD</button><ChevronRight size={12} /><span>VISUAL LEARNING</span></div>
      {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading AWS architecture diagrams…</div>}
      {!loading && error && <div className="browser-state browser-error" role="alert"><b>AWS visual learning is unavailable</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
      {!loading && !error && diagram && selectedNode && <>
        <header className="visual-page-heading awsvisual-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AWS CLOUD / INTERACTIVE FIELD GUIDE</div><h1>See AWS systems.<br /><span>Follow the flow.</span></h1><p>Explore 12 service architectures, inspect their traffic and permission boundaries, then connect each design to original AWS interview questions.</p></div><div className="visual-heading-mark"><Sparkles size={22} /><span>12<br />DIAGRAMS</span></div></header>
        <section key={diagram.id} className="awsvisual-workspace" aria-label={`${diagram.title} interactive architecture diagram`}>
          <div className="awsvisual-workspace-heading"><div><span className="section-overline">INTERACTIVE ARCHITECTURE / {String(diagram.order).padStart(2, '0')}</span><h2>{diagram.title}</h2><p>{diagram.summary}</p></div><span className="awsvisual-tag">{topic?.name ?? 'AWS CLOUD'}</span></div>
          <div className="awsvisual-legend" aria-label="Connection types"><span><i className="awsvisual-line traffic" />Data traffic</span><span><i className="awsvisual-line authorization" />Authorization</span><span><i className="awsvisual-line control" />Control plane</span><span><i className="awsvisual-line event" />Events</span><span><i className="awsvisual-line replication" />Replication / recovery</span><span><i className="awsvisual-line monitoring" />Monitoring</span></div>
          <div className="awsvisual-viewport" role="group" aria-label="Diagram; select a service for details">
            <svg ref={svgRef} className={`awsvisual-svg${sequenceStep && !staticMode ? ' is-walkthrough-active' : ''}`} viewBox={`0 0 ${diagram.width} ${diagram.height}`} role="group" aria-labelledby={`awsvisual-title-${diagram.id} awsvisual-description-${diagram.id}`}>
              <title id={`awsvisual-title-${diagram.id}`}>{diagram.title}</title><desc id={`awsvisual-description-${diagram.id}`}>{diagram.summary} Select a labeled service or boundary for its purpose and related AWS questions.</desc>
              <defs>{(['traffic', 'authorization', 'control', 'event', 'replication', 'monitoring', 'recovery', 'containment'] as const).map((kind) => <marker key={kind} id={`awsvisual-arrow-${diagram.id}-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" className={`awsvisual-marker ${kind}`}><path d="M 0 0 L 10 5 L 0 10 z" /></marker>)}</defs>
              <g className="awsvisual-groups" aria-hidden="true">{diagram.groups.map((group) => <g key={group.id} className={`awsvisual-group group-${group.kind}`}><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="9" /></g>)}</g>
              <g className="awsvisual-edges">{diagram.edges.map((edge: AwsVisualEdge) => { const from = diagram.nodes.find((node) => node.id === edge.source)!; const to = diagram.nodes.find((node) => node.id === edge.target)!; return <g key={edge.id} className={`awsvisual-edge-wrap ${edge.sequence_step ? 'is-sequence-edge' : ''}${activeEdgeIds.includes(edge.id) ? ' is-active' : ''}`}><path id={`awsvisual-edge-${diagram.id}-${edge.id}`} pathLength={1000} d={edgePath(from, to)} markerEnd={`url(#awsvisual-arrow-${diagram.id}-${edge.kind})`} className={`awsvisual-edge edge-${edge.kind}`} /></g> })}</g>
              <g className="awsvisual-nodes">{diagram.nodes.map((node) => { const lines = wrapAwsNodeLabel(node.label); const stepIndex = sequenceIds.indexOf(node.id); return <g key={node.id} id={`awsvisual-node-${diagram.id}-${node.id}`} className={`awsvisual-node${selectedNode.id === node.id ? ' selected' : ''}${stepIndex >= 0 && !staticMode && sequenceStep === stepIndex + 1 ? ' is-active' : ''}${stepIndex >= 0 ? ' is-sequence-node' : ''}`} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={selectedNode.id === node.id ? 0 : -1} aria-keyshortcuts="Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown Home End" aria-label={`${node.label}: show architecture details`} aria-pressed={selectedNode.id === node.id} onClick={(event) => chooseNode(node.id, event.currentTarget)} onKeyDown={(event) => onNodeKeyDown(event, node.id)}>
                <rect className="awsvisual-node-card" width={NODE_W} height={NODE_H} rx="7" /><rect className="awsvisual-service-badge" x="10" y="12" width="36" height="22" rx="4" />
                <text className="awsvisual-service-code" x="28" y="27" textAnchor="middle">{node.code}</text>
                <text className="awsvisual-node-label" x="54" y={lines.length > 1 ? 18 : 28}>{lines.map((line, lineIndex) => <tspan key={lineIndex} x="54" dy={lineIndex === 0 ? 0 : 12}>{line}</tspan>)}</text>
                <text className="awsvisual-node-meta" x={NODE_W / 2} y="64" textAnchor="middle">{stepIndex >= 0 ? `STEP ${String(stepIndex + 1).padStart(2, '0')}` : node.services[0]}</text>
              </g> })}</g>
              <g className="awsvisual-boundary-labels" aria-hidden="true">{diagram.groups.map((group) => <g key={group.id} transform={`translate(${group.x + 10} ${group.y + 7})`}><rect width={Math.min(group.width - 20, Math.max(group.title.length * 6.2, group.caption.length * 5.2) + 12)} height="39" rx="3"/><text className="awsvisual-group-title" x="6" y="15">{group.title}</text><text className="awsvisual-group-caption" x="6" y="30">{group.caption}</text></g>)}</g>
              <g className="awsvisual-edge-labels" aria-hidden="true">{diagram.edges.map((edge, index) => { const layout = edgeLabelLayouts[index]; if (!layout) return null; return <g key={edge.id} className={`awsvisual-edge-label-group label-${edge.kind}`} transform={`translate(${layout.x} ${layout.y})`}><rect x={-layout.width / 2} y={-layout.height / 2} width={layout.width} height={layout.height} rx="3"/><text textAnchor="middle" y={-((layout.lines.length - 1) * 6)}>{layout.lines.map((line, lineIndex) => <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? 0 : 12}>{line}</tspan>)}</text></g> })}</g>
            </svg>
          </div>
          {hasGuidedWalkthrough ? <div className="awsvisual-sequence-controls"><div className="awsvisual-sequence-stage"><span>GUIDED ARCHITECTURE WALKTHROUGH</span><b aria-live="polite">{sequenceStep ? `${String(sequenceStep).padStart(2, '0')} / ${String(sequenceIds.length).padStart(2, '0')} · ${diagram.nodes.find((node) => node.id === sequenceIds[Math.max(0, sequenceStep - 1)])?.label ?? 'Ready'}` : `READY · ${sequenceIds.length} STEPS`}</b><small>{walkthroughCaptionText}</small>{reducedMotion && <small>Reduced motion is on. Play advances one step at a time.</small>}</div><div className="awsvisual-sequence-buttons"><button type="button" onClick={() => { setPlaying(false); setWalkthroughStep(sequenceStep - 1) }} aria-label="Previous sequence step" disabled={sequenceStep === 0}><ChevronLeft size={14} /> Previous</button><button type="button" onClick={playing ? () => setPlaying(false) : play} aria-label={playing ? 'Pause sequence' : reducedMotion ? 'Next sequence step' : 'Play sequence'}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : reducedMotion ? 'Next step' : 'Play'}</button><button type="button" onClick={() => { setPlaying(false); setWalkthroughStep(sequenceStep + 1) }} aria-label="Next sequence step" disabled={sequenceStep >= sequenceIds.length}><ChevronRight size={14} /> Next</button><button type="button" onClick={replay} aria-label="Replay sequence"><RotateCcw size={14} /> Replay</button><button type="button" onClick={reset} aria-label="Reset sequence"><RotateCcw size={14} /> Reset</button><button type="button" onClick={() => { setPlaying(false); setStaticMode(true); setSequenceStep(0); selectedAnimationRef.current?.cancel() }} aria-pressed={staticMode} aria-label="Show static diagram">Static diagram</button></div></div> : <div className="awsvisual-sequence-controls"><div className="awsvisual-sequence-stage"><span>STATIC ARCHITECTURE DIAGRAM</span><b>{diagram.nodes.length} COMPONENTS · {diagram.edges.length} CONNECTIONS</b><small>Choose a node to inspect its architecture role and related learning material.</small></div><button type="button" onClick={() => setStaticMode(!staticMode)} aria-pressed={staticMode}>Static diagram</button></div>}
        </section>
        <div className="awsvisual-details-grid">
          <section key={`${diagram.id}:${selectedNode.id}`} className="awsvisual-explanation" aria-live="polite"><div className="section-overline">SELECTED COMPONENT / {selectedNode.code}</div><h2>{selectedNode.label}<span>.</span></h2><div className="awsvisual-component-grid"><article className="awsvisual-component-card"><span>WHAT IS IT?</span><p>{selectedNode.description}</p></article><article className="awsvisual-component-card"><span>WHY IS IT NEEDED?</span><p>{selectedNode.purpose}</p></article><article className="awsvisual-component-card"><span>HOW DOES IT WORK?</span>{connections.length ? <ul>{connections.slice(0, 4).map(({ edge, nodeId, direction }) => <li key={`${edge.id}:${direction}`}><b>{direction === 'incoming' ? 'Receives' : 'Sends'}</b> {edge.label} {diagram.nodes.find((node) => node.id === nodeId)?.label}</li>)}</ul> : <p>Review the connections in this architecture to see how this component interacts with the rest of the system.</p>}</article><article className="awsvisual-component-card"><span>REAL-WORLD EXAMPLE</span><p>{selectedNode.example}</p></article></div><div className="awsvisual-related"><div className="section-overline">RELATED AWS SERVICES</div><div>{selectedNode.services.map((service) => <code key={service}>{service}</code>)}</div></div>
            <section className="awsvisual-connections" aria-label="Incoming and outgoing architecture connections"><h3>Connections</h3>{connections.length ? <ul>{connections.map(({ edge, nodeId, direction }) => { const neighbor = diagram.nodes.find((node) => node.id === nodeId); return <li key={`${edge.id}:${direction}`}><span className={`awsvisual-direction ${direction}`}>{direction}</span><span>{edge.label}</span>{neighbor && <button type="button" onClick={() => chooseNode(neighbor.id)}>{neighbor.label} <ArrowRight size={12} /></button>}</li> })}</ul> : <p>No connected components are defined for this node.</p>}</section>
            <section className="awsvisual-risk-notes"><h3>Configuration and security notes</h3><b>Common mistakes</b>{nodeNotes.commonMistakes.length ? <ul>{nodeNotes.commonMistakes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>Check the component’s scope, defaults, dependencies, and failure behavior before deployment.</p>}<b>Security considerations</b>{nodeNotes.securityConsiderations.length ? <ul>{nodeNotes.securityConsiderations.map((note) => <li key={note}>{note}</li>)}</ul> : <p>Apply least privilege, protect data in transit and at rest, and review network exposure and logging.</p>}</section>
            <div className="awsvisual-node-questions"><div className="section-overline">RELATED INTERVIEW QUESTIONS</div>{relatedQuestions.length ? relatedQuestions.map((question) => <article key={question.id}><b>{question.question}</b><p>{question.short_answer}</p><button className="awsvisual-text-link" onClick={() => navigate(`/aws/questions/${encodeURIComponent(question.slug)}`)}>Read the full answer <ExternalLink size={12} /></button></article>) : <p>Related questions are loading, or this diagram node has no linked question.</p>}</div>
            <div className="awsvisual-docs"><div className="section-overline">OFFICIAL AWS REFERENCES</div>{diagram.documentation_links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer">{new URL(link).pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') ?? 'AWS documentation'} <ExternalLink size={12} /></a>)}</div>
          </section>
          <section className="awsvisual-architecture-notes" aria-label="Architecture reading guide"><div className="awsvisual-note-heading"><span><Network size={15} /> HOW TO READ THIS DIAGRAM</span><span>{diagram.nodes.length} COMPONENTS · {diagram.edges.length} CONNECTIONS</span></div><p>Choose a node to inspect its role and related interview questions. Connection labels identify the request, event, permission, control-plane, monitoring, or recovery relationship.</p><div className="awsvisual-sequence-note"><Check size={14} /><span>Arrows describe the direction of the relationship. Boundary outlines show where AWS scopes resources or traffic.</span></div><button className="awsvisual-text-link" onClick={() => navigate(`/aws/topics/${encodeURIComponent(selectedNode.topic_id)}`)}><BookOpen size={14} /> Open {topic?.name ?? 'AWS topic'} guide <ArrowRight size={13} /></button></section>
        </div>
        <section className="awsvisual-practice" aria-labelledby="awsvisual-practice-title"><div className="awsvisual-practice-heading"><div><span className="section-overline">INTERVIEW PRACTICE / {practiceQuestions.length} PROMPTS</span><h2 id="awsvisual-practice-title">Explain this architecture</h2><p>Use these existing interview prompts to practice explaining the design. Each answer is linked to an existing component and question entry.</p></div></div>{practiceQuestions.length ? <div className="awsvisual-practice-list">{practiceQuestions.map(({ question, node }, index) => <article className="awsvisual-practice-card" key={question.id}><span className="awsvisual-practice-number">{String(index + 1).padStart(2, '0')}</span><div><span className="section-overline">{topics.find((entry) => entry.id === question.topic_id)?.name ?? 'AWS INTERVIEW'}</span><h3>{question.question}</h3>{practiceRevealed[question.id] && <div className="awsvisual-practice-answer"><b>Answer outline</b><p>{question.detailed_explanation}</p><p className="awsvisual-practice-example">{question.real_world_example}</p></div>}<div className="awsvisual-practice-actions"><button type="button" onClick={() => setPracticeRevealed((current) => ({ ...current, [question.id]: !current[question.id] }))}>{practiceRevealed[question.id] ? 'Hide answer' : 'Reveal answer'}</button><button type="button" onClick={() => { setSelectedNodeId(node.id); document.getElementById(`awsvisual-node-${diagram.id}-${node.id}`)?.focus() }}>View {node.label} <Network size={13} /></button></div></div></article>)}</div> : <p className="awsvisual-quiz-empty">No existing interview questions are linked to this architecture.</p>}</section>
        <section className="awsvisual-quiz" aria-labelledby="awsvisual-quiz-title"><div className="awsvisual-quiz-heading"><div><span className="section-overline">CHECK YOUR UNDERSTANDING</span><h2 id="awsvisual-quiz-title">Architecture knowledge check</h2><p>Questions are drawn from the AWS interview library. Correct answers and explanations link back to the original entries.</p></div><div className="awsvisual-quiz-score" aria-live="polite">SCORE <b>{quizScore} / {quiz.length}</b></div><button type="button" onClick={() => setQuizAnswers({})} disabled={!Object.keys(quizAnswers).length}>Restart quiz</button></div>{quiz.length ? <><div className="awsvisual-quiz-progress"><span>{quizComplete ? 'Quiz complete' : `${quizAnsweredCount} of ${quiz.length} answered`}</span><div role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={quiz.length} aria-valuenow={quizAnsweredCount}><i style={{ width: `${quiz.length ? quizAnsweredCount / quiz.length * 100 : 0}%` }} /></div><b>{quizComplete ? `Final score ${quizScore} / ${quiz.length}` : 'Answer every question to see your final score.'}</b></div><div className="awsvisual-quiz-list">{quiz.map((item, index) => { const answer = quizAnswers[item.id]; const original = questions.find((question) => question.id === item.id); return <article key={item.id} className="awsvisual-quiz-question"><div className="section-overline">QUESTION {String(index + 1).padStart(2, '0')} · {topics.find((entry) => entry.id === item.topicId)?.name ?? 'AWS'}</div><h3>{item.prompt}</h3><div className="awsvisual-quiz-choices" role="group" aria-label={`Answer options for ${item.prompt}`}>{item.choices.map((choice, choiceIndex) => <button type="button" key={`${item.id}:${choiceIndex}`} disabled={answer !== undefined} aria-pressed={answer === choiceIndex} className={answer === choiceIndex ? choiceIndex === item.correctIndex ? 'correct' : 'incorrect' : answer !== undefined && choiceIndex === item.correctIndex ? 'correct-answer' : ''} onClick={() => setQuizAnswers((current) => current[item.id] === undefined ? { ...current, [item.id]: choiceIndex } : current)}><span>{String.fromCharCode(65 + choiceIndex)}</span>{choice}</button>)}</div>{answer !== undefined && <div className={`awsvisual-quiz-feedback ${answer === item.correctIndex ? 'correct' : 'incorrect'}`} role="status"><b>{answer === item.correctIndex ? 'Correct' : 'Not quite'}</b><p>{item.explanation}</p>{original && <button type="button" onClick={() => navigate(`/aws/questions/${encodeURIComponent(original.slug)}`)}>Read full interview answer <ExternalLink size={12} /></button>}<button type="button" onClick={() => { setSelectedNodeId(item.nodeId); document.getElementById(`awsvisual-node-${diagram.id}-${item.nodeId}`)?.focus() }}>View related {diagram.nodes.find((node) => node.id === item.nodeId)?.label ?? 'diagram node'} <Network size={12} /></button><button type="button" onClick={() => navigate(`/aws/topics/${encodeURIComponent(item.topicId)}`)}>Open topic guide <BookOpen size={12} /></button></div>}</article> })}</div>{quizComplete && <section className="awsvisual-quiz-review" aria-label="Quiz answer review"><div className="section-overline">ANSWER REVIEW</div><h3>{quizScore === quiz.length ? 'All correct. Nice work.' : 'Review the questions to revisit.'}</h3>{quiz.filter((item) => quizAnswers[item.id] !== item.correctIndex).map((item) => <article key={item.id}><div><b>{item.prompt}</b><p>{item.explanation}</p></div><button type="button" onClick={() => { setSelectedNodeId(item.nodeId); document.getElementById(`awsvisual-node-${diagram.id}-${item.nodeId}`)?.focus() }}>Review {diagram.nodes.find((node) => node.id === item.nodeId)?.label ?? 'component'} <Network size={12} /></button></article>)}</section>}</> : <p className="awsvisual-quiz-empty">No linked interview questions are available for a quiz on this diagram yet.</p>}</section>
        <section className="awsvisual-next-steps"><div><span className="section-overline">CONTINUE LEARNING</span><b>Connect this architecture to the AWS topic guide and interview library.</b></div><button onClick={() => navigate(`/aws/topics/${encodeURIComponent(selectedNode.topic_id)}`)}>Open topic guide <ArrowRight size={14} /></button><button onClick={() => navigate('/aws/questions')}><BookOpen size={14} /> Browse questions</button><button onClick={() => navigate('/aws')}><ArrowLeft size={14} /> AWS overview</button></section>
      </>}
      {!loading && !error && !diagram && <div className="browser-state empty-state"><b>No AWS architecture diagrams are available</b><button onClick={() => navigate('/aws')}>Return to AWS overview</button></div>}
      <footer className="learn-footer"><span>FIELDNOTES / AWS VISUAL LEARNING</span><span>Static architecture diagrams · No AWS account required</span></footer>
    </div>
  </AwsLayout>
}
