import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Command, LoaderCircle, Search, Terminal } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { getLinuxCommands, getLinuxTopics } from '../lib/api'
import type { LinuxCommand as LinuxCommandItem, LinuxTopic } from '../types/linux'
import type { Navigate } from '../lib/navigation'

export function LinuxCommandsPage({ navigate }: { navigate: Navigate }) {
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [commands, setCommands] = useState<LinuxCommandItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLinuxTopics(controller.signal), getLinuxCommands(controller.signal)])
      .then(([topicData, commandData]) => { setTopics(topicData); setCommands(commandData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load the command reference.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const filtered = useMemo(() => { const needle=query.trim().toLowerCase(); return commands.filter((item) => !needle || `${item.name} ${item.description} ${item.example}`.toLowerCase().includes(needle)) }, [commands,query])
  return <LinuxLayout topics={topics} navigate={navigate} eyebrow="LINUX / TOOLKIT"><div className="learn-content command-page"><div className="learn-breadcrumb"><button onClick={() => navigate('/linux')}>LINUX</button><span>/</span><span>COMMAND REFERENCE</span></div><button className="back-to-questions" onClick={() => navigate('/linux')}><ArrowLeft size={14} /> Back to learning path</button><div className="dashboard-heading command-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PRACTICAL TOOLKIT / LINUX</div><h1>Command reference<span>.</span></h1><p>A concise field guide to the commands used throughout the Linux interview library. Check a command’s purpose and a safe example before using it.</p></div><div className="question-total"><strong>{commands.length || '—'}</strong><span>COMMANDS<br />IN THE GUIDE</span></div></div><label className="search-field command-search"><Search size={16} /><span className="sr-only">Search command reference</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a command or task…" /></label>
    {loading ? <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading commands…</div> : error ? <div className="browser-state browser-error" role="alert">{error}</div> : filtered.length === 0 ? <div className="browser-state empty-state"><Search size={20} /><b>No commands found</b><span>Try another command or keyword.</span></div> : <div className="command-list">{filtered.map((item) => <article className="command-entry" key={item.id}><div className="command-entry-heading"><span><Terminal size={15} /> {item.name}</span><Command size={14} /></div><p>{item.description}</p><pre><code><span className="code-prompt">$</span> {item.example}</code></pre><small>{item.notes}</small></article>)}</div>}<div className="command-endnote">{filtered.length} of {commands.length} commands <span>·</span> Examples are for reference; verify before running on production systems.</div></div></LinuxLayout>
}
