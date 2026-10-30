import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/linuxSimulator.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { LinuxSimulator } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('supports the requested safe read and write commands', () => {
  const sim = new LinuxSimulator()
  for (const command of ['pwd', 'ls', 'cd /var/log', 'cat app.log', 'mkdir /tmp/lab', 'touch /tmp/lab/a.txt', 'grep ERROR /var/log/app.log', 'find /tmp', 'whoami', 'date', 'uname -a', 'df -h', 'free -h', 'ps aux']) {
    const result = sim.execute(command)
    assert.ok(result.output.length > 0, `${command} should return output`)
    assert.equal(result.cwd.startsWith('/'), true)
  }
  assert.equal(sim.snapshot().directories.includes('/tmp/lab'), true)
  assert.equal(sim.snapshot().files['/tmp/lab/a.txt'], '')
})

test('reports useful errors for unknown commands and missing paths', () => {
  const sim = new LinuxSimulator()
  assert.match(sim.execute('sudo rm -rf /').output, /operators|command not found|Only one/)
  assert.match(sim.execute('cat /not-a-file').output, /No such file/)
  assert.match(sim.execute('cd /not-a-directory').output, /No such directory/)
})

test('blocks shell operators and keeps traversal inside the virtual root', () => {
  const sim = new LinuxSimulator()
  assert.match(sim.execute('cat /etc/hostname; touch /tmp/pwned').output, /operators/)
  assert.equal(sim.execute('cat ../../../../etc/hostname').output, 'fieldnotes-lab\n')
  assert.equal(sim.execute('touch ../../../../tmp/still-virtual').output, '(no output)')
  assert.equal(sim.snapshot().files['/tmp/still-virtual'], '')
  assert.equal(sim.snapshot().files['/tmp/pwned'], undefined)
  assert.equal(sim.snapshot().files['/etc/passwd'], undefined)
})

test('simulator has no host process, environment, filesystem, or network access', async () => {
  assert.doesNotMatch(source, /child_process|subprocess|process\.env|os\.system|execSync|spawn\(|fetch\(|node:fs|from ['"]fs/)
})

test('records command history and reset restores the virtual filesystem', () => {
  const sim = new LinuxSimulator()
  sim.execute('mkdir /tmp/test')
  sim.execute('whoami')
  assert.deepEqual(sim.history, ['mkdir /tmp/test', 'whoami'])
  sim.reset()
  assert.deepEqual(sim.history, [])
  assert.equal(sim.snapshot().directories.includes('/tmp/test'), false)
})

test('Copilot panel supports close/escape and a narrow mobile layout', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../src/components/linux/LinuxCopilot.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ])
  assert.match(component, /aria-label="Close Linux Copilot"/)
  assert.match(component, /event\.key === 'Escape'/)
  assert.match(component, /aria-expanded=\{open\}/)
  assert.match(css, /@media\(max-width:600px\)\{\.copilot-launcher/)
  assert.match(css, /\.copilot-panel\.is-expanded/)
})

test('visual learning data covers all twelve diagrams and reuses current questions and topics', async () => {
  const diagramsSource = await readFile(new URL('../src/data/linuxDiagrams.ts', import.meta.url), 'utf8')
  const compiledDiagrams = ts.transpileModule(diagramsSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
  const { linuxDiagrams, scoreDiagramQuiz } = await import(`data:text/javascript;base64,${Buffer.from(compiledDiagrams).toString('base64')}`)
  const questions = JSON.parse(readFileSync(new URL('../../backend/app/content/linux/questions.json', import.meta.url), 'utf8'))
  const topics = JSON.parse(readFileSync(new URL('../../backend/app/content/linux/topics.json', import.meta.url), 'utf8'))
  assert.deepEqual(linuxDiagrams.map((diagram) => diagram.id), ['architecture','boot','filesystem','process','network','permissions','storage','ssh','firewall','dns','web-server','monitoring'])
  assert.equal(linuxDiagrams.every((diagram) => diagram.quiz.length >= 2 && diagram.nodes.length >= 3), true)
  assert.equal(linuxDiagrams.every((diagram) => topics.some((topic) => topic.id === diagram.topicId)), true)
  assert.equal(linuxDiagrams.every((diagram) => diagram.nodes.every((node) => questions.some((question) => question.slug === node.questionSlug))), true)
  assert.equal(linuxDiagrams.every((diagram) => diagram.edges.every(([from, to]) => diagram.nodes.some((node) => node.id === from) && diagram.nodes.some((node) => node.id === to))), true)
  assert.equal(linuxDiagrams.every((diagram) => diagram.sequence.every((id) => diagram.nodes.some((node) => node.id === id))), true)
  assert.deepEqual(linuxDiagrams.slice(6, 11).map((diagram) => diagram.id), ['storage','ssh','firewall','dns','web-server'])
  const firstQuiz = linuxDiagrams[0].quiz
  assert.equal(scoreDiagramQuiz('architecture', firstQuiz, { 'architecture:0': firstQuiz[0].correct, 'architecture:1': 0 }), 1)
  assert.equal(scoreDiagramQuiz('architecture', firstQuiz, {}), 0)
})

test('visual route exposes keyboard interaction, sequence controls, quiz feedback, and reduced-motion handling', async () => {
  const [app, page, layout, css] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/LinuxVisualLearningPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/linux/LinuxLayout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ])
  assert.match(app, /pathname === '\/linux\/visual-learning'/)
  assert.match(page, /event\.key === 'Enter' \|\| event\.key === ' '/)
  assert.match(page, /aria-pressed=/)
  assert.match(page, /timelineRef\.current\?\.restart\(\)/)
  assert.match(page, /Correct\./)
  assert.match(page, /prefers-reduced-motion: reduce/)
  assert.match(page, /Previous sequence step/)
  assert.match(page, /Next sequence step/)
  assert.match(layout, /linux-diagram-nav/)
  assert.match(layout, /onSelectDiagram/)
  assert.doesNotMatch(page, /visual-diagram-tabs/)
  assert.match(css, /@media\(max-width:700px\)\{\.visual-page-heading/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.visual-diagram-tabs/)
})

test('Anime fallback timeline supports play, pause, replay, and reset controls', async () => {
  const fallbackSource = await readFile(new URL('../src/lib/animeFallback.ts', import.meta.url), 'utf8')
  const compiledFallback = ts.transpileModule(fallbackSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
  const { createTimeline } = await import(`data:text/javascript;base64,${Buffer.from(compiledFallback).toString('base64')}`)
  globalThis.window = globalThis
  let calls = 0
  const timeline = createTimeline({ autoplay: false })
  timeline.add([], { duration: 1 }, 0).call(() => { calls += 1 }, 0)
  timeline.play(); timeline.pause(); timeline.restart()
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(calls, 1)
  timeline.reset()
  assert.equal(typeof timeline.play, 'function')
})
