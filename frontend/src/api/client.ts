import axios, { AxiosError } from 'axios';
import type {
  TokenResponse, User, NegotiationSummary, NegotiationDetail,
  OutcomeReport, AssistantChatResponse,
  AssistantMessage, ApiError
} from '@/types';

const BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post<TokenResponse>(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError;
    return data?.detail || err.message;
  }
  return 'An unexpected error occurred';
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/login', { email, password }),
  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me'),
  updateMe: (data: { name?: string; avatar_url?: string }) =>
    apiClient.patch<User>('/users/me', data),
  changePassword: (current_password: string, new_password: string) =>
    apiClient.post('/users/me/change-password', { current_password, new_password }),
};

// ── Negotiations ──────────────────────────────────────────────────────────────
export const negotiationsApi = {
  list: (archived = false, search?: string) =>
    apiClient.get<NegotiationSummary[]>('/negotiations', { params: { archived, search } }),
  create: (data: { title: string; scenario_type: string; mode: string; config: object; max_rounds: number }) =>
    apiClient.post<NegotiationSummary>('/negotiations', data),
  get: (id: number) => apiClient.get<NegotiationDetail>(`/negotiations/${id}`),
  update: (id: number, data: { title?: string; is_archived?: boolean }) =>
    apiClient.patch<NegotiationSummary>(`/negotiations/${id}`, data),
  delete: (id: number) => apiClient.delete(`/negotiations/${id}`),
  start: (id: number) => apiClient.post(`/negotiations/${id}/start`),
  pause: (id: number) => apiClient.post(`/negotiations/${id}/pause`),
  end: (id: number) => apiClient.post(`/negotiations/${id}/end`),
  submitOffer: (id: number, offer_data: object, message?: string) =>
    apiClient.post(`/negotiations/${id}/offer`, { offer_data, message }),
};

// ── Scenarios ─────────────────────────────────────────────────────────────────
export const scenariosApi = {
  vendorPricingDefaults: () => apiClient.get('/scenarios/defaults/vendor-pricing'),
  jobOfferDefaults: () => apiClient.get('/scenarios/defaults/job-offer'),
  projectBudgetDefaults: () => apiClient.get('/scenarios/defaults/project-budget'),
  personalities: () => apiClient.get('/scenarios/personalities'),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  get: (negotiation_id: number) => apiClient.get<OutcomeReport>(`/reports/${negotiation_id}`),
};

// ── Assistant ─────────────────────────────────────────────────────────────────
export const conversationsApi = {
  chat: (message: string, history: AssistantMessage[], negotiation_id?: number) =>
    apiClient.post<AssistantChatResponse>('/conversations/chat', { message, history, negotiation_id }),
};
