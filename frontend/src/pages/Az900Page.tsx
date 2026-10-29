import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, LoaderCircle, Network, RotateCcw, ShieldCheck, Target, Timer, X } from 'lucide-react'
import { getAz900Course, getAz900Questions } from '../lib/api'
import { AzureLayout } from '../components/azure/AzureLayout'
import { evaluateAz900Answers, formatRemainingTime, nextExamSecond, pickAz900Questions, readAz900Progress, writeAz900Progress, type Az900Attempt, type Az900Progress } from '../lib/azureProgress'
import type { Az900Course, Az900PracticeQuestion, Az900Section } from '../types/azure'
import type { Navigate } from '../lib/navigation'

type Props = { navigate: Navigate; sectionId?: string; lessonId?: string }
type ExamState = { questions: Az900PracticeQuestion[]; answers: Record<string, number>; seconds: number; running: boolean; confirm: boolean; result: boolean; attemptSaved?: boolean }

const flatLessons = (course: Az900Course) => course.sections.flatMap((section) => section.lessons.map((lesson) => ({ section, lesson })))

export function Az900Page({ navigate, sectionId, lessonId }: Props) {
  const [course, setCourse] = useState<Az900Course | null>(null)
  const [questions, setQuestions] = useState<Az900PracticeQuestion[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Az900Progress>(() => readAz900Progress())
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [examCount, setExamCount] = useState(20)
  const [examMinutes, setExamMinutes] = useState(30)
  const [exam, setExam] = useState<ExamState | null>(null)
  const [examSetupOpen, setExamSetupOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAz900Course(controller.signal), getAz900Questions(undefined, controller.signal)])
      .then(([courseData, questionData]) => { setCourse(courseData); setQuestions(questionData) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load AZ-900 course content.') })
    return () => controller.abort()
  }, [])

  useEffect(() => { writeAz900Progress(progress) }, [progress])

  const lessons = useMemo(() => course ? flatLessons(course) : [], [course])
  const currentIndex = sectionId && lessonId ? lessons.findIndex(({ section, lesson }) => section.id === sectionId && lesson.id === lessonId) : -1
  const current = currentIndex >= 0 ? lessons[currentIndex] : null
  const sectionQuestions = current ? questions.filter((question) => question.section_id === current.section.id) : []
  const examQuestions = exam?.questions ?? []
  const examScore = exam ? evaluateAz900Answers(exam.questions, exam.answers) : null

  useEffect(() => {
    if (!exam?.running) return
    const timerId = window.setInterval(() => setExam((value) => {
      if (!value?.running) return value
      const seconds = nextExamSecond(value.seconds)
      if (seconds === 0) return { ...value, seconds, running: false, confirm: false, result: true }
      return { ...value, seconds }
    }), 1000)
    return () => window.clearInterval(timerId)
  }, [exam?.running])

  useEffect(() => {
    if (!exam?.result || exam.attemptSaved || !examScore) return
    const attempt: Az900Attempt = { id: `mock-${Date.now()}`, kind: 'mock', date: new Date().toISOString(), correct: examScore.correct, total: examScore.total, percentage: examScore.percentage, sectionIds: [...new Set(exam.questions.map((question) => question.section_id))] }
    setProgress((value) => value.attempts.some((item) => item.id === attempt.id) ? value : { ...value, attempts: [...value.attempts, attempt].slice(-50) })
    setExam((value) => value?.result ? { ...value, attemptSaved: true } : value)
  }, [exam?.result, exam?.attemptSaved, examScore?.percentage])

  const openLesson = (section: Az900Section, lessonIdToOpen: string) => {
    setQuizOpen(false); setQuizAnswers({}); setQuizSubmitted(false); setExam(null)
    navigate(`/azure/az-900/${section.id}/${lessonIdToOpen}`)
    setProgress((value) => ({ ...value, resume: { sectionId: section.id, lessonId: lessonIdToOpen } }))
  }

  const openOverview = () => { setExam(null); setQuizOpen(false); navigate('/azure/az-900') }
  const openExamSetup = () => { setExam(null); setExamCount(20); setExamMinutes(30); setExamSetupOpen(true) }

  const toggleId = (field: 'completedLessonIds' | 'bookmarkedLessonIds', id: string) => setProgress((value) => ({ ...value, [field]: value[field].includes(id) ? value[field].filter((item) => item !== id) : [...value[field], id] }))

  const submitQuiz = () => {
    setQuizSubmitted(true)
    const score = evaluateAz900Answers(sectionQuestions, quizAnswers)
    const attempt: Az900Attempt = { id: `quiz-${Date.now()}`, kind: 'quiz', date: new Date().toISOString(), correct: score.correct, total: score.total, percentage: score.percentage, sectionIds: [current!.section.id] }
    setProgress((value) => ({ ...value, attempts: [...value.attempts, attempt].slice(-50) }))
  }

  const startExam = () => {
    setExam({ questions: pickAz900Questions(questions, examCount), answers: {}, seconds: examMinutes * 60, running: true, confirm: false, result: false })
  }

  const submitExam = () => setExam((value) => value ? { ...value, running: false, confirm: false, result: true } : value)

  if (error) return <div className="learn-app"><main className="learn-main"><div className="learn-content"><div className="browser-state browser-error" role="alert"><b>Course content is unavailable</b><span>{error}</span><button className="button-primary" onClick={() => window.location.reload()}>Try again</button><a href="/">Return to Fieldnotes</a></div></div></main></div>
  if (!course) return <div className="learn-app"><main className="learn-main"><div className="learn-content"><div className="browser-state" role="status"><LoaderCircle size={17} className="spin" /> Loading AZ-900 learning content…</div></div></main></div>

  const totalLessons = lessons.length
  const completedCount = progress.completedLessonIds.filter((id) => lessons.some(({ lesson }) => lesson.id === id)).length
  const percentageDone = totalLessons ? Math.round(completedCount / totalLessons * 100) : 0
  const resumeTarget = progress.resume ? lessons.find(({ section, lesson }) => section.id === progress.resume?.sectionId && lesson.id === progress.resume?.lessonId) : undefined

  return <AzureLayout sections={course.sections} activeSectionId={current?.section.id} navigate={navigate} openSection={(section) => openLesson(section, section.lessons[0].id)} openOverview={openOverview} openExam={openExamSetup}>
      <div className="learn-content az900-content">
        <div className="learn-breadcrumb"><button onClick={openOverview}>AZ-900</button><span>/</span><span>{current ? current.section.title.toUpperCase() : exam?.result ? 'PRACTICE RESULTS' : exam?.running ? 'TIMED PRACTICE EXAM' : 'COURSE OVERVIEW'}</span></div>

        {exam && <section className="az900-exam-view">
          {!exam.result ? <>
          <div className="dashboard-heading"><div><div className="eyebrow"><Timer size={14} /> ORIGINAL PRACTICE MATERIAL</div><h1>Timed practice exam<span>.</span></h1><p>Questions are original Fieldnotes study material, not actual Microsoft exam questions.</p></div>{exam.running && <div className={`az900-timer ${exam.seconds < 60 ? 'urgent' : ''}`} aria-live="polite"><Clock3 size={16} /><span>{formatRemainingTime(exam.seconds)}</span></div>}</div>
            {!exam.running && <div className="az900-notice">Time expired. Your answers are ready to review.</div>}
            <div className="az900-exam-layout"><div className="az900-exam-questions">{examQuestions.map((question, index) => <article className="az900-exam-question" id={`exam-${index}`} key={question.id}><div className="az900-question-heading"><span>QUESTION {index + 1} / {examQuestions.length}</span><small>{question.tags[1]}</small></div><h2>{question.prompt}</h2><div className="az900-options">{question.choices.map((choice, choiceIndex) => <label key={choice}><input type="radio" name={question.id} checked={exam.answers[question.id] === choiceIndex} disabled={!exam.running} onChange={() => setExam((value) => value ? { ...value, answers: { ...value.answers, [question.id]: choiceIndex } } : value)} /><span>{String.fromCharCode(65 + choiceIndex)}</span>{choice}</label>)}</div></article>)}</div>
              <aside className="az900-question-map"><b>QUESTION NAVIGATION</b><div>{examQuestions.map((question, index) => <button key={question.id} aria-label={`Go to question ${index + 1}${exam.answers[question.id] !== undefined ? ', answered' : ', unanswered'}`} className={exam.answers[question.id] !== undefined ? 'answered' : ''} onClick={() => document.getElementById(`exam-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{index + 1}</button>)}</div><small>{Object.keys(exam.answers).length} answered · {examQuestions.length - Object.keys(exam.answers).length} unanswered</small>{exam.running && <button className="button-primary az900-submit" onClick={() => setExam((value) => value ? { ...value, confirm: true } : value)}>Submit exam</button>}</aside>
            </div>
            {exam.confirm && <div className="az900-modal-backdrop" role="presentation"><section className="az900-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="az900-confirm-title"><button aria-label="Close confirmation" onClick={() => setExam((value) => value ? { ...value, confirm: false } : value)}><X size={17} /></button><h2 id="az900-confirm-title">Submit this practice exam?</h2><p>{exam.questions.length - Object.keys(exam.answers).length} question(s) are unanswered. You can still return to them after submission in the review.</p><div className="dashboard-actions"><button onClick={() => setExam((value) => value ? { ...value, confirm: false } : value)}>Keep working</button><button onClick={submitExam}>Submit and review</button></div></section></div>}
          </> : <ExamResults exam={exam} score={examScore!} course={course} onRestart={() => { setExam(null) }} />}
        </section>}

        {!exam && current && <section className="az900-lesson-view">
          <div className="dashboard-heading"><div><div className="eyebrow">SECTION {String(current.section.number).padStart(2, '0')} / {current.section.domain.toUpperCase()}</div><h1>{current.lesson.title}<span>.</span></h1><p>{current.section.objective_note}</p></div><div className="question-total"><strong>{String(current.section.number).padStart(2, '0')}</strong><span>OF 20<br />SECTIONS</span></div></div>
          <div className="az900-lesson-toolbar"><span><Clock3 size={14} /> About {Math.ceil(current.section.estimated_minutes / current.section.lessons.length)} min</span><button onClick={() => setQuizOpen((value) => !value)}><Target size={14} /> {quizOpen ? 'Close knowledge check' : 'Knowledge check'}</button><button className={progress.bookmarkedLessonIds.includes(current.lesson.id) ? 'saved' : ''} onClick={() => toggleId('bookmarkedLessonIds', current.lesson.id)}><Bookmark size={14} fill={progress.bookmarkedLessonIds.includes(current.lesson.id) ? 'currentColor' : 'none'} /> {progress.bookmarkedLessonIds.includes(current.lesson.id) ? 'Bookmarked' : 'Bookmark'}</button></div>
          <article className="az900-lesson-card"><div className="az900-overline">LESSON NOTES</div><p>{current.lesson.notes}</p><div className="az900-example"><b>IN PRACTICE</b><p>{current.lesson.example}</p></div><a className="az900-learn-more" href={current.lesson.learn_more} target="_blank" rel="noreferrer">Explore the related Microsoft Learn material <ArrowRight size={14} /></a></article>
          <section className="az900-objectives"><div><span className="az900-overline">LEARNING OBJECTIVES</span><ul>{current.section.objectives.map((item) => <li key={item}>{item}</li>)}</ul></div><div><span className="az900-overline">KEY TERMINOLOGY</span><div className="az900-tags">{current.section.terminology.map((term) => <span key={term}>{term}</span>)}</div></div><div><span className="az900-overline">REVISION NOTE</span><p>{current.section.revision_notes[0]}</p></div></section>
          <section className="az900-related"><span className="az900-overline">RELATED SECTIONS</span><div>{current.section.related_sections.map((id) => { const related = course.sections.find((section) => section.id === id); return related ? <button key={id} onClick={() => openLesson(related, related.lessons[0].id)}><span>{String(related.number).padStart(2, '0')}</span>{related.title}<ArrowRight size={13} /></button> : null })}</div></section>
          {quizOpen && <section className="az900-quiz"><div className="az900-quiz-title"><div><span className="section-overline">SECTION {String(current.section.number).padStart(2, '0')} KNOWLEDGE CHECK</span><h2>Check your understanding</h2></div><span>5 ORIGINAL QUESTIONS</span></div>{sectionQuestions.map((question, index) => <article className="az900-quiz-question" key={question.id}><b>{index + 1}. {question.prompt}</b><div className="az900-options">{question.choices.map((choice, choiceIndex) => <label key={choice} className={quizSubmitted ? choiceIndex === question.answer ? 'correct' : quizAnswers[question.id] === choiceIndex ? 'incorrect' : '' : ''}><input type="radio" name={`quiz-${question.id}`} checked={quizAnswers[question.id] === choiceIndex} disabled={quizSubmitted} onChange={() => setQuizAnswers((value) => ({ ...value, [question.id]: choiceIndex }))} /><span>{String.fromCharCode(65 + choiceIndex)}</span>{choice}</label>)}</div>{quizSubmitted && <p className="az900-explanation">{quizAnswers[question.id] === question.answer ? 'Correct. ' : quizAnswers[question.id] === undefined ? 'Not answered. ' : 'Review this concept. '}{question.explanation}</p>}</article>)}{!quizSubmitted ? <button className="button-primary" onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < sectionQuestions.length}>Submit knowledge check</button> : <div className="az900-quiz-result" role="status"><Check size={16} /> Score: {evaluateAz900Answers(sectionQuestions, quizAnswers).correct} / {sectionQuestions.length} correct <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false) }}><RotateCcw size={13} /> Try again</button></div>}</section>}
          <div className="az900-lesson-nav"><button disabled={currentIndex <= 0} onClick={() => currentIndex > 0 && openLesson(lessons[currentIndex - 1].section, lessons[currentIndex - 1].lesson.id)}><ArrowLeft size={15} /><span><small>PREVIOUS</small>{lessons[currentIndex - 1]?.lesson.title ?? 'Course start'}</span></button><button className="az900-complete-button" onClick={() => toggleId('completedLessonIds', current.lesson.id)}>{progress.completedLessonIds.includes(current.lesson.id) ? <><Check size={15} /> Completed</> : <>Mark lesson complete <Check size={15} /></>}</button><button disabled={currentIndex >= lessons.length - 1} onClick={() => currentIndex < lessons.length - 1 && openLesson(lessons[currentIndex + 1].section, lessons[currentIndex + 1].lesson.id)}><span><small>NEXT</small>{lessons[currentIndex + 1]?.lesson.title ?? 'Course complete'}</span><ArrowRight size={15} /></button></div>
        </section>}

        {!exam && !current && <section className="az900-overview">
          <div className="dashboard-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> AZURE FUNDAMENTALS / INDEPENDENT STUDY</div><h1>Build your AZ-900<br /><span>foundation.</span></h1><p>{course.description}</p></div><div className="question-total"><strong>{percentageDone}%</strong><span>COURSE<br />COMPLETE</span></div></div>
          <div className="az900-disclaimer">{course.disclaimer} Objectives last checked {course.exam_objectives_as_of}. <a href={course.official_study_guide} target="_blank" rel="noreferrer">Open current Microsoft Learn study guide <ArrowRight size={13} /></a></div>
          <div className="az900-domain-grid">{course.exam_domains.map((domain) => <article key={domain.name}><span>MEASURED DOMAIN</span><b>{domain.name}</b><small>{domain.weight} of exam content</small></article>)}</div>
          <div className="az900-overview-actions"><div className="az900-progress-summary"><span>COURSE PROGRESS</span><b>{percentageDone}% <small>· {completedCount}/{totalLessons} lessons</small></b><div className="az900-progress-track"><i style={{ width: `${percentageDone}%` }} /></div></div>{resumeTarget && <button className="button-primary" onClick={() => openLesson(resumeTarget.section, resumeTarget.lesson.id)}>Resume learning <ArrowRight size={15} /></button>}<button className="button-primary secondary" onClick={openExamSetup}>Start a timed practice exam <Timer size={15} /></button><button className="button-primary secondary" onClick={() => navigate('/azure/az-900/visual-learning')}><Network size={15} /> Visual learning</button></div>
          <div className="az900-overview-sections"><div className="list-section-heading"><div><span className="section-overline">THE LEARNING PATH</span><h2>20 sections, one clear path<span>.</span></h2></div><span className="section-count">{totalLessons} LESSONS · ABOUT {Math.round(course.sections.reduce((sum, section) => sum + section.estimated_minutes, 0) / 60)} HOURS</span></div>{course.sections.map((section) => <article className="az900-section-card" key={section.id}><div className="az900-section-card-top"><span>{String(section.number).padStart(2, '0')}</span><div><h3>{section.title}</h3><p>{section.objective_note}</p><small>{section.lessons.length} lessons · {section.estimated_minutes} min · {section.domain}</small></div><span className="az900-section-status">{section.lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id)).length}/{section.lessons.length}</span></div><div className="az900-lesson-links">{section.lessons.map((lesson) => <button key={lesson.id} onClick={() => openLesson(section, lesson.id)}>{progress.completedLessonIds.includes(lesson.id) && <Check size={13} />}{lesson.title}<ArrowRight size={13} /></button>)}</div></article>)}</div>
          <section className="az900-exam-setup" id="az900-exam-setup"><div><span className="section-overline">ORIGINAL PRACTICE MATERIAL</span><h2>Test your understanding</h2><p>Choose the number of questions and a timer. Your result includes answers, explanations, skipped items, and suggested revision sections.</p></div><div className="az900-setup-controls"><label>Questions<select value={examCount} onChange={(event) => setExamCount(Number(event.target.value))}>{[10,20,50,100].map((number) => <option key={number} value={number}>{number}</option>)}</select></label><label>Time<select value={examMinutes} onChange={(event) => setExamMinutes(Number(event.target.value))}>{[15,30,45,60].map((number) => <option key={number} value={number}>{number} min</option>)}</select></label><button className="button-primary" onClick={startExam}>Start timed exam <ArrowRight size={14} /></button></div></section>
          {progress.bookmarkedLessonIds.length > 0 && <section className="az900-bookmarks" id="az900-bookmarks"><span className="section-overline">SAVED FOR REVIEW</span><div>{lessons.filter(({ lesson }) => progress.bookmarkedLessonIds.includes(lesson.id)).map(({ section, lesson }) => <button key={lesson.id} onClick={() => openLesson(section, lesson.id)}><Bookmark size={13} fill="currentColor" /> {lesson.title}<small>{section.title}</small></button>)}</div></section>}
          {progress.attempts.length > 0 && <section className="az900-history"><span className="section-overline">RECENT QUIZ HISTORY</span><div>{[...progress.attempts].reverse().slice(0, 8).map((attempt) => <article key={attempt.id}><span>{attempt.kind === 'mock' ? 'MOCK EXAM' : course.sections.find((section) => section.id === attempt.sectionIds[0])?.title}</span><b>{attempt.correct}/{attempt.total} · {attempt.percentage}%</b><small>{new Date(attempt.date).toLocaleDateString()}</small></article>)}</div></section>}
        </section>}
    {examSetupOpen && <div className="az900-modal-backdrop" role="presentation"><section className="az900-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="az900-start-title"><button aria-label="Close exam setup" onClick={() => setExamSetupOpen(false)}><X size={17} /></button><h2 id="az900-start-title">Configure your practice exam</h2><p>All questions are original practice material and are not actual Microsoft exam questions.</p><div className="az900-setup-controls"><label>Questions<select value={examCount} onChange={(event) => setExamCount(Number(event.target.value))}>{[10,20,50,100].map((number) => <option key={number} value={number}>{number}</option>)}</select></label><label>Time<select value={examMinutes} onChange={(event) => setExamMinutes(Number(event.target.value))}>{[15,30,45,60].map((number) => <option key={number} value={number}>{number} min</option>)}</select></label></div><div className="dashboard-actions"><button onClick={() => setExamSetupOpen(false)}>Cancel</button><button onClick={() => { setExamSetupOpen(false); startExam() }}>Start exam</button></div></section></div>}
      <footer className="learn-footer"><span>FIELDNOTES / AZ-900</span><span>Independent study · Original practice material</span><a href={course.official_study_guide} target="_blank" rel="noreferrer">Microsoft Learn study guide</a></footer>
      </div>
  </AzureLayout>
}

function ExamResults({ exam, score, course, onRestart }: { exam: ExamState; score: ReturnType<typeof evaluateAz900Answers>; course: Az900Course; onRestart: () => void }) {
  const recommendations = [...new Set(exam.questions.filter((question) => exam.answers[question.id] !== question.answer).map((question) => question.section_id))]
  return <div className="az900-results"><div className="eyebrow"><Check size={14} /> PRACTICE ATTEMPT COMPLETE</div><h1>Review your results<span>.</span></h1><div className="az900-result-score"><b>{score.percentage}%</b><div><strong>{score.correct} correct · {score.incorrect} incorrect · {score.skipped} skipped</strong><span>{score.total} original practice questions</span></div></div><div className="az900-result-actions"><button className="button-primary" onClick={onRestart}><ArrowLeft size={14} /> Course overview</button><div><b>Recommended revision</b>{recommendations.length ? recommendations.map((id) => { const section = course.sections.find((item) => item.id === id)!; return <span key={id}>{String(section.number).padStart(2,'0')} · {section.title}</span> }) : <span>No missed topics. Continue reviewing across domains.</span>}</div></div><div className="az900-result-list">{exam.questions.map((question, index) => { const selected = exam.answers[question.id]; const correct = selected === question.answer; return <article key={question.id} className={correct ? 'is-correct' : 'is-wrong'}><div><span>QUESTION {index + 1} · {correct ? 'CORRECT' : selected === undefined ? 'SKIPPED' : 'INCORRECT'}</span><small>{question.tags[1]}</small></div><h2>{question.prompt}</h2><p><b>Your answer:</b> {selected === undefined ? 'Skipped' : question.choices[selected]}</p><p><b>Correct answer:</b> {question.choices[question.answer]}</p><p className="az900-explanation">{question.explanation}</p></article> })}</div></div>
}

