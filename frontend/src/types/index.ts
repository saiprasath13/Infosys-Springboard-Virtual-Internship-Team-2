// Core types mirroring backend Pydantic schemas

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type ScenarioType = 'vendor_pricing' | 'job_offer' | 'project_budget' | 'custom';
export type NegotiationMode = 'simulation' | 'practice';
export type NegotiationStatus = 'pending' | 'active' | 'paused' | 'completed' | 'deadlocked' | 'cancelled';
export type PersonalityType = 'aggressive' | 'collaborative' | 'risk_averse';
export type MessageRole = 'system' | 'agent_a' | 'agent_b' | 'human' | 'assistant';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface NegotiationMessage {
  id: number;
  role: MessageRole;
  content: string;
  round_number?: number;
  metadata_?: Record<string, unknown>;
  created_at: string;
}

export interface Offer {
  id: number;
  round_number: number;
  made_by: string;
  offer_data: Record<string, unknown>;
  status: OfferStatus;
  rationale?: string;
  created_at: string;
}

export interface NegotiationSummary {
  id: number;
  title: string;
  scenario_type: ScenarioType;
  mode: NegotiationMode;
  status: NegotiationStatus;
  current_round: number;
  max_rounds: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface NegotiationDetail extends NegotiationSummary {
  config: Record<string, unknown>;
  outcome_data?: OutcomeData;
  messages: NegotiationMessage[];
  offers: Offer[];
}

export interface OutcomeData {
  final_outcome: string;
  agreed_terms?: Record<string, unknown>;
  breakdown_reason?: string;
  initial_offer?: Record<string, unknown>;
  final_offer?: Record<string, unknown>;
  satisfaction_scores?: Record<string, number>;
}

export interface OutcomeReport {
  negotiation_id: number;
  title: string;
  scenario_type: ScenarioType;
  mode: NegotiationMode;
  status: NegotiationStatus;
  final_outcome: string;
  agreed_terms?: Record<string, unknown>;
  breakdown_reason?: string;
  initial_offer?: Record<string, unknown>;
  final_offer?: Record<string, unknown>;
  total_rounds: number;
  concession_timeline: ConcessionEntry[];
  satisfaction_scores?: Record<string, number>;
  key_turning_points: string[];
  suggestions: string[];
  completed_at?: string;
}

export interface ConcessionEntry {
  round: number;
  made_by: string;
  offer_data: Record<string, unknown>;
  status: OfferStatus;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  negotiation_id?: number;
  extracted_config?: Record<string, unknown>;
  ready_to_start: boolean;
}

// Scenario configs
export interface VendorPricingConfig {
  scenario_type: 'vendor_pricing';
  mode: NegotiationMode;
  agent_a_name: string;
  agent_b_name: string;
  agent_a_personality: PersonalityType;
  agent_b_personality: PersonalityType;
  starting_price: number;
  buyer_target_price: number;
  buyer_max_price: number;
  vendor_min_price: number;
  quantity: number;
  delivery_days: number;
  payment_terms: string;
  max_rounds: number;
}

export interface JobOfferConfig {
  scenario_type: 'job_offer';
  mode: NegotiationMode;
  agent_a_name: string;
  agent_b_name: string;
  agent_a_personality: PersonalityType;
  agent_b_personality: PersonalityType;
  starting_salary: number;
  candidate_target: number;
  candidate_min: number;
  recruiter_budget: number;
  benefits: string[];
  joining_days: number;
  max_rounds: number;
}

export interface ProjectBudgetConfig {
  scenario_type: 'project_budget';
  mode: NegotiationMode;
  agent_a_name: string;
  agent_b_name: string;
  agent_a_personality: PersonalityType;
  agent_b_personality: PersonalityType;
  total_budget: number;
  alpha_requested: number;
  beta_requested: number;
  alpha_minimum: number;
  beta_minimum: number;
  max_rounds: number;
}

export type ScenarioConfig = VendorPricingConfig | JobOfferConfig | ProjectBudgetConfig;

export interface Personality {
  id: PersonalityType;
  label: string;
  description: string;
  icon: string;
}

export interface ApiError {
  detail: string;
}
