import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
// @ts-ignore Anime.js is installed from package.json; Vite has a local API-compatible offline fallback.
import { animate, createScope, createTimeline, stagger, svg } from 'animejs'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ExternalLink, Lightbulb, LoaderCircle, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { AzureVisualLearningLayout } from '../components/azure/AzureVisualLearningLayout'
import { getAz900Course, getAz900Questions, getAz900VisualDiagrams } from '../lib/api'
import { getDiagramQuestions, getNodeQuestions, scoreAz900VisualQuiz } from '../lib/azureVisualLearning'
import type { Az900Course, Az900PracticeQuestion, Az900VisualDiagram, Az900VisualNode } from '../types/azure'
import type { Navigate } from '../lib/navigation'

type TimelineController = { add: (targets: string | Element | Element[], parameters: Record<string, unknown>, position?: number | string) => TimelineController; call: (callback: () => void, position?: number | string) => TimelineController; play: () => TimelineController; pause: () => TimelineController; restart: () => TimelineController; reset: () => TimelineController; cancel: () => TimelineController }
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

export function Az900VisualLearningPage({ navigate }: { navigate: Navigate }) {
  const [diagrams, setDiagrams] = useState<Az900VisualDiagram[]>([])
  const [course, setCourse] = useState<Az900Course | null>(null)
  const [questions, setQuestions] = useState<Az900PracticeQuestion[]>([])
  const [diagramId, setDiagramId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [sequenceStep, setSequenceStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null)
  const timelineRef = useRef<TimelineController | null>(null)
  const selectionAnimationRef = useRef<ReturnType<typeof animate> | null>(null)
  const diagram = useMemo(() => diagrams.find((item) => item.id === diagramId) ?? diagrams[0], [diagrams, diagramId])
  const selectedNode = diagram?.nodes.find((node) => node.id === selectedNodeId) ?? diagram?.nodes[0]
  const quizQuestions = useMemo(() => diagram ? getDiagramQuestions(diagram, questions) : [], [diagram, questions])
  const nodeQuestions = useMemo(() => diagram && selectedNode ? getNodeQuestions(diagram, selectedNode.id, questions) : [], [diagram, selectedNode, questions])
  const score = diagram ? scoreAz900VisualQuiz(diagram, questions, answers) : 0
  const currentSection = selectedNode && course?.sections.find((section) => section.id === selectedNode.section_id)
  const lesson = currentSection?.lessons[0]
  const sequenceIds = diagram?.sequence ?? []

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAz900VisualDiagrams(controller.signal), getAz900Course(controller.signal), getAz900Questions(undefined, controller.signal)])
      .then(([diagramData, courseData, questionData]) => {
        setDiagrams(diagramData.sort((a, b) => a.order - b.order))
        setCourse(courseData)
        setQuestions(questionData)
        setDiagramId((old) => old || diagramData[0]?.id || '')
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load AZ-900 visual learning.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

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

  const chooseDiagram = (id: string) => { setDiagramId(id); setAnswers({}); setSequenceStep(0); setPlaying(false) }
  const chooseNode = (id: string, element?: SVGElement | null) => {
    setSelectedNodeId(id)
    if (!reducedMotion && element) { selectionAnimationRef.current?.cancel(); selectionAnimationRef.current = animate(element, { scale: [{ to: 1.035, duration: 130 }, { to: 1, duration: 240 }], ease: 'outCubic' }) }
  }
  const play = () => {
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
  const reset = () => { timelineRef.current?.pause(); timelineRef.current?.reset(); setSequenceStep(0); setPlaying(false); setSelectedNodeId(diagram?.nodes[0].id ?? '') }
  const onNodeKeyDown = (event: ReactKeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseNode(id, event.currentTarget) }
  }

  return <AzureVisualLearningLayout navigate={navigate}><div className="learn-content az900-visual-page">
    <div className="learn-breadcrumb"><button onClick={() => navigate('/azure/az-900')}>AZ-900</button><ChevronRight size={12} /><span>VISUAL LEARNING</span></div>
    {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading interactive diagrams…</div>}
    {!loading && error && <div className="browser-state browser-error" role="alert"><b>Visual learning is unavailable</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
    {!loading && !error && diagram && selectedNode && <>
      <header className="visual-page-heading az900-visual-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AZ-900 / INTERACTIVE FIELD GUIDE</div><h1>See how Azure<br /><span>concepts connect.</span></h1><p>Explore ten interactive diagrams. Select a concept for its purpose, real-world example, and links to existing lessons, practice questions, and Azure administration topics.</p></div><div className="visual-heading-mark"><ShieldCheck size={22} /><span>10<br />DIAGRAMS</span></div></header>
      <nav className="azvisual-tabs" aria-label="AZ-900 visual learning diagrams">{diagrams.map((item) => <button key={item.id} type="button" className={item.id === diagram.id ? 'active' : ''} aria-current={item.id === diagram.id ? 'page' : undefined} onClick={() => chooseDiagram(item.id)}><span>{String(item.order).padStart(2, '0')}</span>{item.title}</button>)}</nav>
      <section key={diagram.id} className="azvisual-workspace" aria-label={`${diagram.title} interactive diagram`}>
        <div className="azvisual-workspace-heading"><div><span className="section-overline">INTERACTIVE DIAGRAM / {String(diagram.order).padStart(2, '0')}</span><h2>{diagram.title}</h2><p>{diagram.summary}</p></div><span className="azvisual-tag">AZ-900 FUNDAMENTALS</span></div>
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
        {sequenceIds.length > 0 && <div className="azvisual-sequence-controls"><div className="azvisual-sequence-stage"><span>SEQUENCE</span><b>{sequenceStep ? `${String(sequenceStep).padStart(2, '0')} / ${String(sequenceIds.length).padStart(2, '0')} · ${diagram.nodes.find((node) => node.id === sequenceIds[Math.max(0, sequenceStep - 1)])?.label ?? 'Ready'}` : `READY · ${sequenceIds.length} STEPS`}</b>{reducedMotion && <small>Reduced motion is on. Each Play press advances one step.</small>}</div><div className="azvisual-sequence-buttons"><button onClick={playing ? pause : play} aria-label={playing ? 'Pause sequence' : reducedMotion ? 'Next sequence step' : 'Play sequence'}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : reducedMotion ? 'Next step' : 'Play'}</button><button onClick={replay} aria-label="Replay sequence"><RotateCcw size={14} /> Replay</button><button onClick={reset} aria-label="Reset sequence"><RotateCcw size={14} /> Reset</button></div></div>}
        {sequenceIds.length === 0 && <p className="azvisual-interaction-hint"><span>01</span> Select a component to inspect its purpose and related learning material.</p>}
      </section>
      <div className="azvisual-details-grid">
        <section key={`${diagram.id}:${selectedNode.id}`} className="azvisual-explanation" aria-live="polite"><div className="section-overline">CONCEPT / {selectedNode.label.toUpperCase()}</div><h2>{selectedNode.label}<span>.</span></h2><p className="azvisual-description">{selectedNode.description}</p><div className="azvisual-detail-block"><b><CircleHelp size={14} /> Why it matters</b><p>{selectedNode.purpose}</p></div><div className="azvisual-detail-block"><b><Lightbulb size={14} /> In practice</b><p>{selectedNode.example}</p></div><div className="azvisual-related"><div className="section-overline">RELATED AZURE SERVICES</div><div>{selectedNode.services.map((service) => <code key={service}>{service}</code>)}</div></div>
          <div className="azvisual-links"><span className="section-overline">KEEP LEARNING</span>{lesson && <button className="azvisual-text-link" onClick={() => navigate(`/azure/az-900/${currentSection!.id}/${lesson.id}`)}><BookOpen size={14} /> {lesson.title} <ExternalLink size={12} /></button>}{selectedNode.admin_topic_id && <button className="azvisual-text-link" onClick={() => navigate(`/azure/topics/${encodeURIComponent(selectedNode.admin_topic_id!)}`)}>Azure administration topic <ArrowRight size={13} /></button>}</div>
          {nodeQuestions.length > 0 && <div className="azvisual-node-questions"><div className="section-overline">RELATED ORIGINAL AZ-900 QUESTIONS</div>{nodeQuestions.map((question) => <details key={question.id}><summary>{question.prompt}</summary><p><b>Answer:</b> {question.choices[question.answer]}</p><p>{question.explanation}</p></details>)}</div>}
        </section>
        <section className="azvisual-quiz" aria-label={`${diagram.title} knowledge check`}><div className="azvisual-quiz-heading"><span><BookOpen size={15} /> KNOWLEDGE CHECK</span><b>{score} / {quizQuestions.length} CORRECT</b></div><p className="azvisual-quiz-note">Questions are reused from the course’s original practice bank.</p>{quizQuestions.map((question, index) => { const key = `${diagram.id}:${question.id}`; const answer = answers[key]; return <article className="azvisual-quiz-question" key={question.id}><h3><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</h3><div className="azvisual-quiz-options">{question.choices.map((choice, choiceIndex) => <button key={choice} type="button" disabled={answer !== undefined} className={answer === choiceIndex ? choiceIndex === question.answer ? 'correct' : 'incorrect' : ''} onClick={() => setAnswers((old) => ({ ...old, [key]: choiceIndex }))}>{choice}{answer === choiceIndex && (choiceIndex === question.answer ? <Check size={14} /> : <span aria-hidden="true">×</span>)}</button>)}</div>{answer !== undefined && <p className={`azvisual-feedback ${answer === question.answer ? 'is-correct' : 'is-incorrect'}`} role="status">{answer === question.answer ? 'Correct. ' : 'Review this concept. '}{question.explanation}</p>}</article> })}</section>
      </div>
      <section className="azvisual-next-steps"><div><span className="section-overline">COURSE AND DEPARTMENT LINKS</span><b>Continue from the visual model into a structured lesson or interview practice.</b></div><button onClick={() => navigate('/azure/az-900')}><ArrowLeft size={14} /> AZ-900 course</button><button onClick={() => navigate('/azure')}>Azure administration <ArrowRight size={14} /></button></section>
      <footer className="learn-footer"><span>FIELDNOTES / AZ-900 VISUAL LEARNING</span><a href={course?.official_study_guide ?? 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900'} target="_blank" rel="noreferrer">Microsoft Learn study guide</a></footer>
    </>}
    {!loading && !error && !diagram && <div className="browser-state empty-state"><b>No diagrams are available</b><button onClick={() => navigate('/azure/az-900')}>Return to the AZ-900 course</button></div>}
  </div></AzureVisualLearningLayout>
}
