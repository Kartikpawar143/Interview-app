import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronRight, LoaderCircle } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { getLinuxQuestions, getLinuxTopics } from '../lib/api'
import type { LinuxQuestion, LinuxTopic } from '../types/linux'
import type { Navigate } from '../lib/navigation'

export function LinuxTopicPage({ slug, navigate }: { slug: string; navigate: Navigate }) {
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [topic, setTopic] = useState<LinuxTopic | null>(null)
  const [questions, setQuestions] = useState<LinuxQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setTopic(null)
    setQuestions([])

    Promise.all([getLinuxTopics(controller.signal), getLinuxQuestions({ topic: slug }, controller.signal)])
      .then(([topicData, questionData]) => {
        setTopics(topicData)
        const matchedTopic = topicData.find((item) => item.slug === slug || item.id === slug)
        if (!matchedTopic) return

        const matchingQuestions = questionData.filter((question) => question.topic_id === matchedTopic.id)
        setTopic(matchedTopic)
        setQuestions(matchingQuestions)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this topic.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [slug])

  const notFound = !loading && !error && !topic
  const activeTopic = topic?.id

  return <LinuxLayout topics={topics} activeTopic={activeTopic} navigate={navigate} eyebrow="LINUX TOPICS">
    <div className="learn-content topic-detail-content">
      <div className="learn-breadcrumb" role="navigation" aria-label="Breadcrumb">
        <button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} />
        <button onClick={() => navigate('/linux')}>LINUX</button><ChevronRight size={12} />
        <span>{topic?.name.toUpperCase() ?? 'TOPIC'}</span>
      </div>

      <button className="back-to-questions" onClick={() => navigate('/linux')}><ArrowLeft size={14} /> Back to Topics</button>

      {loading ? <div className="topic-page-state" role="status"><LoaderCircle size={18} className="spin" /> Loading topic and questions…</div>
        : error ? <div className="topic-page-state topic-page-error" role="alert"><b>Unable to load this topic</b><span>{error}</span><button className="button-primary" onClick={() => navigate('/linux')}>Back to Topics <ArrowRight size={15} /></button></div>
          : notFound ? <div className="topic-page-state topic-page-error" role="alert"><b>Topic not found</b><span>No Linux topic matches “{slug}”.</span><button className="button-primary" onClick={() => navigate('/linux')}>Browse all topics <ArrowRight size={15} /></button></div>
            : topic && <>
              <header className="topic-detail-heading">
                <div className="eyebrow"><span className="eyebrow-line" /> LINUX ADMINISTRATION / TOPIC GUIDE</div>
                <h1>{topic.name}<span>.</span></h1>
                <p>{topic.description}</p>
                <div className="topic-question-total"><strong>{questions.length}</strong><span>{questions.length === 1 ? 'QUESTION' : 'QUESTIONS'} IN THIS TOPIC</span></div>
              </header>

              <section className="topic-question-section" aria-labelledby="topic-question-title">
                <div className="list-section-heading"><div><span className="section-overline">PRACTICE &amp; PREPARE</span><h2 id="topic-question-title">Questions in this topic</h2></div><span className="section-count">{questions.length} QUESTIONS</span></div>
                {questions.length === 0 ? <div className="topic-page-state topic-page-empty" role="status"><b>No questions in this topic yet</b><span>The topic is available, but the backend returned no matching questions.</span></div>
                  : <div className="topic-question-list">{questions.map((question) => <button className="topic-question-row" type="button" key={question.id} onClick={() => navigate(`/linux/questions/${encodeURIComponent(question.slug)}`)}>
                    <span className="topic-question-copy"><span className="topic-question-meta">{question.experience_level}<span aria-hidden="true">·</span><span className={`difficulty-badge difficulty-${question.difficulty}`}>{question.difficulty}</span></span><b>{question.question}</b><small>{question.short_answer}</small></span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>)}</div>}
              </section>
            </>}
    </div>
  </LinuxLayout>
}
