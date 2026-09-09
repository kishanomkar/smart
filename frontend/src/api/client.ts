import axios from 'axios';
import type {
  DashboardSummary,
  Explanation,
  Flow,
  ForecastPoint,
  HealthResponse,
  NetworkGraph,
  Progression,
  Status,
} from '../types/api';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const api = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard-summary');
    return response.data;
  },
  getStatus: async (): Promise<Status> => {
    const response = await apiClient.get<Status>('/status');
    return response.data;
  },
  getLatestFlow: async (): Promise<Flow> => {
    const response = await apiClient.get<Flow>('/latest');
    return response.data;
  },
  getFlows: async (limit = 100): Promise<Flow[]> => {
    const response = await apiClient.get<Flow[]>(`/flows?limit=${limit}`);
    return response.data;
  },
  getForecast: async (): Promise<ForecastPoint[]> => {
    const response = await apiClient.get<ForecastPoint[]>('/forecast');
    return response.data;
  },
  getProgression: async (): Promise<Progression> => {
    const response = await apiClient.get<Progression>('/attack-progression');
    return response.data;
  },
  getExplanation: async (): Promise<Explanation> => {
    const response = await apiClient.get<Explanation>('/explanation');
    return response.data;
  },
  getNetwork: async (): Promise<NetworkGraph> => {
    const response = await apiClient.get<NetworkGraph>('/network');
    return response.data;
  },
  getHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
  analyzeFlow: async (features: Record<string, number>) => {
    const response = await apiClient.post('/analyze-flow', { features });
    return response.data;
  },
  analyzePcap: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/analyze-pcap', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Convenience named exports
export const getSummary = api.getSummary;
export const getStatus = api.getStatus;
export const getLatestFlow = api.getLatestFlow;
export const getFlows = api.getFlows;
export const getForecast = api.getForecast;
export const getProgression = api.getProgression;
export const getExplanation = api.getExplanation;
export const getNetwork = api.getNetwork;
export const analyzePcap = api.analyzePcap;
export const analyzeFlow = api.analyzeFlow;

export default api;
