import type { Department } from '../types/department'
import type { LinuxCommand, LinuxQuestion, LinuxTopic, QuestionFilters } from '../types/linux'
import type { Az900Course, Az900PracticeQuestion, Az900VisualDiagram } from '../types/azure'
import type { AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic, AzureAdminDifficulty } from '../types/azureAdmin'
import type { AwsQuestion, AwsTopic, AwsDifficulty, AwsTroubleshootingLab, AwsVisualDiagram } from '../types/aws'

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
export const getAz900Course = (signal?: AbortSignal) => request<Az900Course>('/api/azure/az-900/course', signal)
export const getAz900Questions = (sectionId?: string, signal?: AbortSignal) => request<Az900PracticeQuestion[]>(`/api/azure/az-900/questions${sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : ''}`, signal)
export const getAzureVisualDiagrams = (signal?: AbortSignal) => request<Az900VisualDiagram[]>('/api/azure/administration/visual-learning/diagrams', signal)
export const getAzureAdminTopics = (signal?: AbortSignal) => request<AzureAdminTopic[]>('/api/azure/administration/topics', signal)
export const getAzureAdminQuestions = (filters: { q?: string; topic?: string; difficulty?: AzureAdminDifficulty } = {}, signal?: AbortSignal) => request<AzureAdminQuestion[]>(`/api/azure/administration/questions${queryString(filters)}`, signal)
export const getAzureAdminQuestion = (slug: string, signal?: AbortSignal) => request<AzureAdminQuestion>(`/api/azure/administration/questions/${encodeURIComponent(slug)}`, signal)
export const getAzureScenarios = (signal?: AbortSignal) => request<AzureAdminScenario[]>('/api/azure/administration/scenarios', signal)
export const getAzureScenario = (slug: string, signal?: AbortSignal) => request<AzureAdminScenario>(`/api/azure/administration/scenarios/${encodeURIComponent(slug)}`, signal)
export const getAwsTopics = (signal?: AbortSignal) => request<AwsTopic[]>('/api/aws/topics', signal)
export const getAwsQuestions = (filters: { q?: string; topic?: string; difficulty?: AwsDifficulty } = {}, signal?: AbortSignal) => request<AwsQuestion[]>(`/api/aws/questions${queryString(filters)}`, signal)
export const getAwsQuestion = (slug: string, signal?: AbortSignal) => request<AwsQuestion>(`/api/aws/questions/${encodeURIComponent(slug)}`, signal)
export const getAwsVisualDiagrams = (signal?: AbortSignal) => request<AwsVisualDiagram[]>('/api/aws/visual-learning/diagrams', signal)
export const getAwsTroubleshootingLabs = (signal?: AbortSignal) => request<AwsTroubleshootingLab[]>('/api/aws/troubleshooting/labs', signal)
export const getAwsTroubleshootingLab = (slug: string, signal?: AbortSignal) => request<AwsTroubleshootingLab>(`/api/aws/troubleshooting/labs/${encodeURIComponent(slug)}`, signal)

export interface LinuxCopilotExercise { id: string; title: string; category: string; difficulty: string; scenario: string; hint: string; solution: string[]; topic_id: string; question_slug: string }
