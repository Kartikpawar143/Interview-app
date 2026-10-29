import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/azureProgress.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const progress = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const course = JSON.parse(await readFile(new URL('../../backend/app/content/azure/az900_course.json', import.meta.url), 'utf8'))
const questions = JSON.parse(await readFile(new URL('../../backend/app/content/azure/az900_questions.json', import.meta.url), 'utf8'))

test('course data provides navigable sections and lessons with the required learning notes', () => {
  assert.equal(course.sections.length, 20)
  assert.equal(course.sections.reduce((count, section) => count + section.lessons.length, 0), 40)
  assert.ok(course.sections.every((section) => section.objectives.length && section.terminology.length && section.revision_notes.length))
  assert.equal(course.sections[0].lessons[0].id, 'az900-introduction-lesson-1')
})

test('all 100 original practice questions have valid answers and explanations', () => {
  assert.equal(questions.length, 100)
  assert.ok(questions.every((item) => item.choices.length === 4 && item.answer >= 0 && item.answer < 4 && item.explanation && item.tags.length))
})

test('progress parsing safely resets malformed and outdated browser data', () => {
  assert.deepEqual(progress.parseAz900Progress('{broken'), progress.emptyAz900Progress())
  assert.deepEqual(progress.parseAz900Progress('{"version":0}'), progress.emptyAz900Progress())
})

test('progress parsing keeps valid completion, bookmark, resume, and quiz history fields', () => {
  const saved = { version: 1, completedLessonIds: ['lesson-a', 7], bookmarkedLessonIds: ['lesson-b'], resume: { sectionId: 'sec', lessonId: 'lesson-a' }, attempts: [{ id: 'a1', kind: 'quiz', date: '2026-10-29', correct: 4, total: 5, percentage: 80, sectionIds: ['sec'] }, { id: 'bad' }] }
  const parsed = progress.parseAz900Progress(JSON.stringify(saved))
  assert.deepEqual(parsed.completedLessonIds, ['lesson-a'])
  assert.deepEqual(parsed.bookmarkedLessonIds, ['lesson-b'])
  assert.deepEqual(parsed.resume, saved.resume)
  assert.equal(parsed.attempts.length, 1)
})

test('browser progress storage round-trips bookmarks and tolerates unavailable storage', () => {
  const values = new Map()
  globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
  const saved = { ...progress.emptyAz900Progress(), bookmarkedLessonIds: ['lesson-x'], completedLessonIds: ['lesson-y'] }
  progress.writeAz900Progress(saved)
  assert.deepEqual(progress.readAz900Progress().bookmarkedLessonIds, ['lesson-x'])
  globalThis.window.localStorage.setItem = () => { throw new Error('storage disabled') }
  assert.doesNotThrow(() => progress.writeAz900Progress(saved))
  globalThis.window.localStorage.getItem = () => { throw new Error('storage disabled') }
  assert.deepEqual(progress.readAz900Progress(), progress.emptyAz900Progress())
})

test('answer evaluation reports correct, incorrect, skipped, and percentage values', () => {
  const sample = questions.slice(0, 4)
  const result = progress.evaluateAz900Answers(sample, { [sample[0].id]: sample[0].answer, [sample[1].id]: (sample[1].answer + 1) % 4 })
  assert.deepEqual(result, { correct: 1, incorrect: 1, skipped: 2, total: 4, percentage: 25 })
})

test('question picker honors bounds and timer formatting handles expiry', () => {
  assert.equal(progress.pickAz900Questions(questions, 12, () => 0.5).length, 12)
  assert.equal(progress.pickAz900Questions(questions, 500).length, 100)
  assert.equal(progress.formatRemainingTime(3661), '61:01')
  assert.equal(progress.formatRemainingTime(-2), '00:00')
  assert.equal(progress.nextExamSecond(2), 1)
  assert.equal(progress.nextExamSecond(1), 0)
  assert.equal(progress.nextExamSecond(0), 0)
})

test('lesson navigation, knowledge check, submission confirmation, and review are exposed on the course route', async () => {
  const [app, page, azureLayout, linuxLayout] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Az900Page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/azure/AzureLayout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/linux/LinuxLayout.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(app, /az900Match = pathname\.match/)
  assert.match(app, /pathname === '\/azure\/az-900'/)
  assert.match(page, /Previous|PREVIOUS/)
  assert.match(page, /Knowledge check/)
  assert.match(page, /Submit exam/)
  assert.match(page, /role="dialog"/)
  assert.match(page, /Recommended revision/)
  assert.match(page, /navigate\('\/azure\/az-900\/visual-learning'\)/)
  assert.match(azureLayout, /navigate\('\/azure\/az-900\/visual-learning'\)/)
  assert.match(azureLayout, /az900-course-sidebar/)
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.ok(styles.includes('.learn-sidebar.az900-course-sidebar'))
  assert.ok(styles.includes('height:calc(100dvh - 64px)'))
  assert.ok(styles.includes('overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain'))
  for (const sharedClass of ['learn-app', 'learn-header', 'learn-frame', 'learn-sidebar', 'topic-nav']) {
    assert.ok(azureLayout.includes(sharedClass) && linuxLayout.includes(sharedClass), `${sharedClass} should be shared with the Linux learning layout`)
  }
})
