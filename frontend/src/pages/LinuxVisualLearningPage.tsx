import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { animate, createScope, createTimeline, stagger, svg } from 'animejs'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Command, ExternalLink, Lightbulb, Pause, Play, RotateCcw, Sparkles, Terminal } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { diagramById, linuxDiagrams, scoreDiagramQuiz } from '../data/linuxDiagrams'
import { getLinuxQuestions, getLinuxTopics } from '../lib/api'
import type { Navigate } from '../lib/navigation'
import type { LinuxQuestion, LinuxTopic } from '../types/linux'

const NODE_W = 142
const NODE_H = 64
function edgePath(from: {x:number;y:number}, to: {x:number;y:number}) {
  const dx = to.x + NODE_W / 2 - (from.x + NODE_W / 2)
  const dy = to.y + NODE_H / 2 - (from.y + NODE_H / 2)
  const factor = 1 / Math.max(Math.abs(dx) / (NODE_W / 2), Math.abs(dy) / (NODE_H / 2))
  const startX = from.x + NODE_W / 2 + dx * factor
  const startY = from.y + NODE_H / 2 + dy * factor
  const endX = to.x + NODE_W / 2 - dx * factor
  const endY = to.y + NODE_H / 2 - dy * factor
  const curve = Math.max(20, Math.abs(endX - startX) * .38)
  return `M ${startX} ${startY} C ${startX + Math.sign(dx || 1) * curve} ${startY + dy * .12}, ${endX - Math.sign(dx || 1) * curve} ${endY - dy * .12}, ${endX} ${endY}`
}

function wrapNodeLabel(label: string, maxChars = 17) {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxChars && line) { lines.push(line); line = word }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function wrapEdgeLabel(label: string, maxChars = 15) {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxChars && line) { lines.push(line); line = word }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function edgeLabelY(from: {x:number;y:number}, to: {x:number;y:number}) {
  if (Math.abs(from.y - to.y) < 28) return from.y >= 130 ? Math.min(from.y, to.y) - 13 : Math.max(from.y, to.y) + NODE_H + 14
  return Math.min(from.y, to.y) - 14
}

