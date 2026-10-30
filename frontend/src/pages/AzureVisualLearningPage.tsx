import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { animate, createScope, createTimeline, stagger, svg } from 'animejs'
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Network, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { AzureAdministrationLayout } from '../components/azure/AzureAdministrationLayout'
import { getAz900Questions, getAzureAdminQuestions, getAzureAdminTopics, getAzureScenarios, getAzureVisualDiagrams } from '../lib/api'
import { getDiagramQuestions, getNodeQuestions, scoreAz900VisualQuiz } from '../lib/azureVisualLearning'
import type { Az900PracticeQuestion, Az900VisualDiagram, Az900VisualNode } from '../types/azure'
import type { AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic } from '../types/azureAdmin'
import type { Navigate } from '../lib/navigation'

type DiagramConnection = { nodeId: string; direction: 'incoming' | 'outgoing' }
const NODE_W = 184
const NODE_H = 84

function edgePath(from: Az900VisualNode, to: Az900VisualNode) {
  const startCenterX = from.x + NODE_W / 2
  const startCenterY = from.y + NODE_H / 2
  const endCenterX = to.x + NODE_W / 2
  const endCenterY = to.y + NODE_H / 2
  const dx = endCenterX - startCenterX
  const dy = endCenterY - startCenterY
  const scale = 1 / Math.max(Math.abs(dx) / (NODE_W / 2), Math.abs(dy) / (NODE_H / 2))
  const startX = startCenterX + dx * scale
  const startY = startCenterY + dy * scale
  const endX = endCenterX - dx * scale
  const endY = endCenterY - dy * scale
  const controlOffset = Math.max(24, Math.abs(dx) * .38) * (Math.sign(dx) || 1)
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY + dy * .12}, ${endX - controlOffset} ${endY - dy * .12}, ${endX} ${endY}`
}

function wrapSvgLabel(value: string, maxLength = 22) {
  const lines: string[] = []
  let line = ''
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && candidate.length > maxLength) { lines.push(line); line = word }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines
}

export function AzureVisualLearningPage({ navigate, requestedDiagramId }: { navigate: Navigate; requestedDiagramId?: string }) {
  const [diagrams, setDiagrams] = useState<Az900VisualDiagram[]>([])
  const [topics, setTopics] = useState<AzureAdminTopic[]>([])
  const [scenarios, setScenarios] = useState<AzureAdminScenario[]>([])
  const [questions, setQuestions] = useState<Az900PracticeQuestion[]>([])
  const [adminQuestions, setAdminQuestions] = useState<AzureAdminQuestion[]>([])
  const [diagramId, setDiagramId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({})
  const [sequenceStep, setSequenceStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [staticMode, setStaticMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null)
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null)
  const selectionAnimationRef = useRef<ReturnType<typeof animate> | null>(null)
  const diagram = useMemo(() => diagrams.find((item) => item.id === diagramId) ?? diagrams[0], [diagrams, diagramId])
  const selectedNode = diagram?.nodes.find((node) => node.id === selectedNodeId) ?? diagram?.nodes[0]
  const quizQuestions = useMemo(() => diagram ? getDiagramQuestions(diagram, questions) : [], [diagram, questions])
  const nodeQuestions = useMemo(() => diagram && selectedNode ? getNodeQuestions(diagram, selectedNode.id, questions) : [], [diagram, selectedNode, questions])
  const score = diagram ? scoreAz900VisualQuiz(diagram, questions, answers) : 0
  const sequenceIds = diagram?.sequence ?? []
  const nodeConnections = useMemo<DiagramConnection[]>(() => diagram && selectedNode ? diagram.edges.flatMap(([fromId, toId]): DiagramConnection[] => fromId === selectedNode.id ? [{ nodeId: toId, direction: 'outgoing' }] : toId === selectedNode.id ? [{ nodeId: fromId, direction: 'incoming' }] : []) : [], [diagram, selectedNode])
  const selectedAdminTopic = selectedNode?.admin_topic_id ? topics.find((item) => item.id === selectedNode.admin_topic_id) : undefined
  const nodeAdminQuestions = useMemo(() => selectedAdminTopic ? adminQuestions.filter((item) => item.topic_id === selectedAdminTopic.id) : [], [selectedAdminTopic, adminQuestions])
  const practiceQuestions = useMemo(() => {
    if (!diagram) return []
    return adminQuestions.flatMap((question) => {
      const node = diagram.nodes.find((item) => item.admin_topic_id === question.topic_id)
      return node ? [{ question, node }] : []
    })
  }, [diagram, adminQuestions])
  const answeredCount = quizQuestions.filter((question) => answers[`${diagram?.id}:${question.id}`] !== undefined).length
  const quizComplete = quizQuestions.length > 0 && answeredCount === quizQuestions.length
  const securityNotes = [...new Set([...nodeAdminQuestions.flatMap((item) => item.common_mistakes).filter((note) => /security|secure|permission|identity|access|encrypt|public|private|network|secret|credential/i.test(note)), ...scenarios.filter((item) => item.topic_id === selectedAdminTopic?.id).flatMap((item) => item.safety_notes)])].slice(0, 4)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAzureVisualDiagrams(controller.signal), getAz900Questions(undefined, controller.signal), getAzureAdminQuestions({}, controller.signal), getAzureAdminTopics(controller.signal), getAzureScenarios(controller.signal)])
      .then(([diagramData, questionData, adminQuestionData, topicData, scenarioData]) => {
        setDiagrams(diagramData.sort((a, b) => a.order - b.order))
        setQuestions(questionData)
        setAdminQuestions(adminQuestionData)
        setTopics(topicData)
        setScenarios(scenarioData)
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load Azure visual learning.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!diagrams.length) return
    setDiagramId(diagrams.find((item) => item.id === requestedDiagramId)?.id ?? diagrams[0].id)
  }, [diagrams, requestedDiagramId])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => () => { selectionAnimationRef.current?.cancel() }, [])

  useEffect(() => {
    if (!diagram) return
    setSelectedNodeId(diagram.nodes[0].id)
    setSequenceStep(0)
    setPlaying(false)
    timelineRef.current?.cancel()
    selectionAnimationRef.current?.cancel()
    scopeRef.current?.revert()
    timelineRef.current = null
    scopeRef.current = null
    if (!sequenceIds.length || reducedMotion || !svgRef.current) return

    const scope = createScope({ root: svgRef })
    scopeRef.current = scope
    scope.add(() => {
      animate('.azvisual-node', { opacity: [0, 1], translateY: [8, 0], delay: stagger(35), duration: 320, ease: 'outCubic' })
      const timeline = createTimeline({ autoplay: false, onComplete: () => setPlaying(false) })
      sequenceIds.forEach((id, index) => {
        const at = index * 640
        timeline.add(`#azvisual-node-${diagram.id}-${id}`, { opacity: [{ to: .4, duration: 1 }, { to: 1, duration: 390 }], scale: [{ to: .97, duration: 1 }, { to: 1, duration: 390 }], ease: 'outCubic' }, at)
        if (index > 0) timeline.add(`#azvisual-edge-${diagram.id}-${sequenceIds[index - 1]}-${id}`, { strokeDashoffset: [1000, 0], duration: 360, ease: 'outCubic' }, at - 210)
        timeline.call(() => { setSequenceStep(index + 1); setSelectedNodeId(id) }, at)
      })
      if (diagram.id === 'azure-networking') timeline.add('#azvisual-network-packet', { ...svg.createMotionPath('#azvisual-network-path'), duration: sequenceIds.length * 640, ease: 'linear' }, 0)
      timelineRef.current = timeline
    })
    return () => { timelineRef.current?.cancel(); selectionAnimationRef.current?.cancel(); scope.revert(); timelineRef.current = null }
  }, [diagram, reducedMotion, sequenceIds])

  const moveToStep = (step: number) => {
    const next = Math.max(0, Math.min(sequenceIds.length, Math.trunc(step)))
    timelineRef.current?.pause()
    setPlaying(false)
    setStaticMode(false)
    setSequenceStep(next)
    const id = sequenceIds[next - 1]
    if (id) setSelectedNodeId(id)
  }
  const chooseNode = (id: string, element?: SVGElement | null) => {
    setSelectedNodeId(id)
    if (!reducedMotion && element) { selectionAnimationRef.current?.cancel(); selectionAnimationRef.current = animate(element, { scale: [{ to: 1.035, duration: 130 }, { to: 1, duration: 240 }], ease: 'outCubic' }) }
  }
  const play = () => {
    setStaticMode(false)
    if (reducedMotion) {
      const next = Math.min(sequenceIds.length, sequenceStep + 1)
      setSequenceStep(next)
      if (sequenceIds[next - 1]) setSelectedNodeId(sequenceIds[next - 1])
      return
    }
    if (sequenceStep >= sequenceIds.length) { timelineRef.current?.restart(); setSequenceStep(0) }
    else timelineRef.current?.play()
    setPlaying(true)
  }
  const pause = () => { timelineRef.current?.pause(); setPlaying(false) }
  const replay = () => { setSequenceStep(0); setSelectedNodeId(sequenceIds[0] ?? diagram?.nodes[0].id ?? ''); if (reducedMotion) { setPlaying(false); return }; timelineRef.current?.restart(); setPlaying(true) }
  const reset = () => { timelineRef.current?.pause(); timelineRef.current?.reset(); setSequenceStep(0); setPlaying(false); setStaticMode(false); setSelectedNodeId(diagram?.nodes[0].id ?? '') }
  const onNodeKeyDown = (event: ReactKeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseNode(id, event.currentTarget) }
  }

  return <AzureAdministrationLayout topics={topics} scenarios={scenarios} diagrams={diagrams} activeDiagramId={diagram?.id} activeTopic={selectedAdminTopic?.id} activeItem="visual" navigate={navigate} eyebrow="AZURE VISUAL LEARNING"><div className="learn-content az900-visual-page azure-visual-page">
    <div className="learn-breadcrumb"><button onClick={() => navigate('/azure')}>AZURE ADMINISTRATION</button><ChevronRight size={12} /><span>VISUAL LEARNING</span></div>
    {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading interactive diagrams…</div>}
    {!loading && error && <div className="browser-state browser-error" role="alert"><b>Visual learning is unavailable</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
    {!loading && !error && diagram && selectedNode && <>
      <header className="visual-page-heading az900-visual-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AZURE ADMINISTRATION / VISUAL FIELD GUIDE</div><h1>See Azure systems.<br /><span>Follow the flow.</span></h1><p>Explore ten Azure diagrams, inspect their connections, and connect each design to existing administration questions and troubleshooting topics.</p></div><div className="visual-heading-mark"><ShieldCheck size={22} /><span>{diagrams.length}<br />DIAGRAMS</span></div></header>
      <section key={diagram.id} className="azvisual-workspace" aria-label={`${diagram.title} interactive diagram`}>
        <div className="azvisual-workspace-heading"><div><span className="section-overline">INTERACTIVE DIAGRAM / {String(diagram.order).padStart(2, '0')}</span><h2>{diagram.title}</h2><p>{diagram.summary}</p></div><span className="azvisual-tag">AZURE FUNDAMENTALS</span></div>
        <div className="azvisual-viewport" role="group" aria-label="Diagram; select a node for details"><svg ref={svgRef} className={`az900-diagram-svg az900-diagram-${diagram.id}`} viewBox="0 0 1160 390" role="group" aria-labelledby="azvisual-title azvisual-description">
          <title id="azvisual-title">{diagram.title}</title><desc id="azvisual-description">{diagram.summary} Select a labeled component for details.</desc>
          <defs><marker id={`azvisual-arrow-${diagram.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
          <g className="azvisual-groups" aria-hidden="true">{diagram.groups.map((group) => { const captionLines = wrapSvgLabel(group.caption, 38); return <g key={group.id} className="azvisual-group"><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="8" /><text className="azvisual-group-title" x={group.x + 14} y={group.y + 21}>{group.title}</text><text className="azvisual-group-caption" x={group.x + 14} y={group.y + 38}>{captionLines.map((line, index) => <tspan key={index} x={group.x + 14} dy={index === 0 ? 0 : 12}>{line}</tspan>)}</text></g> })}</g>
          <g className="azvisual-edges">{diagram.edges.map(([fromId, toId]) => { const from = diagram.nodes.find((item) => item.id === fromId)!; const to = diagram.nodes.find((item) => item.id === toId)!; return <path id={`azvisual-edge-${diagram.id}-${fromId}-${toId}`} key={`${fromId}-${toId}`} pathLength={1000} d={edgePath(from, to)} markerEnd={`url(#azvisual-arrow-${diagram.id})`} className="azvisual-edge" /> })}</g>
          {diagram.id === 'azure-networking' && <><path id="azvisual-network-path" className="azvisual-packet-path" d="M 209 192 C 229 192 239 192 250 192 L 485 192 L 720 117 L 955 192" /><circle id="azvisual-network-packet" className="azvisual-packet" cx="0" cy="0" r="7" aria-label="Animated network request" /></>}
          {diagram.nodes.map((node, index) => { const titleLines = wrapSvgLabel(node.label); const sequenceIndex = sequenceIds.indexOf(node.id); return <g key={node.id} id={`azvisual-node-${diagram.id}-${node.id}`} className={`azvisual-node${selectedNode.id === node.id ? ' selected' : ''}${sequenceIndex >= 0 ? ' is-sequence-node' : ''}`} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`${node.label}: show explanation`} aria-pressed={selectedNode.id === node.id} onClick={(event) => chooseNode(node.id, event.currentTarget)} onKeyDown={(event) => onNodeKeyDown(event, node.id)}>
            <rect width={NODE_W} height={NODE_H} rx="6" /><rect className="azvisual-node-accent" width="3" height={NODE_H} rx="2" />
            <text className="azvisual-step-number" x="12" y="17">{sequenceIndex >= 0 ? `STEP ${String(sequenceIndex + 1).padStart(2, '0')}` : `NODE ${String(index + 1).padStart(2, '0')}`}</text>
            <text className="azvisual-node-label" x={NODE_W / 2} y={titleLines.length > 1 ? 43 : 50} textAnchor="middle">{titleLines.map((line, lineIndex) => <tspan key={lineIndex} x={NODE_W / 2} dy={lineIndex === 0 ? 0 : 15}>{line}</tspan>)}</text>
            <text className="azvisual-node-meta" x={NODE_W / 2} y="72" textAnchor="middle">{node.services[0]}</text>
          </g> })}
        </svg></div>
        {sequenceIds.length > 0 && <div className="azvisual-sequence-controls"><div className="azvisual-sequence-stage"><span>GUIDED ARCHITECTURE WALKTHROUGH</span><b aria-live="polite">{sequenceStep ? `${String(sequenceStep).padStart(2, '0')} / ${String(sequenceIds.length).padStart(2, '0')} · ${diagram.nodes.find((node) => node.id === sequenceIds[Math.max(0, sequenceStep - 1)])?.label ?? 'Ready'}` : `READY · ${sequenceIds.length} STEPS`}</b>{reducedMotion && <small>Reduced motion is on. Play advances one step at a time.</small>}</div><div className="azvisual-sequence-buttons"><button type="button" onClick={() => moveToStep(sequenceStep - 1)} aria-label="Previous sequence step" disabled={sequenceStep === 0}><ChevronLeft size={14} /> Previous</button><button type="button" onClick={playing ? pause : play} aria-label={playing ? 'Pause sequence' : reducedMotion ? 'Next sequence step' : 'Play sequence'}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : reducedMotion ? 'Next step' : 'Play'}</button><button type="button" onClick={() => moveToStep(sequenceStep + 1)} aria-label="Next sequence step" disabled={sequenceStep >= sequenceIds.length}><ChevronRight size={14} /> Next</button><button type="button" onClick={replay} aria-label="Replay sequence"><RotateCcw size={14} /> Replay</button><button type="button" onClick={reset} aria-label="Reset sequence"><RotateCcw size={14} /> Reset</button><button type="button" aria-pressed={staticMode} onClick={() => { pause(); setStaticMode((value) => !value) }}>Static diagram</button></div></div>}
        {sequenceIds.length === 0 && <p className="azvisual-interaction-hint"><span>01</span> Select a component to inspect its purpose and related learning material.</p>}
      </section>
      <div className="azvisual-details-grid">
        <section key={`${diagram.id}:${selectedNode.id}`} className="azvisual-explanation" aria-live="polite"><div className="section-overline">SELECTED COMPONENT / {selectedNode.label.toUpperCase()}</div><h2>{selectedNode.label}<span>.</span></h2><div className="azvisual-component-grid"><article><span>WHAT IS IT?</span><p>{selectedNode.description}</p></article><article><span>WHY IS IT NEEDED?</span><p>{selectedNode.purpose}</p></article><article><span>HOW DOES IT WORK?</span>{nodeConnections.length ? <ul>{nodeConnections.slice(0, 5).map(({ nodeId, direction }) => <li key={`${direction}:${nodeId}`}><b>{direction === 'incoming' ? 'Receives from' : 'Connects to'}</b> {diagram.nodes.find((node) => node.id === nodeId)?.label}</li>)}</ul> : <p>{selectedNode.description}</p>}</article><article><span>REAL-WORLD EXAMPLE</span><p>{selectedNode.example}</p></article></div><div className="azvisual-related"><div className="section-overline">RELATED AZURE SERVICES</div><div>{selectedNode.services.map((service) => <code key={service}>{service}</code>)}</div></div>
          {securityNotes.length > 0 && <section className="azvisual-security-notes"><h3>Security considerations and common mistakes</h3><ul>{securityNotes.map((note) => <li key={note}>{note}</li>)}</ul></section>}
          <section className="azvisual-connections" aria-label="Incoming and outgoing diagram connections"><h3>Connections</h3>{nodeConnections.length ? <ul>{nodeConnections.map(({ nodeId, direction }) => { const neighbor = diagram.nodes.find((node) => node.id === nodeId); return <li key={`${direction}:${nodeId}`}><span>{direction}</span><button type="button" onClick={() => chooseNode(nodeId)}>{neighbor?.label} <ArrowRight size={12} /></button></li> })}</ul> : <p>No connections are listed for this component.</p>}</section>
          <div className="azvisual-links"><span className="section-overline">KEEP LEARNING</span>{selectedAdminTopic && <button className="azvisual-text-link" onClick={() => navigate(`/azure/topics/${encodeURIComponent(selectedAdminTopic.slug)}`)}><BookOpen size={14} /> {selectedAdminTopic.name} topic guide <ExternalLink size={12} /></button>}</div>
          {nodeQuestions.length > 0 && <div className="azvisual-node-questions"><div className="section-overline">RELATED AZURE FUNDAMENTALS QUESTIONS</div>{nodeQuestions.map((question) => <details key={question.id}><summary>{question.prompt}</summary><p><b>Answer:</b> {question.choices[question.answer]}</p><p>{question.explanation}</p></details>)}</div>}
          {nodeAdminQuestions.length > 0 && <div className="azvisual-node-questions"><div className="section-overline">RELATED AZURE ADMIN INTERVIEW QUESTIONS</div>{nodeAdminQuestions.slice(0, 4).map((question) => <details key={question.id}><summary>{question.question}</summary><p><b>Short answer:</b> {question.short_answer}</p><p>{question.detailed_explanation}</p><button className="azvisual-text-link" onClick={() => navigate(`/azure/questions/${encodeURIComponent(question.slug)}`)}>Open full interview answer <ExternalLink size={12} /></button></details>)}</div>}
        </section>
        <section className="azvisual-quiz" aria-label={`${diagram.title} knowledge check`}><div className="azvisual-quiz-heading"><span><BookOpen size={15} /> KNOWLEDGE CHECK</span><b>{score} / {quizQuestions.length} CORRECT</b><button type="button" onClick={() => setAnswers({})} disabled={!answeredCount}>Restart quiz</button></div><p className="azvisual-quiz-note">Questions are reused from the existing Azure Fundamentals practice bank.</p>{quizQuestions.length > 0 && <div className="azvisual-quiz-progress"><span>{quizComplete ? 'Quiz complete' : `${answeredCount} of ${quizQuestions.length} answered`}</span><div role="progressbar" aria-label="Azure diagram quiz progress" aria-valuemin={0} aria-valuemax={quizQuestions.length} aria-valuenow={answeredCount}><i style={{ width: `${answeredCount / quizQuestions.length * 100}%` }} /></div><b>{quizComplete ? `Final score ${score} / ${quizQuestions.length}` : 'Answer every question to see your result.'}</b></div>}{quizQuestions.map((question, index) => { const key = `${diagram.id}:${question.id}`; const answer = answers[key]; const relatedNode = diagram.nodes.find((node) => node.question_ids.includes(question.id)) ?? diagram.nodes[0]; return <article className="azvisual-quiz-question" key={question.id}><h3><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</h3><div className="azvisual-quiz-options">{question.choices.map((choice, choiceIndex) => <button key={choice} type="button" disabled={answer !== undefined} aria-pressed={answer === choiceIndex} className={answer === choiceIndex ? choiceIndex === question.answer ? 'correct' : 'incorrect' : answer !== undefined && choiceIndex === question.answer ? 'correct-answer' : ''} onClick={() => setAnswers((old) => ({ ...old, [key]: choiceIndex }))}>{choice}{answer !== undefined && choiceIndex === question.answer && <Check size={14} />}</button>)}</div>{answer !== undefined && <div className={`azvisual-feedback ${answer === question.answer ? 'is-correct' : 'is-incorrect'}`} role="status"><b>{answer === question.answer ? 'Correct' : 'Review this concept'}</b><p>{question.explanation}</p><button type="button" onClick={() => { setSelectedNodeId(relatedNode.id); document.getElementById(`azvisual-node-${diagram.id}-${relatedNode.id}`)?.focus() }}>View {relatedNode.label} <Network size={12} /></button></div>}</article> })}{quizComplete && <section className="azvisual-quiz-review" aria-label="Quiz answer review"><div className="section-overline">ANSWER REVIEW</div><h3>{score === quizQuestions.length ? 'All correct. Nice work.' : 'Review the concepts you missed.'}</h3>{quizQuestions.filter((question) => answers[`${diagram.id}:${question.id}`] !== question.answer).map((question) => { const node = diagram.nodes.find((item) => item.question_ids.includes(question.id)) ?? diagram.nodes[0]; return <article key={question.id}><div><b>{question.prompt}</b><p>{question.explanation}</p></div><button type="button" onClick={() => { setSelectedNodeId(node.id); document.getElementById(`azvisual-node-${diagram.id}-${node.id}`)?.focus() }}>Review {node.label} <Network size={12} /></button></article> })}</section>}</section>
      </div>
      <section className="azvisual-practice"><div className="azvisual-practice-heading"><span className="section-overline">AZURE ADMIN INTERVIEW PRACTICE / {practiceQuestions.length} QUESTIONS</span><h2>Explain this architecture.</h2><p>Use existing administration interview questions; reveal an answer outline and jump to the related concept.</p></div>{practiceQuestions.length ? <div className="azvisual-practice-list">{practiceQuestions.map(({ question, node }, index) => <article key={question.id} className="azvisual-practice-card"><span className="azvisual-practice-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{question.question}</h3>{practiceRevealed[question.id] && <div className="azvisual-practice-answer"><b>Answer outline</b><p>{question.detailed_explanation}</p><p>{question.real_world_example}</p></div>}<div className="azvisual-practice-actions"><button type="button" onClick={() => setPracticeRevealed((current) => ({ ...current, [question.id]: !current[question.id] }))}>{practiceRevealed[question.id] ? 'Hide answer' : 'Reveal answer'}</button><button type="button" onClick={() => { setSelectedNodeId(node.id); document.getElementById(`azvisual-node-${diagram.id}-${node.id}`)?.focus() }}>View {node.label} <Network size={12} /></button><button type="button" onClick={() => navigate(`/azure/questions/${encodeURIComponent(question.slug)}`)}>Full interview answer <ExternalLink size={12} /></button></div></div></article>)}</div> : <p>No Azure administration questions are linked to this diagram.</p>}</section>
      <section className="azvisual-next-steps"><div><span className="section-overline">CONTINUE LEARNING</span><b>Connect this visual model to Azure Administration topics and interview practice.</b></div><button onClick={() => navigate('/azure')}>Azure administration <ArrowRight size={14} /></button><button onClick={() => navigate('/azure/questions')}>Browse interview questions <BookOpen size={14} /></button></section>
      <footer className="learn-footer"><span>FIELDNOTES / AZURE VISUAL LEARNING</span><span>Interactive diagrams · Existing Azure learning content</span></footer>
    </>}
    {!loading && !error && !diagram && <div className="browser-state empty-state"><b>No diagrams are available</b><button onClick={() => navigate('/azure')}>Return to Azure Administration</button></div>}
  </div></AzureAdministrationLayout>
}
