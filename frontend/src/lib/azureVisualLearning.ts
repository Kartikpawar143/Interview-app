import type { Az900PracticeQuestion, Az900VisualDiagram } from '../types/azure'

export function getDiagramQuestions(diagram: Az900VisualDiagram, questions: Az900PracticeQuestion[]): Az900PracticeQuestion[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  return diagram.quiz_question_ids.flatMap((id) => {
    const question = byId.get(id)
    return question ? [question] : []
  })
}

export function getNodeQuestions(diagram: Az900VisualDiagram, nodeId: string, questions: Az900PracticeQuestion[]): Az900PracticeQuestion[] {
  const node = diagram.nodes.find((item) => item.id === nodeId)
  if (!node) return []
  const byId = new Map(questions.map((question) => [question.id, question]))
  return node.question_ids.flatMap((id) => {
    const question = byId.get(id)
    return question ? [question] : []
  })
}

export function scoreAz900VisualQuiz(diagram: Az900VisualDiagram, questions: Az900PracticeQuestion[], answers: Record<string, number>): number {
  return getDiagramQuestions(diagram, questions).filter((question) => answers[`${diagram.id}:${question.id}`] === question.answer).length
}
