export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface LinuxTopic {
  id: string
  slug: string
  name: string
  description: string
  department_id: 'linux'
  order: number
}

export interface LinuxQuestion {
  id: string
  slug: string
  topic_id: string
  topic: string
  difficulty: Difficulty
  experience_level: 'Entry-level' | 'Mid-level' | 'Senior'
  question: string
  short_answer: string
  detailed_explanation: string
  commands: string[]
  sample_output: string
  real_world_examples: string[]
  troubleshooting_steps: string[]
  common_mistakes: string[]
  cost_considerations: string
  follow_up_questions: string[]
}

export interface LinuxCommand {
  id: string
  name: string
  description: string
  example: string
  notes: string
  topic_ids: string[]
}

export interface QuestionFilters {
  topic?: string
  difficulty?: Difficulty
}
