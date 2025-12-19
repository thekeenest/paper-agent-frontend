// API Types matching backend models

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type ProcessingStage = 
  | 'idle'
  | 'searching'
  | 'downloading'
  | 'parsing'
  | 'extracting'
  | 'normalizing'
  | 'aggregating'
  | 'completed'
  | 'failed'

export interface AnalysisRequest {
  query: string
  max_papers: number
  data_source: 'arxiv' | 'semantic_scholar' | 'openalex'
  date_from?: string
  date_to?: string
}

export interface AnalysisResponse {
  task_id: string
  status: TaskStatus
  message: string
  created_at: string
}

export interface TaskStatusResponse {
  task_id: string
  status: TaskStatus
  stage: ProcessingStage
  progress: number
  total_papers: number
  processed_papers: number
  failed_papers: number
  current_paper_id?: string
  current_paper_title?: string
  started_at?: string
  updated_at?: string
  completed_at?: string
  elapsed_seconds: number
  estimated_remaining?: number
  errors: TaskError[]
  query: string
  data_source: string
  max_papers: number
}

export interface TaskError {
  stage: string
  error: string
  traceback?: string
  timestamp: string
}

export interface TaskProgress {
  task_id: string
  stage: ProcessingStage
  progress: number
  message: string
  current_paper?: string
  processed: number
  total: number
  timestamp: string
}

export interface AuthorData {
  name: string
  raw_affiliation: string
  normalized_affiliation?: string
  country?: string
  country_code?: string
  org_type: string
  confidence: number
}

export interface PaperData {
  paper_id: string
  title: string
  abstract?: string
  published_date?: string
  categories: string[]
  authors: AuthorData[]
  pdf_url?: string
  processing_status: string
}

export interface OrganizationStats {
  name: string
  author_count: number
  country?: string
  org_type: string
  percentage: number
}

export interface CountryStats {
  country: string
  country_code?: string
  author_count: number
  org_count: number
  percentage: number
}

export interface OrgTypeStats {
  org_type: string
  count: number
  percentage: number
}

export interface AnalyticsData {
  total_papers: number
  total_authors: number
  unique_authors: number
  unique_organizations: number
  unique_countries: number
  avg_authors_per_paper: number
  avg_confidence: number
  top_organizations: OrganizationStats[]
  country_distribution: CountryStats[]
  org_type_distribution: OrgTypeStats[]
  papers_by_date: Record<string, number>
  processing_time_seconds: number
  data_source: string
}

export interface TaskResult {
  task_id: string
  status: TaskStatus
  analytics?: AnalyticsData
  papers: PaperData[]
  evaluation?: EvaluationResponse
  output_files: Record<string, string>
  errors: TaskError[]
}

export interface ExtractionMetrics {
  author_precision: number
  author_recall: number
  author_f1: number
  affiliation_precision: number
  affiliation_recall: number
  affiliation_f1: number
  org_normalization_accuracy: number
  country_accuracy: number
  hierarchical_accuracy: number
  hallucination_rate: number
}

export interface EvaluationResponse {
  task_id: string
  timestamp: string
  extraction_metrics: ExtractionMetrics
  overall_score: number
  gold_standard_papers: number
  evaluated_papers: number
}

export interface DataSource {
  id: string
  name: string
  description: string
  requires_key: boolean
  key_env?: string
  query_syntax?: string
}

export interface QueryExample {
  query: string
  description: string
}

export interface HealthResponse {
  status: string
  version: string
  timestamp: string
  services: Record<string, boolean>
}

// WebSocket message types
export interface WSMessage {
  type: 'status' | 'progress' | 'completed' | 'error'
  data: TaskStatusResponse | TaskProgress | string
}
