export type DepartmentStatus = 'available' | 'coming_soon'

export interface Department {
  id: string
  name: string
  short_name: string
  description: string
  status: DepartmentStatus
  accent: string
  topics: string[]
}
