import type { Department } from '../types/department'
import type { LinuxCommand, LinuxQuestion, LinuxTopic, QuestionFilters } from '../types/linux'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' }, signal })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch { /* Use the status message when the response is not JSON. */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

function queryString(values: { q?: string; topic?: string; difficulty?: string }): string {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value) })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const getDepartments = () => request<Department[]>('/api/departments')
export const getLinuxTopics = (signal?: AbortSignal) => request<LinuxTopic[]>('/api/linux/topics', signal)
export const getLinuxQuestions = (filters: QuestionFilters = {}, signal?: AbortSignal) => request<LinuxQuestion[]>(`/api/linux/questions${queryString(filters)}`, signal)
export const searchLinuxQuestions = (q: string, filters: QuestionFilters = {}, signal?: AbortSignal) => request<LinuxQuestion[]>(`/api/linux/search${queryString({ q, ...filters })}`, signal)
export const getLinuxQuestion = (slug: string, signal?: AbortSignal) => request<LinuxQuestion>(`/api/linux/questions/${encodeURIComponent(slug)}`, signal)
export const getLinuxCommands = (signal?: AbortSignal) => request<LinuxCommand[]>('/api/linux/commands', signal)
export const getLinuxCopilotExercises = (signal?: AbortSignal) => request<LinuxCopilotExercise[]>('/api/linux/copilot/exercises', signal)

export interface LinuxCopilotExercise { id: string; title: string; category: string; difficulty: string; scenario: string; hint: string; solution: string[]; topic_id: string; question_slug: string }
