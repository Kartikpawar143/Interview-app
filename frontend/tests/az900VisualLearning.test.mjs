import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const jsonUrl = new URL('../../backend/app/content/azure/az900_visual_diagrams.json', import.meta.url)
const courseUrl = new URL('../../backend/app/content/azure/az900_course.json', import.meta.url)
const questionsUrl = new URL('../../backend/app/content/azure/az900_questions.json', import.meta.url)
const diagrams = JSON.parse(await readFile(jsonUrl, 'utf8'))
const course = JSON.parse(await readFile(courseUrl, 'utf8'))
const questions = JSON.parse(await readFile(questionsUrl, 'utf8'))
const helperSource = await readFile(new URL('../src/lib/azureVisualLearning.ts', import.meta.url), 'utf8')
const helperCompiled = ts.transpileModule(helperSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const helpers = await import(`data:text/javascript;base64,${Buffer.from(helperCompiled).toString('base64')}`)

test('ten AZ-900 diagrams have meaningful nodes and references to existing lessons and questions', () => {
  assert.equal(diagrams.length, 10)
  assert.equal(diagrams.reduce((total, diagram) => total + diagram.nodes.length, 0), 56)
  const questionIds = new Set(questions.map((question) => question.id))
  const sectionIds = new Set(course.sections.map((section) => section.id))
  for (const diagram of diagrams) {
    assert.ok(diagram.nodes.length >= 5)
    assert.ok(diagram.groups.length >= 2)
    assert.ok(diagram.edges.some(([source]) => diagram.edges.filter(([candidate]) => candidate === source).length > 1))
    assert.ok(diagram.quiz_question_ids.length >= 2)
    assert.ok(diagram.quiz_question_ids.every((id) => questionIds.has(id)))
    for (const node of diagram.nodes) {
      assert.ok(node.description && node.purpose && node.example && node.services.length)
      assert.ok(sectionIds.has(node.section_id))
      assert.ok(node.question_ids.every((id) => questionIds.has(id)))
    }
  }
})

test('the four required Azure workflows have animated sequences', () => {
  const byId = Object.fromEntries(diagrams.map((diagram) => [diagram.id, diagram]))
  assert.deepEqual(byId['resource-hierarchy'].sequence, ['management-group', 'subscription', 'resource-group', 'resource'])
  for (const id of ['azure-networking', 'identity-access', 'monitoring-observability']) assert.ok(byId[id].sequence.length >= 4)
})

test('diagram node references and quizzes reuse the AZ-900 question bank', () => {
  const diagram = diagrams.find((item) => item.id === 'global-infrastructure')
  const quiz = helpers.getDiagramQuestions(diagram, questions)
  const nodeQuestions = helpers.getNodeQuestions(diagram, diagram.nodes[0].id, questions)
  assert.deepEqual(quiz.map((question) => question.id), diagram.quiz_question_ids)
  assert.deepEqual(nodeQuestions.map((question) => question.id), diagram.nodes[0].question_ids)
  const answered = Object.fromEntries(quiz.map((question) => [`${diagram.id}:${question.id}`, question.answer]))
  assert.equal(helpers.scoreAz900VisualQuiz(diagram, questions, answered), quiz.length)
  assert.equal(helpers.scoreAz900VisualQuiz(diagram, questions, {}), 0)
})

test('visual route provides keyboard node selection, sequence controls, reduced motion, and learning links', async () => {
  const [app, page, layout, home] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Az900VisualLearningPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/azure/AzureVisualLearningLayout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8'),
  ])
  assert.ok(app.includes("pathname === '/azure/az-900/visual-learning'"))
  assert.ok(page.includes("event.key === 'Enter' || event.key === ' '"))
  assert.ok(page.includes('aria-pressed='))
  for (const control of ['timelineRef.current?.play()', 'timelineRef.current?.pause()', 'timelineRef.current?.restart()', 'timelineRef.current?.reset()']) assert.ok(page.includes(control))
  assert.ok(page.includes("prefers-reduced-motion: reduce"))
  assert.ok(page.includes('/azure/topics/'))
  assert.ok(page.includes('/azure/az-900/${currentSection!.id}/${lesson.id}'))
  assert.ok(layout.includes('aria-expanded={menuOpen}'))
  assert.ok(home.includes('/azure/az-900/visual-learning'))
})

test('homepage presents Linux, AWS, Azure administration, and AZ-900 learning pathways', async () => {
  const home = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8')
  const department = await readFile(new URL('../src/components/DepartmentCard.tsx', import.meta.url), 'utf8')
  for (const link of ['href="/linux"', 'href="/aws"', 'href="/azure/az-900"', 'href="/azure/az-900/visual-learning"', 'href="/azure"']) assert.ok(home.includes(link))
  assert.ok(home.includes('Linux administration &amp; technical interviews'))
  assert.ok(home.includes('Microsoft Azure Fundamentals'))
  assert.ok(home.includes('Azure operations &amp; interviews'))
  assert.ok(department.includes("department.id === 'aws' ? '/aws'"))
  assert.ok(department.includes('COMING SOON'))
})
