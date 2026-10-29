import type { AwsTroubleshootingLab } from '../types/aws'

export function scoreLabAttempt(lab: AwsTroubleshootingLab, answers: Record<string, string>, mistakes: Record<string, number>, rootCorrect: boolean, rootMistakes: number, hintsUsed: number): number {
  const correct = lab.diagnostic_steps.filter((step) => answers[step.id] === step.options.find((option) => option.correct)?.id).length
  const lostPoints = Object.values(mistakes).reduce((sum, count) => sum + count * 3, 0) + rootMistakes * 3 + hintsUsed * 2
  return Math.max(0, correct * 10 + (rootCorrect ? 20 : 0) - lostPoints)
}
