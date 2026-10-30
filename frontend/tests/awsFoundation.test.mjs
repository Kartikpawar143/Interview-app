import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const topics = JSON.parse(await readFile(new URL('../../backend/app/content/aws/topics.json', import.meta.url), 'utf8'))
const questions = JSON.parse(await readFile(new URL('../../backend/app/content/aws/questions.json', import.meta.url), 'utf8'))
const [app, home, department, page, layout, api, styles] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/DepartmentCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/AwsPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/aws/AwsLayout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
])

test('AWS catalog contains original, complete question content across all topics and levels', () => {
  assert.equal(topics.length, 14)
  assert.deepEqual(topics.map((item) => item.order), Array.from({ length: 14 }, (_, index) => index + 1))
  assert.equal(new Set(topics.map((item) => item.slug)).size, 14)
  assert.ok(topics.every((item) => item.name && item.description))
  assert.ok(questions.length >= 100)
  assert.equal(new Set(questions.map((item) => item.id)).size, questions.length)
  assert.equal(new Set(questions.map((item) => item.slug)).size, questions.length)
  assert.deepEqual([...new Set(questions.map((item) => item.difficulty))].sort(), ['advanced', 'beginner', 'intermediate'])
  for (const topic of topics) assert.equal(questions.filter((item) => item.topic_id === topic.id).length, 8)
  for (const item of questions) {
    for (const field of ['question', 'short_answer', 'detailed_explanation', 'real_world_example', 'cost_considerations']) assert.ok(item[field], `${item.id} missing ${field}`)
    for (const field of ['services', 'troubleshooting_steps', 'common_mistakes', 'interview_tips', 'follow_up_questions', 'related_question_ids', 'documentation_links']) assert.ok(item[field].length, `${item.id} missing ${field}`)
    assert.ok(item.related_question_ids.every((id) => questions.some((other) => other.id === id && id !== item.id)))
    assert.ok(item.documentation_links.every((link) => link.startsWith('https://docs.aws.amazon.com/') || link.startsWith('https://aws.amazon.com/') || link.startsWith('https://developer.hashicorp.com/') || link === 'https://calculator.aws/'))
  }
})

test('AWS overview, topic, question library, and detail routes are wired independently', () => {
  for (const route of ["pathname === '/aws'", "pathname === '/aws/questions'", 'awsTopicMatch', 'awsQuestionMatch']) assert.ok(app.includes(route))
  for (const path of ['/aws', '/aws/questions', '/aws/topics/']) assert.ok(page.includes(path))
  assert.ok(page.includes('questions.filter((item) => item.topic_id === id).length'))
  assert.ok(page.includes('No questions in this topic yet'))
  assert.ok(page.includes('question.interview_tips.map'))
  assert.ok(page.includes('question.documentation_links.map'))
  assert.ok(page.includes('question.related_question_ids.map'))
  assert.ok(page.includes('item.detailed_explanation'))
})

test('AWS homepage card and navigation use available metadata and shared responsive shell', () => {
  assert.ok(home.includes('AWS architecture &amp; operations'))
  assert.ok(home.includes('href="/aws"'))
  assert.ok(department.includes("department.id === 'aws' ? '/aws'"))
  assert.ok(layout.includes('aria-label="AWS contextual navigation"'))
  assert.ok(layout.includes('className="aws-top-nav"'))
  assert.ok(layout.indexOf('<nav className="aws-top-nav"') > layout.indexOf('</aside>'))
  for (const path of ["go('/aws')", "go('/aws/visual-learning')", "go('/aws/troubleshooting')", "go('/aws/questions')"]) assert.ok(layout.includes(path))
  assert.ok(layout.includes('aria-expanded={menuOpen}'))
  assert.ok(styles.includes('.learn-sidebar.aws-sidebar'))
  assert.ok(styles.includes('@media(max-width:700px)'))
})

test('AWS API client exposes topic, question-list filter, and detail calls', () => {
  assert.ok(api.includes("'/api/aws/topics'"))
  assert.ok(api.includes('/api/aws/questions${queryString(filters)}'))
  assert.ok(api.includes('`/api/aws/questions/${encodeURIComponent(slug)}`'))
})
