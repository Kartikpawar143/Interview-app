import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, LoaderCircle } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { getLinuxQuestions, getLinuxTopics } from '../lib/api'
import type { LinuxQuestion, LinuxTopic } from '../types/linux'
import type { Navigate } from '../lib/navigation'

export function LinuxDashboard({ navigate }: { navigate: Navigate }) {
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [questions, setQuestions] = useState<LinuxQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLinuxTopics(controller.signal), getLinuxQuestions({}, controller.signal)])
      .then(([topicData, questionData]) => { setTopics(topicData); setQuestions(questionData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load Linux content.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const questionCounts = useMemo(() => questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.topic_id] = (counts[question.topic_id] ?? 0) + 1
    return counts
  }, {}), [questions])

  return <LinuxLayout topics={topics} navigate={navigate}>
    <div className="learn-content">
      <div className="learn-breadcrumb"><span>FIELDNOTES</span><ChevronRight size={12} /><span>LINUX</span><ChevronRight size={12} /><span>OVERVIEW</span></div>
      <section className="dashboard-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> LINUX ADMINISTRATION / INTERVIEW GUIDE</div>
          <h1>Linux learning path<span>.</span></h1>
          <p>Build practical understanding of the systems that power modern infrastructure. Explore focused topics, then test your thinking with interview questions.</p>
        </div>
        <div className="question-total"><strong>{loading ? '—' : questions.length}</strong><span>QUESTIONS<br />IN THE LIBRARY</span></div>
      </section>

      {error && <div className="browser-state browser-error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}

      <section className="topic-section" id="topics">
        <div className="list-section-heading"><div><span className="section-overline">01 / BUILD YOUR FOUNDATION</span><h2>Explore by topic</h2></div><span className="section-count">{loading ? '—' : topics.length.toString().padStart(2, '0')} TOPICS</span></div>
        {loading ? <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading Linux topics…</div>
          : error ? null
            : topics.length === 0 ? <div className="browser-state empty-state" role="status"><b>No topics available</b><span>The topic list is currently empty.</span></div>
              : <div className="topic-cards">{topics.map((topic, index) => <button key={topic.id} type="button" className="topic-card" onClick={() => navigate(`/linux/topics/${encodeURIComponent(topic.slug)}`)}>
                <span className="topic-card-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-card-copy"><b>{topic.name}</b><small>{topic.description}</small></span>
                <span className="topic-card-count">{questionCounts[topic.id] ?? 0}<small>Q</small></span>
              </button>)}</div>}
      </section>
      <footer className="learn-footer"><span>FIELDNOTES / LINUX ADMINISTRATION</span><span>Clear thinking compounds.</span></footer>
    </div>
  </LinuxLayout>
}