export function LinuxVisualLearningPage({ navigate }: { navigate: Navigate }) {
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [questions, setQuestions] = useState<LinuxQuestion[]>([])
  const [diagramId, setDiagramId] = useState(linuxDiagrams[0].id)
  const [selectedNodeId, setSelectedNodeId] = useState(linuxDiagrams[0].nodes[0].id)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [sequenceStep, setSequenceStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null)
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null)
  const selectionAnimationRef = useRef<ReturnType<typeof animate> | null>(null)
  const diagram = useMemo(() => diagramById(diagramId), [diagramId])
  const selectedNode = diagram.nodes.find((node) => node.id === selectedNodeId) ?? diagram.nodes[0]
  const selectedQuestion = questions.find((question) => question.slug === selectedNode.questionSlug)
  const topic = topics.find((item) => item.id === diagram.topicId)
  const sequenceIds = diagram.sequence

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLinuxTopics(controller.signal), getLinuxQuestions({}, controller.signal)])
      .then(([topicData, questionData]) => { setTopics(topicData); setQuestions(questionData) })
      .catch(() => { /* Diagrams remain usable when the content API is unavailable. */ })
    return () => controller.abort()
  }, [])
  useEffect(() => () => { selectionAnimationRef.current?.cancel() }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
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
      animate('.diagram-node', { opacity: [0, 1], translateY: [8, 0], delay: stagger(42), duration: 340, ease: 'outCubic' })
      const timeline = createTimeline({ autoplay: false, onComplete: () => setPlaying(false) })
      sequenceIds.forEach((id, index) => {
        const at = index * 680
        timeline.add(`#visual-node-${diagram.id}-${id}`, { opacity: [{ to: .35, duration: 1 }, { to: 1, duration: 440 }], scale: [{ to: .97, duration: 1 }, { to: 1, duration: 440 }], ease: 'outCubic' }, at)
        if (index > 0) timeline.add(`#visual-edge-${diagram.id}-${sequenceIds[index - 1]}-${id}`, { strokeDashoffset: [1000, 0], duration: 360, ease: 'outCubic' }, at - 220)
        timeline.call(() => { setSequenceStep(index + 1); setSelectedNodeId(id) }, at)
      })
      if (diagram.id === 'network') timeline.add('#network-packet', { ...svg.createMotionPath('#network-packet-path'), duration: sequenceIds.length * 680, ease: 'linear' }, 0)
      timelineRef.current = timeline
    })
    return () => { timelineRef.current?.cancel(); selectionAnimationRef.current?.cancel(); scope.revert(); timelineRef.current = null }
  }, [diagram, diagramId, reducedMotion, sequenceIds])

  const chooseDiagram = (id: string) => { setDiagramId(id); setAnswers({}) }
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
  const previousStep = () => {
    const next = Math.max(0, sequenceStep - 1)
    setSequenceStep(next)
    if (sequenceIds[Math.max(0, next - 1)]) setSelectedNodeId(sequenceIds[Math.max(0, next - 1)])
    setPlaying(false)
    timelineRef.current?.pause()
  }
  const nextStep = () => {
    const next = Math.min(sequenceIds.length, sequenceStep + 1)
    setSequenceStep(next)
    if (sequenceIds[next - 1]) setSelectedNodeId(sequenceIds[next - 1])
    setPlaying(false)
    timelineRef.current?.pause()
  }
  const pause = () => { timelineRef.current?.pause(); setPlaying(false) }
  const replay = () => { setSequenceStep(0); setSelectedNodeId(sequenceIds[0] ?? diagram.nodes[0].id); if (reducedMotion) { setPlaying(false); return }; timelineRef.current?.restart(); setPlaying(true) }
  const reset = () => { timelineRef.current?.pause(); timelineRef.current?.reset(); setSequenceStep(0); setPlaying(false); setSelectedNodeId(diagram.nodes[0].id) }
  const onNodeKeyDown = (event: ReactKeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseNode(id, event.currentTarget) }
  }
  const addAnswer = (quizIndex: number, optionIndex: number) => setAnswers((old) => ({ ...old, [`${diagram.id}:${quizIndex}`]: optionIndex }))

  return <LinuxLayout topics={topics} diagrams={linuxDiagrams} activeDiagramId={diagram.id} onSelectDiagram={chooseDiagram} activeItem="visual" navigate={navigate} eyebrow="VISUAL LEARNING">
    <div className="learn-content visual-learning-page">
      <div className="learn-breadcrumb"><button onClick={() => navigate('/linux')}>LINUX</button><ChevronRight size={12} /><span>VISUAL LEARNING</span></div>
      <header className="visual-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> LINUX / VISUAL FIELD GUIDE</div><h1>See the system.<br /><span>Understand the flow.</span></h1><p>Explore 12 interactive Linux architectures, inspect each component, then check your understanding with a short quiz.</p></div><div className="visual-heading-mark"><Sparkles size={22} /><span>12<br />DIAGRAMS</span></div></header>
      <section key={diagram.id} className="visual-workspace" aria-label={`${diagram.title} interactive diagram`}>
        <div className="visual-workspace-heading"><div><span className="section-overline">INTERACTIVE DIAGRAM / {String(linuxDiagrams.indexOf(diagram)+1).padStart(2,'0')}</span><h2>{diagram.title}</h2><p>{diagram.summary}</p></div><span className="visual-context-tag">{topic?.name ?? 'LINUX SYSTEMS'}</span></div>
        <div className="diagram-viewport" role="group" aria-label="Diagram; select a node for details">
          <svg ref={svgRef} className={`linux-diagram-svg diagram-${diagram.id}`} viewBox="0 0 1020 360" role="group" aria-labelledby={`diagram-title-${diagram.id} diagram-desc-${diagram.id}`}>
            <title id={`diagram-title-${diagram.id}`}>{diagram.title}</title><desc id={`diagram-desc-${diagram.id}`}>{diagram.summary} Select each labeled component to learn more.</desc>
            <defs><marker id={`arrow-${diagram.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
            <g className="diagram-boundaries" aria-hidden="true">{diagram.groups?.map((group) => <g key={group.id} className="diagram-boundary"><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="8"/><text className="diagram-boundary-title" x={group.x + 12} y={group.y + 18}>{group.title}</text><text className="diagram-boundary-caption" x={group.x + 12} y={group.y + 32}>{group.caption}</text></g>)}</g>
            <g className="diagram-edges">{diagram.edges.map(([fromId,toId]) => { const from=diagram.nodes.find((item)=>item.id===fromId)!; const to=diagram.nodes.find((item)=>item.id===toId)!; return <path id={`visual-edge-${diagram.id}-${fromId}-${toId}`} key={`${fromId}-${toId}`} pathLength={1000} d={edgePath(from,to)} markerEnd={`url(#arrow-${diagram.id})`} className="diagram-edge" /> })}</g>
            <g className="diagram-edge-labels" aria-hidden="true">{diagram.edges.map(([fromId,toId]) => { const label=diagram.edgeLabels?.[`${fromId}->${toId}`]; if(!label) return null; const from=diagram.nodes.find((item)=>item.id===fromId)!; const to=diagram.nodes.find((item)=>item.id===toId)!; const x=(from.x+NODE_W/2+to.x+NODE_W/2)/2; const y=edgeLabelY(from,to); const lines=wrapEdgeLabel(label); const width=Math.max(...lines.map((line)=>line.length))*5.1+12; const height=lines.length*10+6; return <g key={`${fromId}-${toId}`} className="diagram-edge-label" transform={`translate(${x} ${y})`}><rect x={-width/2} y={-height/2} width={width} height={height} rx="3"/><text textAnchor="middle" y={-((lines.length-1)*5)}>{lines.map((line,index)=><tspan key={index} x="0" dy={index===0?0:10}>{line}</tspan>)}</text></g> })}</g>
            {diagram.id === 'network' && <><path id="network-packet-path" className="network-packet-path" d="M 106 177 C 150 177 230 177 276 177 S 400 177 446 177 S 570 177 616 177 S 740 177 786 177 C 845 177 866 238 916 312" /><circle id="network-packet" className="network-packet" cx="0" cy="0" r="7" aria-label="Animated network packet" /></>}
            {diagram.nodes.map((item,index) => { const lines=wrapNodeLabel(item.label); return <g key={item.id} id={`visual-node-${diagram.id}-${item.id}`} className={`diagram-node${selectedNode.id===item.id?' selected':''}${sequenceIds.includes(item.id) ? ' is-sequence-node' : ''}`} transform={`translate(${item.x} ${item.y})`} role="button" tabIndex={0} aria-label={`${item.label}: show explanation`} aria-pressed={selectedNode.id===item.id} onClick={(event)=>chooseNode(item.id,event.currentTarget)} onKeyDown={(event)=>onNodeKeyDown(event,item.id)}>
              <rect width={NODE_W} height={NODE_H} rx="7" />
              {sequenceIds.includes(item.id) && <text className="diagram-step-number" x="11" y="16">{String(sequenceIds.indexOf(item.id)+1).padStart(2,'0')}</text>}
              <text className="diagram-node-label" x={NODE_W/2} y={lines.length>1?25:33} textAnchor="middle">{lines.map((line,lineIndex)=><tspan key={lineIndex} x={NODE_W/2} dy={lineIndex===0?0:12}>{line}</tspan>)}</text>
              <text className="diagram-node-meta" x={NODE_W/2} y="54" textAnchor="middle">{sequenceIds.includes(item.id)?`STEP ${String(sequenceIds.indexOf(item.id)+1).padStart(2,'0')}`:index===0?'SYSTEM COMPONENT':'SELECT TO EXPLORE'}</text>
            </g>})}
          </svg>
        </div>
        {sequenceIds.length > 0 && <div className="diagram-sequence-controls"><div className="sequence-stage"><span>GUIDED SYSTEM FLOW</span><b>{sequenceStep ? `${String(sequenceStep).padStart(2,'0')} / ${String(sequenceIds.length).padStart(2,'0')} · ${diagram.nodes.find((item)=>item.id===sequenceIds[Math.max(0,sequenceStep-1)])?.label ?? 'Ready'}` : `READY · ${sequenceIds.length} STEPS`}</b>{reducedMotion && <small>Reduced motion is on. Use Previous and Next step to navigate manually.</small>}</div><div className="sequence-buttons">{reducedMotion && <><button onClick={previousStep} disabled={sequenceStep===0} aria-label="Previous sequence step"><ArrowLeft size={14}/> Previous</button><button onClick={nextStep} disabled={sequenceStep>=sequenceIds.length} aria-label="Next sequence step">Next step <ArrowRight size={14}/></button></>}{!reducedMotion && <button onClick={playing?pause:play} aria-label={playing?'Pause sequence':'Play sequence'}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button>}<button onClick={replay} aria-label="Replay sequence"><RotateCcw size={14}/> Replay</button><button onClick={reset} aria-label="Reset sequence"><RotateCcw size={14}/> Reset</button></div></div>}
        {sequenceIds.length === 0 && <p className="diagram-interaction-hint"><span>01</span> Select any diagram component to inspect its role and related Linux content.</p>}
      </section>

      <div className="visual-details-grid">
        <section key={selectedNode.id} className="visual-explanation" aria-live="polite"><div className="section-overline">COMPONENT / {selectedNode.label.toUpperCase()}</div><h2>{selectedNode.label}<span>.</span></h2><p className="visual-node-description">{selectedNode.description}</p><div className="visual-detail-block"><b><CircleHelp size={14}/> Why it matters</b><p>{selectedNode.purpose}</p></div><div className="visual-detail-block"><b><Lightbulb size={14}/> In practice</b><p>{selectedNode.example}</p></div><div className="visual-related"><div className="section-overline">RELATED COMMANDS</div><div>{selectedNode.commands.map((command)=><code key={command}>{command}</code>)}</div><button className="visual-text-link" onClick={()=>navigate('/linux/commands')}><Command size={14}/> Open command reference <ArrowRight size={13}/></button></div><div className="visual-related-question"><span className="section-overline">INTERVIEW CONNECTION</span>{selectedQuestion?<><b>{selectedQuestion.question}</b><button className="visual-text-link" onClick={()=>navigate(`/linux/questions/${selectedQuestion.slug}`)}>Open answer <ExternalLink size={13}/></button></>:<span>Explore the linked Linux question from the topic library.</span>}</div></section>
        <section className="visual-quiz" aria-label={`${diagram.title} quiz`}><div className="visual-quiz-heading"><span><BookOpen size={15}/> CHECK YOUR UNDERSTANDING</span><b>{scoreDiagramQuiz(diagram.id,diagram.quiz,answers)} / {diagram.quiz.length} CORRECT</b></div>{diagram.quiz.map((quiz,index)=>{const answer=answers[`${diagram.id}:${index}`];return <article className="visual-quiz-question" key={`${diagram.id}-${index}`}><h3><span>{String(index+1).padStart(2,'0')}</span>{quiz.prompt}</h3><div className="visual-quiz-options">{quiz.options.map((option,optionIndex)=><button key={option} disabled={answer!==undefined} className={answer===optionIndex?(optionIndex===quiz.correct?'correct':'incorrect'):''} onClick={()=>addAnswer(index,optionIndex)}>{option}{answer===optionIndex&&<span>{optionIndex===quiz.correct?<Check size={14}/>:<span aria-hidden="true">×</span>}</span>}</button>)}</div>{answer!==undefined&&<p className={`quiz-feedback ${answer===quiz.correct?'is-correct':'is-incorrect'}`} role="status">{answer===quiz.correct?'Correct. ': 'Not quite. '}{quiz.feedback}</p>}</article>})}</section>
      </div>
      <section className="visual-next-steps"><div><span className="section-overline">KEEP LEARNING</span><b>Practice this topic with existing questions.</b></div><button onClick={()=>navigate(`/linux/questions?topic=${encodeURIComponent(diagram.topicId)}`)}>Browse topic questions <ArrowRight size={14}/></button><button onClick={()=>window.dispatchEvent(new Event('linux-copilot:open'))}><Terminal size={14}/> Open Linux Copilot</button></section>
      <footer className="learn-footer"><span>FIELDNOTES / LINUX VISUAL LEARNING</span><button onClick={()=>navigate('/linux')}><ArrowLeft size={13}/> Back to overview</button></footer>
    </div>
  </LinuxLayout>
}
