export type AzureAdminDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface AzureAdminTopic { id: string; slug: string; name: string; description: string; order: number }
export interface AzureAdminQuestion {
  id: string; slug: string; topic_id: string; topic: string; difficulty: AzureAdminDifficulty
  question: string; short_answer: string; detailed_explanation: string; real_world_example: string
  services: string[]; troubleshooting_steps: string[]; common_mistakes: string[]
  cost_considerations: string; follow_up_questions: string[]
}
export interface AzureScenarioCheck { step: string; check: string; expected_observation: string }
export interface AzureAdminScenario {
  id: string; slug: string; title: string; topic_id: string; difficulty: AzureAdminDifficulty
  symptoms: string[]; diagnostic_steps: AzureScenarioCheck[]; root_cause_reasoning: string
  safe_remediation: string[]; safety_notes: string[]
}
