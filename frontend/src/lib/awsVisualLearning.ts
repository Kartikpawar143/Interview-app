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
