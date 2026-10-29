import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../../', import.meta.url)
const labs = JSON.parse(await readFile(new URL('backend/app/content/aws/troubleshooting_labs.json', root), 'utf8'))
const questions = JSON.parse(await readFile(new URL('backend/app/content/aws/questions.json', root), 'utf8'))
const topics = JSON.parse(await readFile(new URL('backend/app/content/aws/topics.json', root), 'utf8'))
const diagrams = JSON.parse(await readFile(new URL('backend/app/content/aws/visual_diagrams.json', root), 'utf8'))
const source = await readFile(new URL('../src/lib/awsTroubleshooting.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const helpers = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('all 12 simulated labs have complete, linked evidence and diagnostic paths', () => {
  assert.equal(labs.length, 12)
  assert.deepEqual(labs.map((lab) => lab.title), [
    'EC2 SSH connection failures', 'Security groups and network ACLs', 'Private subnet connectivity failures',
    'IAM AccessDenied errors', 'S3 bucket access failures', 'ALB errors and unhealthy targets',
    'Route 53 DNS failures', 'Lambda errors and timeouts', 'ECS task startup failures',
    'CloudWatch alarms and missing logs', 'RDS connectivity issues', 'Unexpected AWS costs',
  ])
  const ids = new Set()
  const slugs = new Set()
  for (const lab of labs) {
    assert.ok(!ids.has(lab.id) && !slugs.has(lab.slug))
    ids.add(lab.id); slugs.add(lab.slug)
    assert.ok(topics.some((topic) => topic.id === lab.topic_id))
    assert.ok(lab.related_question_ids.every((id) => questions.some((question) => question.id === id)))
    const diagram = diagrams.find((item) => item.id === lab.diagram_id)
    assert.ok(diagram)
    assert.ok(lab.node_ids.every((id) => diagram.nodes.some((node) => node.id === id)))
    const evidence = new Set(lab.evidence.map((item) => item.id))
    assert.ok(lab.evidence.every((item) => item.content && diagram.nodes.some((node) => node.id === item.node_id)))
    assert.ok(lab.diagnostic_steps.length >= 3)
    for (const step of lab.diagnostic_steps) {
      assert.ok(step.hint && step.evidence_ids.every((id) => evidence.has(id)))
      assert.equal(step.options.filter((option) => option.correct).length, 1)
    }
    assert.equal(lab.root_cause_options.filter((option) => option.id === lab.root_cause_id && option.correct).length, 1)
    for (const field of ['symptoms', 'root_cause_explanation', 'remediation', 'verification', 'interview_takeaways']) assert.ok(lab[field]?.length)
  }
})

test('score penalties and retry baseline behave deterministically', () => {
  const lab = labs[0]
  const step = lab.diagnostic_steps[0]
  const answers = Object.fromEntries(lab.diagnostic_steps.map((item) => [item.id, item.options.find((option) => option.correct).id]))
  const perfect = helpers.scoreLabAttempt(lab, answers, {}, true, 0, 0)
  assert.equal(perfect, lab.diagnostic_steps.length * 10 + 20)
  assert.equal(helpers.scoreLabAttempt(lab, {}, {}, false, 0, 0), 0)
  assert.equal(helpers.scoreLabAttempt(lab, answers, { [step.id]: 1 }, true, 1, 1), perfect - 8)
  assert.equal(helpers.scoreLabAttempt(lab, {}, {}, false, 100, 100), 0)
})

test('troubleshooting routes, AWS navigation, simulation labels, and interactions are wired', async () => {
  const [app, page, layout, overview, api, styles] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AwsTroubleshootingPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/aws/AwsLayout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AwsPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ])
  assert.ok(app.includes("pathname === '/aws/troubleshooting'"))
  assert.ok(app.includes("/^\\/aws\\/troubleshooting\\/([^/]+)$/"))
  assert.ok(page.includes('SIMULATED INCIDENT RESOLVED'))
  assert.ok(page.includes('No AWS command or cloud operation is executed'))
  assert.ok(page.includes('You can choose an action now or inspect the evidence first.'))
  assert.ok(!page.includes('disabled={!evidenceReady'))
  for (const interaction of ['INSPECT EVIDENCE', 'Show progressive hint', 'Reset / retry', 'Safe remediation', 'Verification plan', 'Interview takeaways', 'localStorage']) assert.ok(page.includes(interaction))
  assert.ok(page.includes('role="button"') && page.includes("event.key === 'Enter' || event.key === ' '"))
  assert.ok(layout.includes("activeItem?: 'overview' | 'questions' | 'visual' | 'troubleshooting'"))
  assert.ok(layout.includes("go('/aws/troubleshooting')"))
  assert.ok(overview.includes("navigate('/aws/troubleshooting')"))
  assert.ok(api.includes("'/api/aws/troubleshooting/labs'"))
  assert.ok(styles.includes('@media(max-width:760px)'))
  assert.ok(styles.includes('.aws-lab-node:focus-visible'))
  assert.ok(styles.includes('@media(prefers-reduced-motion:reduce)'))
})
