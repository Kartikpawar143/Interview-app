import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react'
import { LinuxLayout } from '../components/linux/LinuxLayout'
import { getLinuxQuestions, getLinuxTopics, searchLinuxQuestions } from '../lib/api'
import type { Difficulty, LinuxQuestion, LinuxTopic } from '../types/linux'
import type { Navigate } from '../lib/navigation'

const levels: Difficulty[] = ['beginner', 'intermediate', 'advanced']

function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={`difficulty-badge difficulty-${level}`}>{level}</span>
}

function QuestionRow({ question, navigate }: { question: LinuxQuestion; navigate: Navigate }) {
  return <button className="question-row" type="button" onClick={() => navigate(`/linux/questions/${encodeURIComponent(question.slug)}`)}>
    <div className="question-row-main"><div className="question-row-meta"><span>{question.topic}</span><span className="meta-divider">/</span><span>{question.experience_level}</span></div><h3>{question.question}</h3><p>{question.short_answer}</p></div><div className="question-row-end"><DifficultyBadge level={question.difficulty} /><ChevronRight size={17} /></div>
  </button>
}

export function LinuxQuestionBankPage({ navigate, topicFilter }: { navigate: Navigate; topicFilter?: string }) {
  const [topics, setTopics] = useState<LinuxTopic[]>([])
  const [allQuestions, setAllQuestions] = useState<LinuxQuestion[]>([])
  const [results, setResults] = useState<LinuxQuestion[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(12)

  const normalizedTopicFilter = topicFilter?.trim().toLowerCase()
  const selectedTopic = topics.find((topic) => topic.id.toLowerCase() === normalizedTopicFilter || topic.slug.toLowerCase() === normalizedTopicFilter)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLinuxTopics(controller.signal), getLinuxQuestions({}, controller.signal)])
      .then(([topicData, questionData]) => { setTopics(topicData); setAllQuestions(questionData); setResults(questionData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load Linux questions.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (loading) return
    const controller = new AbortController()
    setFilterLoading(true)
    setError('')
    const filters = { topic: selectedTopic?.id ?? topicFilter, difficulty: difficulty || undefined }
    const request = debouncedQuery.length >= 2
      ? searchLinuxQuestions(debouncedQuery, filters, controller.signal)
      : getLinuxQuestions(filters, controller.signal)
    request.then((data) => setResults(debouncedQuery.length === 1
      ? data.filter((item) => `${item.question} ${item.short_answer} ${item.topic}`.toLowerCase().includes(debouncedQuery.toLowerCase()))
      : data))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load questions.') })
      .finally(() => { if (!controller.signal.aborted) setFilterLoading(false) })
    return () => controller.abort()
  }, [topicFilter, selectedTopic?.id, difficulty, debouncedQuery, loading])

  useEffect(() => setVisibleCount(12), [topicFilter, difficulty, debouncedQuery])

  const invalidTopic = !loading && Boolean(topicFilter) && topics.length > 0 && !selectedTopic
  const visible = useMemo(() => results.slice(0, visibleCount), [results, visibleCount])

  return <LinuxLayout topics={topics} activeTopic={selectedTopic?.id} activeItem="questions" navigate={navigate} eyebrow="QUESTION BANK">
    <div className="learn-content">
      <div className="learn-breadcrumb"><button onClick={() => navigate('/')}>FIELDNOTES</button><ChevronRight size={12} /><button onClick={() => navigate('/linux')}>LINUX</button><ChevronRight size={12} /><span>QUESTION BANK</span></div>
      <button className="back-to-questions" onClick={() => navigate('/linux')}><ArrowLeft size={14} /> Back to Overview</button>
      <section className="dashboard-heading question-bank-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> LINUX ADMINISTRATION / QUESTION BANK</div><h1>{selectedTopic ? selectedTopic.name : 'Browse all questions'}<span>.</span></h1><p>{selectedTopic ? `Questions and interview answers in ${selectedTopic.name}.` : 'Search and filter the complete Linux interview question library.'}</p></div><div className="question-total"><strong>{loading ? '—' : allQuestions.length}</strong><span>QUESTIONS<br />IN THE LIBRARY</span></div></section>

      {invalidTopic && <div className="invalid-topic" role="alert"><span>Topic “{topicFilter}” was not found.</span><button type="button" onClick={() => navigate('/linux/questions')}>Show all questions</button></div>}

      <section className="question-browser question-bank-browser"><div className="list-section-heading"><div><span className="section-overline">SEARCH &amp; FILTER</span><h2>{selectedTopic ? 'Questions in this topic' : 'Interview questions'}</h2></div><span className="section-count">{results.length} RESULTS</span></div><div className="question-controls"><label className="search-field"><Search size={16} /><span className="sr-only">Search Linux interview questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, topics, or concepts…" /><kbd>/</kbd>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label><label className="filter-label"><span className="sr-only">Filter by topic</span><select value={selectedTopic?.id ?? ''} onChange={(event) => navigate(event.target.value ? `/linux/questions?topic=${encodeURIComponent(event.target.value)}` : '/linux/questions')}><option value="">All topics</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label><label className="filter-label"><span className="sr-only">Filter by difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | '')}><option value="">All levels</option>{levels.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}</select></label></div>
        {loading || filterLoading ? <div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> {loading ? 'Loading Linux questions…' : 'Updating questions…'}</div>
          : error ? <div className="browser-state browser-error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>
            : results.length === 0 ? <div className="browser-state empty-state"><Search size={20} /><b>{invalidTopic ? 'Topic not found' : 'No matching questions'}</b><span>{invalidTopic ? 'Choose a topic from the filter or return to all questions.' : 'Try another search term or clear one of the filters.'}</span><button onClick={() => { setQuery(''); setDifficulty(''); navigate('/linux/questions') }}>Clear filters</button></div>
              : <><div className="question-list">{visible.map((question) => <QuestionRow key={question.id} question={question} navigate={navigate} />)}</div>{visibleCount < results.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 12)}>Load more questions <span>{results.length - visibleCount} remaining</span></button>}</>}
      </section>
      <footer className="learn-footer"><span>FIELDNOTES / LINUX ADMINISTRATION</span><span>Clear thinking compounds.</span></footer>
    </div>
  </LinuxLayout>
}
