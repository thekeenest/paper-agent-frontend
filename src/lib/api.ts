import type {
  AnalysisRequest,
  AnalysisResponse,
  TaskStatusResponse,
  TaskResult,
  AnalyticsData,
  DataSource,
  QueryExample,
  HealthResponse,
  EvaluationResponse,
} from '@/types/api'

// Declare global ENV type for runtime configuration
declare global {
  interface Window {
    ENV?: {
      VITE_API_URL?: string
      VITE_WS_URL?: string
    }
  }
}

// Use hardcoded production API URL
const API_BASE = 'https://paper-agent-production.up.railway.app'

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 2
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(error.detail || `HTTP error ${response.status}`)
      }

      return response.json()
    } catch (error) {
      // Retry on network errors (backend not ready yet)
      if (attempt < retries && error instanceof TypeError) {
        await new Promise(r => setTimeout(r, 1000)) // Wait 1 second before retry
        continue
      }
      throw error
    }
  }
  
  throw new Error('Failed after retries')
}

// Health check
export async function checkHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health')
}

// Analysis
export async function startAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  return fetchApi<AnalysisResponse>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Tasks
export async function getTasks(status?: string, limit = 50): Promise<TaskStatusResponse[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('limit', String(limit))
  
  return fetchApi<TaskStatusResponse[]>(`/api/tasks?${params}`)
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  return fetchApi<TaskStatusResponse>(`/api/tasks/${taskId}`)
}

export async function getTaskResults(taskId: string): Promise<TaskResult> {
  return fetchApi<TaskResult>(`/api/tasks/${taskId}/results`)
}

export async function getTaskAnalytics(taskId: string): Promise<AnalyticsData> {
  return fetchApi<AnalyticsData>(`/api/tasks/${taskId}/analytics`)
}

export async function deleteTask(taskId: string): Promise<void> {
  await fetchApi(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  })
}

export async function cancelTask(taskId: string): Promise<void> {
  await fetchApi(`/api/tasks/${taskId}/cancel`, {
    method: 'POST',
  })
}

// Evaluation
export async function evaluateTask(
  taskId: string,
  goldStandardPath?: string
): Promise<EvaluationResponse> {
  return fetchApi<EvaluationResponse>('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      task_id: taskId,
      gold_standard_path: goldStandardPath,
    }),
  })
}

// Data sources
export async function getDataSources(): Promise<DataSource[]> {
  return fetchApi<DataSource[]>('/api/data-sources')
}

export async function getQueryExamples(): Promise<Record<string, QueryExample[]>> {
  return fetchApi<Record<string, QueryExample[]>>('/api/query-examples')
}

// Get active task (single global task for all users)
export async function getActiveTask(): Promise<TaskStatusResponse | null> {
  return fetchApi<TaskStatusResponse | null>('/api/active-task')
}

// File download
export function getDownloadUrl(taskId: string, filename: string): string {
  return `${API_BASE}/api/tasks/${taskId}/download/${filename}`
}

// WebSocket connection
export function createWebSocket(taskId: string): WebSocket {
  const wsUrl = 'wss://paper-agent-production.up.railway.app'
  return new WebSocket(`${wsUrl}/ws/${taskId}`)
}
