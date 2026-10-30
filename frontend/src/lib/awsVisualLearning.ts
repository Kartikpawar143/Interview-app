import type { AwsQuestion, AwsVisualDiagram, AwsVisualEdge, AwsVisualNode } from '../types/aws'

export interface AwsVisualQuizQuestion {
  id: string
  slug: string
  nodeId: string
  topicId: string
  prompt: string
  choices: string[]
  correctIndex: number
  explanation: string
}

export interface AwsVisualNodeConnection {
  edge: AwsVisualEdge
  nodeId: string
  direction: 'incoming' | 'outgoing'
}

const SECURITY_TERMS = /security|secure|permission|policy|credential|access|encrypt|public|private|ingress|egress|trust|role|secret|auth|identity|network/i

export interface AwsDiagramLabelLayout { x: number; y: number; lines: string[]; width: number; height: number }

export function wrapAwsNodeLabel(value: string, maxLength = 16): string[] {
  const result: string[] = []
  let line = ''
  for (const word of value.split(/\s+/)) {
    if (word.length > maxLength) {
      if (line) { result.push(line); line = '' }
      for (let index = 0; index < word.length; index += maxLength) result.push(word.slice(index, index + maxLength))
      continue
    }
    const next = line ? `${line} ${word}` : word
    if (line && next.length > maxLength) { result.push(line); line = word } else line = next
  }
  if (line) result.push(line)
  return result
}

/** Shared SVG label layout for both AWS diagram renderers. Uses conservative text metrics
 * and tries nearby offsets so labels do not sit on top of architecture nodes or one another. */
export function layoutAwsEdgeLabels(diagram: AwsVisualDiagram, nodeWidth = 166, nodeHeight = 82): AwsDiagramLabelLayout[] {
  const occupied = diagram.nodes.map((node) => ({ x: node.x, y: node.y, width: nodeWidth, height: nodeHeight }))
  const result: AwsDiagramLabelLayout[] = []
  const intersects = (a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}) =>
    a.x < b.x + b.width + 5 && a.x + a.width + 5 > b.x && a.y < b.y + b.height + 4 && a.y + a.height + 4 > b.y
  for (const edge of diagram.edges) {
    const from = diagram.nodes.find((node) => node.id === edge.source)
    const to = diagram.nodes.find((node) => node.id === edge.target)
    if (!from || !to) { result.push({ x: 0, y: 0, lines: [edge.label], width: 0, height: 0 }); continue }
    const sx = from.x + nodeWidth / 2, sy = from.y + nodeHeight / 2
    const tx = to.x + nodeWidth / 2, ty = to.y + nodeHeight / 2
    const dx = tx - sx, dy = ty - sy, length = Math.hypot(dx, dy) || 1
    const nx = -dy / length, ny = dx / length
    const words = edge.label.split(/\s+/), lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (line && next.length > 24) { lines.push(line); line = word } else line = next
    }
    if (line) lines.push(line)
    const labelLines = lines.flatMap((part) => part.length > 27 ? part.match(/.{1,24}/g) ?? [part] : [part])
    const width = Math.min(210, Math.max(44, Math.max(...labelLines.map((part) => part.length)) * 5.1 + 12))
    const height = labelLines.length * 12 + 8
    const candidates = [0, 1, -1, 2, -2, 3, -3].map((offset) => ({
      x: (sx + tx) / 2 + nx * offset * 22 - width / 2,
      y: (sy + ty) / 2 + ny * offset * 22 - height / 2,
      width, height,
    }))
    const safe = candidates.find((box) => box.x >= 2 && box.y >= 2 && box.x + width <= diagram.width - 2 && box.y + height <= diagram.height - 2 && !occupied.some((other) => intersects(box, other)))
      ?? candidates.find((box) => !occupied.some((other) => intersects(box, other))) ?? candidates[0]
    occupied.push(safe)
    result.push({ ...safe, x: safe.x + width / 2, y: safe.y + height / 2, lines: labelLines })
  }
  return result
}

