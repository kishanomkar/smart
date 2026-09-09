export type StageScores = Record<string, number>

export interface ForecastPoint {
  horizon: number
  threat_probability: number | null
  predicted_label: string | null
  trend: string | null
  forecast_mode: string | null
}

export interface Progression {
  current_stage: string
  next_likely_stage: string
  trajectory: string
  stage_scores: StageScores
  evidence: string[]
}

export interface ExplanationFeature {
  feature: string
  display_name: string
  value: number
  shap_value: number
  direction: string
  rank: number
}

export interface Explanation {
  prediction?: string | null
  confidence?: number | null
  threat_probability?: number | null
  features: ExplanationFeature[]
  available: boolean
  reason?: string | null
}

export interface NetworkNode {
  id: string
  role?: string | null
}

export interface NetworkEdge {
  source: string
  target: string
  protocol?: string | null
  port?: number | null
  packets?: number | null
  bytes?: number | null
}

export interface NetworkGraph {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  summary: Record<string, number>
  available: boolean
  reason?: string | null
}

export interface Flow {
  timestamp?: string | null
  src_ip?: string | null
  dst_ip?: string | null
  src_port?: number | null
  dst_port?: number | null
  protocol?: string | null
  prediction?: string | null
  confidence?: number | null
  threat_probability?: number | null
  packets?: number | null
  bytes?: number | null
}

export interface DashboardSummary {
  timestamp?: string | null
  current_risk?: number | null
  current_prediction?: string | null
  confidence?: number | null
  forecast: ForecastPoint[]
  attack_progression: Progression
  explanation: Explanation
  network_graph: NetworkGraph
  latest_flow?: Flow | null
}

export interface Status {
  capture: string
  random_forest: string
  world_model: string
  shap: string
  attack_progression: string
  artifacts: Record<string, boolean>
}

export interface HealthResponse {
  status: string
  service: string
  timestamp: string
}

export interface BenchmarkMetricItem {
  name: string
  logistic_regression: number
  random_forest: number
  netra_world_model: number
  unit: string
  higher_is_better: boolean
  improvement: string
}

export interface BenchmarkStageItem {
  stage: string
  baseline_f1: number
  world_model_f1: number
}

export interface BenchmarkResponse {
  dataset: string
  total_test_windows: number
  feature_count: number
  history_windows_k: number
  forward_horizon_steps: number
  summary: string
  metrics: BenchmarkMetricItem[]
  stages: BenchmarkStageItem[]
}

export interface OfflineAnalysisResult {
  available: boolean
  filename: string
  file_type: string
  file_size_bytes: number
  summary: string
  threat_probability: number
  predicted_label: string
  current_stage: string
  next_likely_stage: string
  trajectory: string
  total_flows: number
  anomalous_flows: number
  forecast: ForecastPoint[]
  explanation: Explanation
  flows: Flow[]
}
