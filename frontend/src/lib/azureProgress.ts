import type { Az900PracticeQuestion } from '../types/azure'

export const AZ900_PROGRESS_KEY = 'fieldnotes.az900.progress.v1'

export interface Az900Attempt {
  id: string
  kind: 'quiz' | 'mock'
  date: string
  correct: number
  total: number
  percentage: number
  sectionIds: string[]
}

export interface Az900Progress {
  version: 1
  completedLessonIds: string[]
  bookmarkedLessonIds: string[]
  resume: { sectionId: string; lessonId: string } | null
  attempts: Az900Attempt[]
}

export const emptyAz900Progress = (): Az900Progress => ({
  version: 1,
  completedLessonIds: [],
  bookmarkedLessonIds: [],
  resume: null,
  attempts: [],
})

export function parseAz900Progress(raw: string | null): Az900Progress {
  if (!raw) return emptyAz900Progress()
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return emptyAz900Progress()
    const data = value as Record<string, unknown>
    if (data.version !== 1 || !Array.isArray(data.completedLessonIds) || !Array.isArray(data.bookmarkedLessonIds) || !Array.isArray(data.attempts)) return emptyAz900Progress()
    const resume = data.resume && typeof data.resume === 'object' ? data.resume as Record<string, unknown> : null
    return {
      version: 1,
      completedLessonIds: data.completedLessonIds.filter((id): id is string => typeof id === 'string'),
      bookmarkedLessonIds: data.bookmarkedLessonIds.filter((id): id is string => typeof id === 'string'),
      resume: resume && typeof resume.sectionId === 'string' && typeof resume.lessonId === 'string' ? { sectionId: resume.sectionId, lessonId: resume.lessonId } : null,
      attempts: data.attempts.filter(isAttempt).slice(-50),
    }
  } catch {
    return emptyAz900Progress()
  }
}

function isAttempt(value: unknown): value is Az900Attempt {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && (item.kind === 'quiz' || item.kind === 'mock') && typeof item.date === 'string'
    && typeof item.correct === 'number' && typeof item.total === 'number' && typeof item.percentage === 'number'
    && Array.isArray(item.sectionIds) && item.sectionIds.every((id) => typeof id === 'string')
}

export function readAz900Progress(): Az900Progress {
  try { return parseAz900Progress(window.localStorage.getItem(AZ900_PROGRESS_KEY)) } catch { return emptyAz900Progress() }
}

export function writeAz900Progress(progress: Az900Progress): void {
  try { window.localStorage.setItem(AZ900_PROGRESS_KEY, JSON.stringify(progress)) } catch { /* Storage can be unavailable in private or restricted browser contexts. */ }
}

export function evaluateAz900Answers(questions: Az900PracticeQuestion[], answers: Record<string, number>) {
  const correct = questions.filter((question) => answers[question.id] === question.answer).length
  const skipped = questions.filter((question) => answers[question.id] === undefined).length
  return { correct, incorrect: questions.length - correct - skipped, skipped, total: questions.length, percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0 }
}

export function pickAz900Questions(questions: Az900PracticeQuestion[], count: number, random = Math.random): Az900PracticeQuestion[] {
  const shuffled = [...questions]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)))
}

export function formatRemainingTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`
}

export function nextExamSecond(seconds: number): number {
  return Math.max(0, Math.floor(seconds) - 1)
}