export function getAwsNodeConnections(diagram: AwsVisualDiagram, nodeId: string): AwsVisualNodeConnection[] {
  return diagram.edges.reduce<AwsVisualNodeConnection[]>((connections, edge) => {
    if (edge.source === nodeId) connections.push({ edge, nodeId: edge.target, direction: 'outgoing' })
    if (edge.target === nodeId) connections.push({ edge, nodeId: edge.source, direction: 'incoming' })
    return connections
  }, [])
}

export function getAwsNodeLearningNotes(node: AwsVisualNode, related: AwsQuestion[], allQuestions: AwsQuestion[]) {
  const topicQuestions = allQuestions.filter((question) => question.topic_id === node.topic_id)
  const commonMistakes = [...new Set(related.flatMap((question) => question.common_mistakes))].slice(0, 4)
  const securityConsiderations = [...new Set([...related, ...topicQuestions]
    .flatMap((question) => [question.detailed_explanation, ...question.common_mistakes])
    .filter((note) => SECURITY_TERMS.test(note)))].slice(0, 3)
  return { commonMistakes, securityConsiderations }
}

export function buildAwsVisualQuiz(diagram: AwsVisualDiagram, questions: AwsQuestion[], limit = 3): AwsVisualQuizQuestion[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  const ids = [...new Set(diagram.nodes.flatMap((node) => node.question_ids))]
  return ids.flatMap((id) => {
    const question = byId.get(id)
    if (!question) return []
    const candidateAnswers = questions
      .filter((candidate) => candidate.id !== question.id && candidate.topic_id === question.topic_id)
      .map((candidate) => candidate.short_answer.trim())
    const allAnswers = questions.filter((candidate) => candidate.id !== question.id).map((candidate) => candidate.short_answer.trim())
    const distractors = [...new Set([...candidateAnswers, ...allAnswers])]
      .filter((answer) => answer && answer.toLocaleLowerCase() !== question.short_answer.trim().toLocaleLowerCase())
      .slice(0, 3)
    if (distractors.length < 3) return []
    const choices = Array<string>(4)
    const correctIndex = [...question.id].reduce((value, character) => value + character.charCodeAt(0), 0) % choices.length
    choices[correctIndex] = question.short_answer
    let distractorIndex = 0
    for (let index = 0; index < choices.length; index += 1) {
      if (index !== correctIndex) choices[index] = distractors[distractorIndex++]
    }
    const nodeId = diagram.nodes.find((node) => node.question_ids.includes(question.id))?.id ?? diagram.nodes[0].id
    return [{
      id: question.id,
      slug: question.slug,
      nodeId,
      topicId: question.topic_id,
      prompt: question.question,
      choices,
      correctIndex,
      explanation: question.detailed_explanation,
    }]
  }).slice(0, limit)
}

export function scoreAwsVisualQuiz(quiz: AwsVisualQuizQuestion[], answers: Record<string, number>): number {
  return quiz.reduce((score, question) => score + (answers[question.id] === question.correctIndex ? 1 : 0), 0)
}

export function getWalkthroughEdgeIds(diagram: AwsVisualDiagram, step: number): string[] {
  if (step < 2 || step > diagram.sequence.length) return []
  const source = diagram.sequence[step - 2]
  const target = diagram.sequence[step - 1]
  return diagram.edges
    .filter((edge) => edge.source === source && edge.target === target)
    .map((edge) => edge.id)
}

export function clampWalkthroughStep(step: number, sequenceLength: number): number {
  return Math.max(0, Math.min(sequenceLength, Math.trunc(step)))
}

export function walkthroughCaption(diagram: AwsVisualDiagram, step: number): string {
  if (step < 1 || step > diagram.sequence.length) return 'Ready. Start the walkthrough or explore a component.'
  if (step === 1) {
    const node = diagram.nodes.find((item) => item.id === diagram.sequence[0])
    return node ? `Start at ${node.label}. ${node.description}` : 'Start at the first architecture component.'
  }
  const edgeId = getWalkthroughEdgeIds(diagram, step)[0]
  const edge = diagram.edges.find((item) => item.id === edgeId)
  return edge?.label ?? 'Continue to the next architecture step.'
}
