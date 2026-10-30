import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../../', import.meta.url)
const diagrams = JSON.parse(await readFile(new URL('backend/app/content/aws/visual_diagrams.json', root), 'utf8'))
const questions = JSON.parse(await readFile(new URL('backend/app/content/aws/questions.json', root), 'utf8'))
const source = await readFile(new URL('../src/lib/awsVisualLearning.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const helpers = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('all 12 AWS diagrams have valid graph links and linked interview questions', () => {
  assert.equal(diagrams.length, 12)
  const ids = new Set(questions.map((question) => question.id))
  for (const diagram of diagrams) {
    const nodes = new Set(diagram.nodes.map((node) => node.id))
    assert.ok(diagram.nodes.length >= 5)
    assert.ok(diagram.edges.length >= 4)
    for (const edge of diagram.edges) {
      assert.ok(nodes.has(edge.source) && nodes.has(edge.target), `${diagram.id}:${edge.id} endpoint`)
      assert.ok(edge.label.trim())
    }
    for (const node of diagram.nodes) assert.ok(node.question_ids.every((id) => ids.has(id)))
  }
})

test('node connections identify true incoming and outgoing edges', () => {
  const diagram = diagrams.find((item) => item.id === 'vpc-networking')
  const client = helpers.getAwsNodeConnections(diagram, 'client')
  assert.ok(client.some((entry) => entry.direction === 'outgoing'))
  assert.ok(client.every((entry) => entry.edge.source === 'client' || entry.edge.target === 'client'))
  const target = client[0]
  assert.ok(helpers.getAwsNodeConnections(diagram, target.nodeId).some((entry) => entry.edge.id === target.edge.id && entry.direction === 'incoming'))
})

test('walkthrough transitions follow connected directed graph edges', () => {
  const ids = ['vpc-networking', 'iam-authorization', 'cicd-pipeline', 'backup-disaster-recovery']
  for (const id of ids) {
    const diagram = diagrams.find((item) => item.id === id)
    for (let step = 2; step <= diagram.sequence.length; step += 1) assert.ok(helpers.getWalkthroughEdgeIds(diagram, step).length, `${id} step ${step}`)
    assert.equal(helpers.clampWalkthroughStep(-1, diagram.sequence.length), 0)
    assert.equal(helpers.clampWalkthroughStep(999, diagram.sequence.length), diagram.sequence.length)
  }
})

test('quiz reuses bank questions, scores once per answer, and restart clears score', () => {
  const diagram = diagrams[0]
  const quiz = helpers.buildAwsVisualQuiz(diagram, questions)
  assert.ok(quiz.length > 0)
  assert.ok(quiz.every((item) => questions.some((question) => question.id === item.id)))
  const answers = Object.fromEntries(quiz.map((item) => [item.id, item.correctIndex]))
  assert.equal(helpers.scoreAwsVisualQuiz(quiz, answers), quiz.length)
  assert.equal(helpers.scoreAwsVisualQuiz(quiz, {}), 0)
  assert.ok(quiz.every((item) => item.choices.length === 4 && item.explanation))
})

test('AWS page exposes keyboard nodes, walkthrough controls, quiz feedback, and responsive reduced motion styles', async () => {
  const page = await readFile(new URL('../src/pages/AwsVisualLearningPage.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const sidebar = await readFile(new URL('../src/components/aws/AwsLayout.tsx', import.meta.url), 'utf8')
  assert.ok(app.includes("pathname === '/aws/visual-learning'"))
  assert.ok(app.includes("get('diagram')"))
  assert.ok(app.includes("window.addEventListener('popstate'"))
  assert.ok(sidebar.includes('VISUAL DIAGRAMS'))
  assert.ok(sidebar.includes('diagrams.map'))
  assert.ok(sidebar.includes('/aws/visual-learning?diagram='))
  assert.ok(sidebar.includes('activeDiagramId === diagram.id'))
  assert.ok(!page.includes('Choose a diagram'))
  assert.ok(!page.includes('awsvisual-selector'))
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', "event.key === 'Enter'"]) assert.ok(page.includes(key))
  for (const control of ['Previous sequence step', 'Next sequence step', 'Pause sequence', 'Replay sequence', 'Reset sequence', 'Show static diagram']) assert.ok(page.includes(control))
  for (const section of ['Connections', 'Common mistakes', 'Security considerations', 'Architecture knowledge check', 'Restart quiz']) assert.ok(page.includes(section))
  for (const section of ['WHAT IS IT?', 'WHY IS IT NEEDED?', 'HOW DOES IT WORK?', 'REAL-WORLD EXAMPLE', 'RELATED INTERVIEW QUESTIONS']) assert.ok(page.includes(section))
  assert.ok(!page.includes('awsvisual-mode-tabs'))
  assert.ok(!page.includes('learningMode'))
  for (const feature of ['awsvisual-practice-list', 'awsvisual-quiz-progress', 'awsvisual-quiz-review']) assert.ok(page.includes(feature))
  assert.ok(page.includes('requestedDiagramId') && page.includes('diagrams[0].id'))
  assert.ok(page.includes('node.question_ids.flatMap'))
  assert.ok(page.includes('prefers-reduced-motion: reduce'))
  assert.ok(styles.includes('@media(max-width:700px)'))
  assert.ok(styles.includes('.awsvisual-practice-list'))
  assert.ok(styles.includes('.awsvisual-category-filters'))
  assert.ok(styles.includes('@media(prefers-reduced-motion:reduce)'))
})
