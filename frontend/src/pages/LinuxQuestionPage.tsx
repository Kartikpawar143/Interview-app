import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Command, CornerDownRight, LoaderCircle } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { getLinuxQuestion, getLinuxQuestions, getLinuxTopics } from '../lib/api'
import type { LinuxQuestion, LinuxTopic } from '../types/linux'
import type { Navigate } from '../lib/navigation'

export function LinuxQuestionPage({ slug, navigate }: { slug: string; navigate: Navigate }) {
  const [question, setQuestion] = useState<LinuxQuestion | null>(null)
  const [related, setRelated] = useState<LinuxQuestion[]>([])
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([getLinuxQuestion(slug, controller.signal), getLinuxTopics(controller.signal)])
      .then(async ([data, topicData]) => {
        setQuestion(data); setTopics(topicData)
        const siblings = await getLinuxQuestions({ topic: data.topic_id }, controller.signal)
        setRelated(siblings.filter((item) => item.slug !== data.slug).slice(0, 4))
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this question.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [slug])

  const topicIndex = topics.findIndex((topic) => topic.id === question?.topic_id)
  return <LinuxLayout topics={topics} activeTopic={question?.topic_id} navigate={navigate} eyebrow="QUESTION / FIELD GUIDE">
    <div className="learn-content detail-content"><div className="learn-breadcrumb"><button onClick={() => navigate('/linux')}>LINUX</button><ChevronRight size={12} /><button onClick={() => question && navigate(`/linux/topics/${encodeURIComponent(question.topic_id)}`)}>{question?.topic.toUpperCase() ?? 'QUESTION'}</button><ChevronRight size={12} /><span>DETAIL</span></div>
      {loading ? <div className="detail-state" role="status"><LoaderCircle size={18} className="spin" /> Loading question…</div> : error || !question ? <div className="detail-state detail-error" role="alert"><b>Question unavailable</b><span>{error || 'This question could not be found.'}</span><button className="button-primary" onClick={() => navigate('/linux')}>Back to Linux questions <ArrowRight size={15} /></button></div> : <>
        <button className="back-to-questions" onClick={() => navigate(`/linux/topics/${encodeURIComponent(question.topic_id)}`)}><ArrowLeft size={14} /> Back to {question.topic}</button>
        <article className="question-detail"><header className="detail-heading"><div className="detail-meta"><span>LINUX / {String(topicIndex + 1).padStart(2,'0')}</span><span className="meta-divider">/</span><span>{question.topic}</span><span className={`difficulty-badge difficulty-${question.difficulty}`}>{question.difficulty}</span></div><h1>{question.question}</h1><div className="detail-submeta"><span><Clock3 size={13} /> {question.experience_level}</span><span>QUESTION {question.id.toUpperCase()}</span></div></header>
          <section className="answer-summary"><div className="answer-label"><Check size={14} /> THE SHORT ANSWER</div><p>{question.short_answer}</p></section>
          <section className="detail-section"><div className="detail-section-title"><span>01</span><h2>Technical explanation</h2></div><div className="prose-block"><p>{question.detailed_explanation}</p></div></section>
          <section className="detail-section"><div className="detail-section-title"><span>02</span><h2>Commands &amp; output</h2></div><div className="code-examples">{question.commands.map((command,index) => <div className="code-example" key={`${index}-${command}`}><div className="code-title"><Command size={13} /> COMMAND LINE</div><pre><code><span className="code-prompt">$</span> {command}</code></pre>{question.sample_output && <pre className="code-output"><code>{question.sample_output}</code></pre>}</div>)}</div></section>
          <section className="detail-section"><div className="detail-section-title"><span>03</span><h2>Where this comes up</h2></div>{question.real_world_examples.map((example,index) => <div className="detail-note" key={index}><CornerDownRight size={15} /><p>{example}</p></div>)}</section>
          <section className="detail-section"><div className="detail-section-title"><span>04</span><h2>Troubleshooting approach</h2></div><ol className="detail-steps">{question.troubleshooting_steps.map((step,index) => <li key={index}><span>{String(index+1).padStart(2,'0')}</span><p>{step}</p></li>)}</ol></section>
          <section className="detail-section detail-split"><div><div className="detail-section-title"><span>05</span><h2>Common mistakes</h2></div><ul className="detail-bullets">{question.common_mistakes.map((mistake,index) => <li key={index}>{mistake}</li>)}</ul></div><div><div className="detail-section-title"><span>06</span><h2>Cost considerations</h2></div><div className="prose-block"><p>{question.cost_considerations}</p></div></div></section>
          <section className="followup-section"><div className="section-overline">KEEP GOING / FOLLOW-UP QUESTIONS</div>{question.follow_up_questions.map((followup,index) => <div className="followup-row" key={index}><span>{String(index+1).padStart(2,'0')}</span><p>{followup}</p></div>)}</section>
        </article>
        {related.length > 0 && <section className="related-section"><div className="list-section-heading"><div><span className="section-overline">CONTINUE IN THIS TOPIC</span><h2>Related questions</h2></div><button onClick={() => navigate(`/linux/topics/${encodeURIComponent(question.topic_id)}`)}>View all <ArrowRight size={14} /></button></div><div className="related-list">{related.map((item) => <button key={item.id} onClick={() => navigate(`/linux/questions/${encodeURIComponent(item.slug)}`)}><span className={`difficulty-indicator indicator-${item.difficulty}`} /><span>{item.question}</span><ArrowRight size={14} /></button>)}</div></section>}
      </>}
    </div>
  </LinuxLayout>
}
