export interface Az900Lesson {
  id: string
  title: string
  notes: string
  example: string
  learn_more: string
}

export interface Az900Section {
  id: string
  number: number
  title: string
  domain: string
  objective_note: string
  estimated_minutes: number
  objectives: string[]
  terminology: string[]
  revision_notes: string[]
  related_sections: string[]
  lessons: Az900Lesson[]
}

export interface Az900Course {
  title: string
  description: string
  disclaimer: string
  exam_objectives_as_of: string
  exam_domains: { name: string; weight: string }[]
  official_study_guide: string
  sections: Az900Section[]
}

export interface Az900PracticeQuestion {
  id: string
  section_id: string
  type: string
  prompt: string
  choices: string[]
  answer: number
  explanation: string
  tags: string[]
}

export interface Az900VisualNode {
  id: string
  label: string
  x: number
  y: number
  description: string
  purpose: string
  example: string
  services: string[]
  section_id: string
  question_ids: string[]
  admin_topic_id: string | null
}

export interface Az900VisualDiagram {
  id: string
  order: number
  title: string
  summary: string
  groups: Az900VisualGroup[]
  nodes: Az900VisualNode[]
  edges: [string, string][]
  sequence: string[]
  quiz_question_ids: string[]
}

export interface Az900VisualGroup {
  id: string
  title: string
  caption: string
  x: number
  y: number
  width: number
  height: number
}
