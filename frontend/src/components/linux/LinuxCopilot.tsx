import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, Copy, CornerDownLeft, ExternalLink, Lightbulb, Maximize2, Minimize2, RotateCcw, Send, Terminal, Trash2, X } from 'lucide-react'
import { getLinuxCopilotExercises, type LinuxCopilotExercise } from '../../lib/api'
import { commandHelp, LinuxSimulator } from '../../lib/linuxSimulator'

type Mode = 'learn' | 'practice' | 'troubleshoot'
interface Line { id: number; command: string; output: string; explanation: string }
interface ChatMessage { id: number; question: string; answer: string }
const starters = ['pwd', 'ls -la', 'df -h', 'ps aux']

export function LinuxCopilot() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<Mode>('learn')
  const [input, setInput] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [exercises, setExercises] = useState<LinuxCopilotExercise[]>([])
  const [exercise, setExercise] = useState<LinuxCopilotExercise | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [simulator] = useState(() => new LinuxSimulator())
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const controller = new AbortController(); getLinuxCopilotExercises(controller.signal).then(setExercises).catch(() => setExercises([])); return () => controller.abort() }, [])
  useEffect(() => { const openCopilot = () => setOpen(true); window.addEventListener('linux-copilot:open', openCopilot); return () => window.removeEventListener('linux-copilot:open', openCopilot) }, [])
  useEffect(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' }) }, [lines])
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', onKey); inputRef.current?.focus(); return () => window.removeEventListener('keydown', onKey) }, [open])

  const run = (value = input) => {
    const command = value.trim()
    if (!command) return
    const result = simulator.execute(command)
    const next = { id: Date.now() + Math.random(), command, output: result.output, explanation: result.explanation }
    setLines((old) => [...old, next]); setHistory((old) => [...old, command]); setHistoryIndex(-1); setInput('')
    if (command === 'clear') setLines([])
  }
  const reset = () => { simulator.reset(); setLines([]); setInput(''); setHistory([]); setHistoryIndex(-1); setExercise(null); setHintVisible(false) }
  const copy = async (line: Line) => { await navigator.clipboard?.writeText(`$ ${line.command}\n${line.output}`); setCopied(line.id); window.setTimeout(() => setCopied(null), 1200) }
  const setModeAndExercise = (nextMode: Mode) => { setMode(nextMode); if (nextMode === 'troubleshoot' && exercises.length) setExercise((current) => current ?? exercises[0]); if (nextMode !== 'troubleshoot') { setExercise(null); setHintVisible(false) } }
  const askCopilot = (question = chatInput) => {
    const text = question.trim()
    if (!text) return
    const matched = Object.entries(commandHelp).find(([command, description]) => text.toLowerCase().includes(command) || description.toLowerCase().includes(text.toLowerCase()))
    const answer = matched
      ? `${matched[0]}: ${matched[1]} Try it in the terminal below; all output is simulated.`
      : 'Start by describing what you want to inspect. In this lab, try pwd for your location, ls to browse files, cat to read a file, df -h for disk space, free -h for memory, or ps aux for processes.'
    setChatMessages((old) => [...old, { id: Date.now() + Math.random(), question: text, answer }])
    setChatInput('')
  }

  return <>
    <button className={`copilot-launcher${open ? ' is-open' : ''}`} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Linux Copilot' : 'Open Linux Copilot'} aria-expanded={open}><span className="copilot-launch-icon">{open ? <X size={19} /> : <Terminal size={20} />}</span><span>{open ? 'Close Copilot' : 'Linux Copilot'}</span><i /></button>
    {open && <section className={`copilot-panel${expanded ? ' is-expanded' : ''}`} aria-label="Linux Copilot terminal" aria-modal="false">
      <header className="copilot-topbar"><div className="copilot-title-mark"><Terminal size={17} /></div><div className="copilot-title"><b>Linux Copilot</b><span><i /> SIMULATED LINUX LAB</span></div><button className="copilot-icon-button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Shrink panel' : 'Expand panel'}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button><button className="copilot-icon-button" onClick={() => setOpen(false)} aria-label="Close Linux Copilot"><X size={17} /></button></header>
      <nav className="copilot-modes" aria-label="Copilot mode">{(['learn','practice','troubleshoot'] as Mode[]).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setModeAndExercise(item)}>{item === 'learn' ? <BookOpen size={14} /> : item === 'practice' ? <CornerDownLeft size={14} /> : <Lightbulb size={14} />}{item}</button>)}</nav>
      {mode === 'learn' && <div className="copilot-learn"><b>Ask about Linux</b><p>Ask a beginner question or try a command. Answers are based on this guide; terminal output is simulated.</p>{chatMessages.length > 0 && <div className="copilot-chat-messages" aria-live="polite">{chatMessages.slice(-3).map((message) => <article key={message.id}><b>{message.question}</b><p>{message.answer}</p></article>)}</div>}<form className="copilot-chat-form" onSubmit={(event) => { event.preventDefault(); askCopilot() }}><input aria-label="Ask Linux Copilot a question" placeholder="What does grep do?" value={chatInput} onChange={(event) => setChatInput(event.target.value)} /><button type="submit" aria-label="Ask Copilot"><Send size={13} /></button></form><div>{starters.map((cmd) => <button key={cmd} onClick={() => run(cmd)}>{cmd}</button>)}</div></div>}
      {mode === 'practice' && <div className="copilot-learn"><b>Practice at your pace</b><p>Try a command from memory, then read the explanation. You can create files and folders here; reset restores the starter lab.</p><div>{['grep ERROR /var/log/app.log','mkdir practice','touch practice/notes.txt'].map((cmd) => <button key={cmd} onClick={() => run(cmd)}>{cmd}</button>)}</div></div>}
      {mode === 'troubleshoot' && <div className="copilot-exercise"><label htmlFor="copilot-exercise-select">CHOOSE AN EXERCISE</label><div className="copilot-select-wrap"><select id="copilot-exercise-select" value={exercise?.id ?? ''} onChange={(event) => { setExercise(exercises.find((item) => item.id === event.target.value) ?? null); setHintVisible(false) }}>{exercises.map((item) => <option key={item.id} value={item.id}>{item.category}: {item.title}</option>)}</select><ChevronDown size={14} /></div>{exercise && <><p>{exercise.scenario}</p><div className="copilot-exercise-links"><a href={`/linux/topics/${exercise.topic_id}`}>Topic <ExternalLink size={12} /></a><a href={`/linux/questions/${exercise.question_slug}`}>Interview question <ExternalLink size={12} /></a></div>{hintVisible && <aside>{exercise.hint}</aside>}<button className="copilot-hint" onClick={() => setHintVisible((value) => !value)}><Lightbulb size={13} /> {hintVisible ? 'Hide hint' : 'Show hint'}</button></>}</div>}
      <div className="copilot-terminal-head"><span><i /> learner@fieldnotes:{simulator.currentDirectory}$</span><div><button onClick={() => { setLines([]) }} aria-label="Clear terminal output" title="Clear output"><Trash2 size={14} /></button><button onClick={reset} aria-label="Reset simulator" title="Reset virtual lab"><RotateCcw size={14} /></button></div></div>
      <div className="copilot-output" ref={outputRef} aria-live="polite">{lines.length === 0 && <div className="copilot-welcome"><span>FIELDNOTES / LINUX LAB</span><p>Type <code>help</code> to see available commands.</p><small>Simulated output · no host system access</small></div>}{lines.map((line) => <article key={line.id} className="copilot-result"><div className="copilot-command-line"><span>$ {line.command}</span><button onClick={() => copy(line)} aria-label="Copy command and output">{copied === line.id ? <Check size={13} /> : <Copy size={13} />}</button></div><pre>{line.output}</pre>{line.explanation && <div className="copilot-explanation"><Lightbulb size={13} /><span>{commandHelp[line.command.split(/\s/)[0]] ?? line.explanation}</span></div>}</article>)}</div>
      <form className="copilot-input-row" onSubmit={(event) => { event.preventDefault(); run() }}><span aria-hidden="true">$</span><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); const index = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(index); setInput(history[index] ?? '') } else if (event.key === 'ArrowDown') { event.preventDefault(); const index = Math.min(history.length, historyIndex + 1); setHistoryIndex(index); setInput(history[index] ?? '') } }} aria-label="Linux terminal command" placeholder="Type a command…" autoComplete="off" spellCheck="false" /><button type="submit" aria-label="Run command"><Send size={15} /></button></form>
      <footer className="copilot-footer"><span><i /> VIRTUAL FILESYSTEM ONLY</span><button onClick={() => inputRef.current?.focus()}>↑↓ history</button></footer>
    </section>}
  </>
}
