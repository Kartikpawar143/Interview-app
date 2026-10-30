import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, BookOpen, Check, ChevronRight, Cloud, LoaderCircle, Search, X } from 'lucide-react'
import { AwsLayout } from '../components/aws/AwsLayout'
import { getAwsQuestion, getAwsQuestions, getAwsTopics } from '../lib/api'
import type { AwsDifficulty, AwsQuestion, AwsTopic } from '../types/aws'
import type { Navigate } from '../lib/navigation'

type AwsView = 'overview' | 'topic' | 'questions' | 'question'
const difficultyLevels: AwsDifficulty[] = ['beginner', 'intermediate', 'advanced']

export function AwsPage({ navigate, view, slug, topicFilter }: { navigate: Navigate; view: AwsView; slug?: string; topicFilter?: string }) {
  const [topics, setTopics] = useState<AwsTopic[]>([])
  const [questions, setQuestions] = useState<AwsQuestion[]>([])
  const [question, setQuestion] = useState<AwsQuestion | null>(null)
  const [query, setQuery] = useState('')
  const [topicId, setTopicId] = useState(topicFilter ?? '')
  const [difficulty, setDifficulty] = useState<AwsDifficulty | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAwsTopics(controller.signal), getAwsQuestions({}, controller.signal)])
      .then(([topicData, questionData]) => { setTopics(topicData); setQuestions(questionData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load AWS learning content.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (view !== 'question' || !slug) { setQuestion(null); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    getAwsQuestion(slug, controller.signal).then(setQuestion)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this AWS question.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [view, slug])

  useEffect(() => setTopicId(topicFilter ?? ''), [topicFilter])

  const activeTopic = view === 'topic' ? topics.find((item) => item.slug === slug || item.id === slug) : undefined
  const selectedTopic = topics.find((item) => item.id === topicId || item.slug === topicId)
  const visibleQuestions = useMemo(() => questions.filter((item) =>
    (!selectedTopic || item.topic_id === selectedTopic.id)
    && (!activeTopic || item.topic_id === activeTopic.id)
    && (!difficulty || item.difficulty === difficulty)
    && (!query.trim() || `${item.question} ${item.short_answer} ${item.detailed_explanation} ${item.real_world_example} ${item.topic} ${item.services.join(' ')} ${item.common_mistakes.join(' ')} ${item.interview_tips.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))),
  [questions, selectedTopic, activeTopic, difficulty, query])
  const topicQuestionCount = (id: string) => questions.filter((item) => item.topic_id === id).length
  const topicName = (id: string) => topics.find((item) => item.id === id)?.name ?? id

  return <AwsLayout topics={topics} activeTopic={activeTopic?.id ?? (view === 'question' ? question?.topic_id : undefined)} activeItem={view === 'questions' || view === 'question' ? 'questions' : 'overview'} navigate={navigate}>
    <div className="learn-content aws-content">
      <div className="learn-breadcrumb" aria-label="Breadcrumb"><button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} /><button onClick={() => navigate('/aws')}>AWS CLOUD</button>{view !== 'overview' && <><ChevronRight size={12} /><span>{view === 'topic' ? activeTopic?.name.toUpperCase() ?? 'TOPIC' : view === 'question' ? 'QUESTION DETAIL' : 'QUESTION LIBRARY'}</span></>}</div>
      {loading && <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading AWS content…</div>}
      {!loading && error && <div className="browser-state browser-error" role="alert"><b>AWS content is unavailable</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}

      {!loading && !error && view === 'overview' && <>
        <section className="dashboard-heading"><div><div className="eyebrow"><Cloud size={14} /> AWS CLOUD / LEARNING &amp; INTERVIEW PREP</div><h1>Understand AWS<br /><span>as a system.</span></h1><p>Build practical cloud knowledge across identity, compute, networking, storage, operations, and cost. The learning materials are static and never connect to AWS accounts or resources.</p></div><div className="question-total"><strong>{questions.length}</strong><span>QUESTIONS<br />IN THE LIBRARY</span></div></section>
        <section className="topic-section"><div className="list-section-heading"><div><span className="section-overline">AWS CLOUD FIELD GUIDE</span><h2>Explore AWS topics<span>.</span></h2></div><span className="section-count">{topics.length} TOPICS</span></div>
          {topics.length > 0 ? <div className="topic-cards">{topics.map((topic) => <button className="topic-card" key={topic.id} onClick={() => navigate(`/aws/topics/${encodeURIComponent(topic.slug)}`)}><span className="topic-card-index">{String(topic.order).padStart(2, '0')}</span><span className="topic-card-copy"><b>{topic.name}</b><small>{topic.description}</small></span><span className="topic-card-count"><small>QUESTIONS</small>{topicQuestionCount(topic.id)}</span></button>)}</div> : <div className="browser-state empty-state"><b>No AWS topics are available</b></div>}
        </section>
      </>}

      {!loading && !error && view === 'topic' && <>
        {activeTopic ? <><button className="back-to-questions" onClick={() => navigate('/aws')}><ArrowLeft size={14} /> Back to AWS topics</button><header className="topic-detail-heading"><div className="eyebrow"><span className="eyebrow-line" /> AWS CLOUD / TOPIC GUIDE</div><h1>{activeTopic.name}<span>.</span></h1><p>{activeTopic.description}</p><div className="topic-question-total"><strong>{topicQuestionCount(activeTopic.id)}</strong><span>QUESTIONS IN THIS TOPIC</span></div></header><section className="topic-question-section"><div className="list-section-heading"><div><span className="section-overline">PRACTICE &amp; PREPARE</span><h2>Questions in this topic</h2></div><span className="section-count">{topicQuestionCount(activeTopic.id)} QUESTIONS</span></div>{topicQuestionCount(activeTopic.id) ? <div className="question-list">{questions.filter((item) => item.topic_id === activeTopic.id).map((item) => <button className="question-row" key={item.id} onClick={() => navigate(`/aws/questions/${encodeURIComponent(item.slug)}`)}><div className="question-row-main"><div className="question-row-meta"><span>{item.topic}</span><span className="meta-divider">/</span><span>AWS CLOUD</span></div><h3>{item.question}</h3><p>{item.short_answer}</p></div><div className="question-row-end"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><ChevronRight size={17} /></div></button>)}</div> : <div className="browser-state empty-state"><b>No questions in this topic yet</b><span>This topic is ready for AWS interview content.</span><button onClick={() => navigate(`/aws/questions?topic=${encodeURIComponent(activeTopic.id)}`)}>Open question library</button></div>}</section></> : <div className="browser-state empty-state"><b>Topic not found</b><button onClick={() => navigate('/aws')}>Browse AWS topics</button></div>}
      </>}

      {!loading && !error && view === 'questions' && <>
        <section className="dashboard-heading question-bank-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AWS CLOUD / QUESTION BANK</div><h1>Browse AWS questions<span>.</span></h1><p>Search and filter original AWS interview questions by topic and difficulty.</p></div><div className="question-total"><strong>{questions.length}</strong><span>QUESTIONS<br />IN THE LIBRARY</span></div></section>
        {questions.length > 0 ? <section className="question-browser"><div className="list-section-heading"><div><span className="section-overline">SEARCH &amp; FILTER</span><h2>Interview questions</h2></div><span className="section-count">{visibleQuestions.length} RESULTS</span></div><div className="question-controls"><label className="search-field"><Search size={16} /><span className="sr-only">Search AWS interview questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, answers, services, or concepts…" />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label><label className="filter-label"><span className="sr-only">Filter by topic</span><select value={selectedTopic?.id ?? ''} onChange={(event) => { setTopicId(event.target.value); navigate(event.target.value ? `/aws/questions?topic=${encodeURIComponent(event.target.value)}` : '/aws/questions') }}><option value="">All topics</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="filter-label"><span className="sr-only">Filter by difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as AwsDifficulty | '')}><option value="">All levels</option>{difficultyLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label></div>
          {visibleQuestions.length ? <div className="question-list">{visibleQuestions.map((item) => <button className="question-row" key={item.id} onClick={() => navigate(`/aws/questions/${encodeURIComponent(item.slug)}`)}><div className="question-row-main"><div className="question-row-meta"><span>{item.topic}</span><span className="meta-divider">/</span><span>AWS CLOUD</span></div><h3>{item.question}</h3><p>{item.short_answer}</p></div><div className="question-row-end"><span className={`difficulty-badge difficulty-${item.difficulty}`}>{item.difficulty}</span><ChevronRight size={17} /></div></button>)}</div> : <div className="browser-state empty-state"><Search size={20} /><b>No matching questions</b><span>Try another search or clear a filter.</span><button onClick={() => { setQuery(''); setTopicId(''); setDifficulty(''); navigate('/aws/questions') }}>Clear filters</button></div>}</section> : <div className="browser-state empty-state"><BookOpen size={20} /><b>The AWS question library is ready</b><span>No questions match this view. Try another search or filter.</span><button onClick={() => navigate('/aws')}>Return to AWS overview</button></div>}
      </>}

      {!loading && !error && view === 'question' && <>{question ? <><button className="back-to-questions" onClick={() => navigate(`/aws/topics/${encodeURIComponent(question.topic_id)}`)}><ArrowLeft size={14} /> Back to {topicName(question.topic_id)}</button><article className="question-detail"><header className="detail-heading"><div className="detail-meta"><span>AWS CLOUD</span><span className="meta-divider">/</span><span>{topicName(question.topic_id)}</span><span className={`difficulty-badge difficulty-${question.difficulty}`}>{question.difficulty}</span></div><h1>{question.question}</h1><div className="detail-submeta"><span>Original interview preparation</span><span>{question.id.toUpperCase()}</span></div></header><section className="answer-summary"><div className="answer-label"><Check size={14} /> THE SHORT ANSWER</div><p>{question.short_answer}</p></section><DetailSection number="01" title="Technical explanation"><div className="prose-block"><p>{question.detailed_explanation}</p></div></DetailSection><DetailSection number="02" title="AWS services"><ul className="detail-bullets">{question.services.map((service) => <li key={service}>{service}</li>)}</ul></DetailSection><DetailSection number="03" title="Real-world example"><div className="prose-block"><p>{question.real_world_example}</p></div></DetailSection><DetailSection number="04" title="Troubleshooting approach"><ol className="detail-steps">{question.troubleshooting_steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></DetailSection><DetailSection number="05" title="Common mistakes"><ul className="detail-bullets">{question.common_mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></DetailSection><DetailSection number="06" title="Cost considerations"><div className="prose-block"><p>{question.cost_considerations}</p></div></DetailSection><DetailSection number="07" title="Interview tips"><ul className="detail-bullets">{question.interview_tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></DetailSection><section className="followup-section"><div className="section-overline">KEEP GOING / FOLLOW-UP QUESTIONS</div>{question.follow_up_questions.map((item, index) => <div className="followup-row" key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></div>)}</section><DetailSection number="08" title="Official references"><ul className="detail-bullets">{question.documentation_links.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer">{new URL(link).hostname} documentation</a></li>)}</ul></DetailSection><section className="followup-section"><div className="section-overline">RELATED QUESTIONS</div><div className="question-list">{question.related_question_ids.map((id) => questions.find((item) => item.id === id)).filter((item): item is AwsQuestion => Boolean(item)).map((item) => <button className="question-row" key={item.id} onClick={() => navigate(`/aws/questions/${encodeURIComponent(item.slug)}`)}><div className="question-row-main"><div className="question-row-meta"><span>{item.topic}</span><span className="meta-divider">/</span><span>{item.difficulty}</span></div><h3>{item.question}</h3></div><ChevronRight size={17} /></button>)}</div></section></article></> : <div className="browser-state empty-state"><b>Question not found</b><button onClick={() => navigate('/aws/questions')}>Browse AWS questions</button></div>}</>}
      <footer className="learn-footer"><span>FIELDNOTES / AWS CLOUD</span><span>Static learning content · No AWS account required</span></footer>
    </div>
  </AwsLayout>
}

function DetailSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="detail-section"><div className="detail-section-title"><span>{number}</span><h2>{title}</h2></div>{children}</section>
}
