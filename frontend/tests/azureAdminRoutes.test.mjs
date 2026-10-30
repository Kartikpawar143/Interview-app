import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const page = await readFile(new URL('../src/pages/AzureAdministrationPage.tsx', import.meta.url), 'utf8')
const layout = await readFile(new URL('../src/components/azure/AzureAdministrationLayout.tsx', import.meta.url), 'utf8')
const topNav = await readFile(new URL('../src/components/azure/AzureTopNavigation.tsx', import.meta.url), 'utf8')
const content = await readFile(new URL('../src/pages/AzureAdministrationPage.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

test('Azure administration has distinct dashboard, library, detail, and scenario routes', () => {
  for (const route of ["pathname === '/azure'", "pathname === '/azure/questions'", "pathname === '/azure/scenarios'"]) assert.ok(app.includes(route))
  assert.ok(app.includes('azureTopicMatch'))
  assert.ok(app.includes('azureAdminQuestionMatch'))
  assert.ok(app.includes('azureScenarioMatch'))
  assert.ok(app.includes("pathname === '/azure/az-900'"))
  assert.ok(app.includes("pathname === '/azure/visual-learning'"))
})

test('Azure page exposes filters, requested question detail fields, and interactive scenario diagnostics', () => {
  for (const field of ['short_answer', 'detailed_explanation', 'real_world_example', 'services', 'troubleshooting_steps', 'common_mistakes', 'cost_considerations', 'follow_up_questions']) assert.ok(page.includes(field))
  for (const feature of ['Search Azure interview questions', 'All topics', 'All levels', 'Expected observation', 'Safe remediation', 'AZ-900 Certification Preparation']) assert.ok(page.includes(feature))
  for (const feature of ['Reveal expected observation', 'Reveal root-cause reasoning', 'Complete lab', 'Reset / retry', 'LAB PROGRESS', 'localStorage.setItem']) assert.ok(page.includes(feature))
})

test('Azure shell reuses Linux shell classes and styling remains scoped', () => {
  for (const shared of ['learn-app', 'learn-header', 'learn-frame', 'learn-sidebar', 'learn-main']) assert.ok(layout.includes(shared))
  assert.ok(styles.includes('.azure-admin-cert-banner'))
  assert.ok(styles.slice(styles.indexOf('/* Azure administration only.')).includes('.azure-admin-content'))
})

test('Azure sidebar wraps topic titles in a numbered grid and keeps its own scrolling drawer', () => {
  assert.ok(layout.includes('azure-admin-sidebar'))
  assert.ok(topNav.includes('azure-admin-top-nav'))
  assert.ok(layout.indexOf('<AzureTopNavigation') > layout.indexOf('</aside><main'))
  for (const item of ["path: '/azure'", "path: '/azure/questions'", "path: '/azure/visual-learning'", "path: '/azure/scenarios'", "path: '/azure/az-900'"]) assert.ok(topNav.includes(item))
  assert.ok(page.includes("view === 'questions' || view === 'question' ? 'questions'"))
  assert.ok(page.includes("view === 'scenarios' || view === 'scenario' ? 'scenarios'"))
  for (const rule of [
    '.learn-sidebar.azure-admin-sidebar{display:grid',
    'grid-template-rows:minmax(0,1fr)',
    'grid-template-columns:20px minmax(0,1fr)',
    'overflow-y:auto;overflow-x:hidden',
    'height:calc(100dvh - 64px)',
    'max-height:calc(100dvh - 58px)',
    '@media(max-width:960px)',
    '@media(max-width:700px)',
    '@media(max-width:420px)',
  ]) assert.ok(styles.includes(rule), `Missing Azure sidebar layout rule: ${rule}`)
  assert.ok(content.includes('item.topic_id === activeTopic.id'))
  assert.ok(content.includes('questions.filter((q) => q.topic_id === item.id).length'))
})
