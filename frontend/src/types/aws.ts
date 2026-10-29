export type AwsDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface AwsTopic {
  id: string
  slug: string
  name: string
  description: string
  order: number
}

export interface AwsQuestion {
  id: string
  slug: string
  topic_id: string
  topic: string
  difficulty: AwsDifficulty
  question: string
  short_answer: string
  detailed_explanation: string
  real_world_example: string
  services: string[]
  troubleshooting_steps: string[]
  common_mistakes: string[]
  interview_tips: string[]
  cost_considerations: string
  follow_up_questions: string[]
  related_question_ids: string[]
  documentation_links: string[]
}

export type AwsVisualEdgeKind = 'traffic' | 'authorization' | 'control' | 'event' | 'replication' | 'monitoring' | 'recovery' | 'containment'

export interface AwsVisualGroup {
  id: string
  title: string
  caption: string
  kind: 'global' | 'region' | 'availability-zone' | 'vpc' | 'subnet-public' | 'subnet-private' | 'subnet-isolated' | 'edge' | 'identity'
  x: number
  y: number
  width: number
  height: number
}

export interface AwsVisualNode {
  id: string
  label: string
  code: string
  x: number
  y: number
  description: string
  purpose: string
  example: string
  services: string[]
  topic_id: string
  question_ids: string[]
}

export interface AwsVisualEdge {
  id: string
  source: string
  target: string
  label: string
  kind: AwsVisualEdgeKind
  sequence_step?: number | null
}

export interface AwsVisualDiagram {
  id: string
  order: number
  title: string
  summary: string
  width: number
  height: number
  groups: AwsVisualGroup[]
  nodes: AwsVisualNode[]
  edges: AwsVisualEdge[]
  sequence: string[]
  documentation_links: string[]
}

export interface AwsTroubleshootingOption {
  id: string
  label: string
  feedback: string
  correct: boolean
}

export interface AwsTroubleshootingStep {
  id: string
  prompt: string
  evidence_ids: string[]
  hint: string
  options: AwsTroubleshootingOption[]
}

export interface AwsTroubleshootingEvidence {
  id: string
  label: string
  kind: 'log' | 'configuration' | 'metric' | 'symptom'
  content: string
  node_id: string
}

export interface AwsTroubleshootingLab {
  id: string
  slug: string
  title: string
  category: string
  difficulty: AwsDifficulty
  summary: string
  symptoms: string[]
  diagram_id: string
  node_ids: string[]
  topic_id: string
  related_question_ids: string[]
  evidence: AwsTroubleshootingEvidence[]
  diagnostic_steps: AwsTroubleshootingStep[]
  root_cause_id: string
  root_cause_options: AwsTroubleshootingOption[]
  root_cause_explanation: string
  remediation: string[]
  verification: string[]
  interview_takeaways: string[]
}
