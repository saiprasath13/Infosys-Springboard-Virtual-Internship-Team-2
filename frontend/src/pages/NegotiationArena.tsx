import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  FileText,
  Send,
  Loader2,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  XCircle,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

import {
  useNegotiation,
  useStartNegotiation,
  usePauseNegotiation,
  useEndNegotiation,
  useSubmitOffer,
} from '@/hooks/useNegotiations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { ApiError, MessageRole, Offer } from '@/types';

export const NegotiationArena: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const negotiationId = Number(id);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Control panel mutations
  const startMutation = useStartNegotiation();
  const pauseMutation = usePauseNegotiation();
  const endMutation = useEndNegotiation();
  const submitOfferMutation = useSubmitOffer();

  // Poll negotiation while active or pending
  const { data: negotiation, isLoading, isFetching, isError, error, refetch } = useNegotiation(negotiationId, {
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      const data = query.state.data;
      if (!data) return 2000;
      const isTerminal = ['completed', 'deadlocked', 'cancelled'].includes(data.status);
      return isTerminal ? false : 2000;
    },
  });

  const requestStatus = isAxiosError<ApiError>(error) ? error.response?.status : undefined;
  const isForbiddenNegotiation = isError && requestStatus === 403;
  const isMissingNegotiation = isError && requestStatus === 404;
  const isInvalidNegotiationId = !Number.isInteger(negotiationId) || negotiationId < 1;

  const [metricsCollapsed, setMetricsCollapsed] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const formatSafeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'HH:mm:ss');
    } catch {
      return '';
    }
  };

  // Practice mode input form state
  const [practiceMessage, setPracticeMessage] = useState('');
  const [practicePrice, setPracticePrice] = useState<number | string>('');
  const [practiceTerms, setPracticeTerms] = useState('');
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);

  // Auto scroll transcript to bottom on new messages
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [negotiation?.messages?.length, negotiation?.offers?.length]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Loading Arena...</h3>
          <p className="text-xs text-slate-400">Synchronizing negotiation parameters & multi-agent history</p>
        </div>
      </div>
    );
  }

  if (isError || !negotiation) {
    const title = isForbiddenNegotiation
      ? 'Access Restricted'
      : isMissingNegotiation || isInvalidNegotiationId
        ? 'Negotiation Not Found'
        : 'Unable to Load Negotiation';
    const detailMessage = isForbiddenNegotiation
      ? `This negotiation is not available to ${user?.email ?? 'the current account'}. Check that you are signed in with the account that created it.`
      : isMissingNegotiation || isInvalidNegotiationId
        ? 'This link may be invalid, or the negotiation may have been deleted.'
        : isAxiosError<ApiError>(error)
          ? error.response?.data?.detail ||
            (error.response
              ? `The server returned HTTP ${error.response.status}. Please try again.`
              : 'Could not reach the API server. Check that the backend is running.')
          : 'The negotiation session could not be loaded. Please try again.';
    const canRetry = !isForbiddenNegotiation && !isMissingNegotiation && !isInvalidNegotiationId;

    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <XCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{detailMessage}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/app/dashboard')}>
            Back to Dashboard
          </Button>
          {canRetry && (
            <Button loading={isFetching} onClick={() => void refetch()}>
              Retry
            </Button>
          )}
          {isForbiddenNegotiation && (
            <Button
              variant="secondary"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Sign Out &amp; Switch Account
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isTerminal = ['completed', 'deadlocked', 'cancelled'].includes(negotiation.status);
  const isRunning = negotiation.status === 'active';
  const isPractice = negotiation.mode === 'practice';
  const config = (negotiation.config || {}) as Record<string, any>;

  // Actions
  const handleResumeOrStart = async () => {
    try {
      await startMutation.mutateAsync(negotiationId);
      toast.success('Simulation resumed');
    } catch {
      toast.error('Failed to start simulation');
    }
  };

  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync(negotiationId);
      toast.success('Simulation paused');
    } catch {
      toast.error('Failed to pause simulation');
    }
  };

  const handleEnd = async () => {
    if (window.confirm('Are you sure you want to conclude this negotiation early?')) {
      try {
        await endMutation.mutateAsync(negotiationId);
        toast.success('Negotiation ended');
      } catch {
        toast.error('Failed to end negotiation');
      }
    }
  };

  // Submit Practice Offer
  const handlePracticeOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceMessage.trim() && !practicePrice) {
      toast.error('Please enter an offer amount or message');
      return;
    }

    try {
      setPracticeSubmitting(true);
      const offerPayload: Record<string, unknown> = {};

      if (negotiation.scenario_type === 'vendor_pricing') {
        if (practicePrice) offerPayload.price = Number(practicePrice);
        if (practiceTerms) offerPayload.payment_terms = practiceTerms;
      } else if (negotiation.scenario_type === 'job_offer') {
        if (practicePrice) offerPayload.salary = Number(practicePrice) * 100000;
      } else if (negotiation.scenario_type === 'project_budget') {
        if (practicePrice) offerPayload.my_allocation = Number(practicePrice) * 100000;
      }

      await submitOfferMutation.mutateAsync({
        id: negotiationId,
        offerData: offerPayload,
        message: practiceMessage.trim(),
      });

      setPracticeMessage('');
      setPracticePrice('');
      setPracticeTerms('');
      toast.success('Offer delivered to AI counterpart');
    } catch {
      toast.error('Failed to submit offer');
    } finally {
      setPracticeSubmitting(false);
    }
  };

  // Build combined stream of messages and offers grouped by round
  const maxRounds = negotiation.max_rounds || 10;
  const currentRound = negotiation.current_round || 1;

  // Group items by round
  const itemsByRound: { [round: number]: { messages: any[]; offers: any[] } } = {};
  for (let r = 1; r <= Math.max(currentRound, 1); r++) {
    itemsByRound[r] = { messages: [], offers: [] };
  }

  (negotiation.messages || []).forEach((msg) => {
    const r = msg.round_number || 1;
    if (!itemsByRound[r]) itemsByRound[r] = { messages: [], offers: [] };
    itemsByRound[r].messages.push(msg);
  });

  (negotiation.offers || []).forEach((off) => {
    const r = off.round_number || 1;
    if (!itemsByRound[r]) itemsByRound[r] = { messages: [], offers: [] };
    itemsByRound[r].offers.push(off);
  });

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) return String(value);

    const abs = Math.abs(value);
    if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatOfferValue = (key: string, value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return String(value ?? '—');
    }

    if (key.toLowerCase().includes('salary') || key.toLowerCase().includes('price') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('allocation') || key.toLowerCase().includes('amount')) {
      return formatCurrency(value);
    }

    return value.toLocaleString('en-IN');
  };

  const renderRoleAvatar = (role: MessageRole) => {
    switch (role) {
      case 'agent_a':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            A
          </div>
        );
      case 'agent_b':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            B
          </div>
        );
      case 'human':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            YOU
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-500/40 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            SYS
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080b14] overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 bg-[#0d1117] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="truncate flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {negotiation.title}
              </h1>
              <Badge value={negotiation.status} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="capitalize">{negotiation.scenario_type.replace('_', ' ')}</span>
              <span>•</span>
              <span className="capitalize">{negotiation.mode} mode</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePause}
              leftIcon={<Pause className="w-3.5 h-3.5 text-amber-400" />}
            >
              Pause
            </Button>
          ) : !isTerminal ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleResumeOrStart}
              leftIcon={<Play className="w-3.5 h-3.5 text-white" />}
            >
              Resume
            </Button>
          ) : null}

          {!isTerminal && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleEnd}
              leftIcon={<Square className="w-3.5 h-3.5 text-red-400" />}
            >
              End Deal
            </Button>
          )}

          {isTerminal && (
            <Link to={`/app/reports/${negotiationId}`}>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white shadow-lg shadow-emerald-600/20"
                rightIcon={<FileText className="w-3.5 h-3.5" />}
              >
                View Outcome Report
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMetricsCollapsed(!metricsCollapsed)}
            className="hidden lg:flex p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={metricsCollapsed ? 'Expand Intel Panel' : 'Collapse Intel Panel'}
          >
            {metricsCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Body Split Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Live Transcript */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Simulation starting banner if no messages yet */}
            {(!negotiation.messages || negotiation.messages.length === 0) && (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 p-6 glass rounded-2xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 animate-spin" style={{ animationDuration: '6s' }}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-white">
                  {isRunning ? 'Simulation In Progress...' : 'Ready to Start Arena'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {isRunning
                    ? 'AI agents are computing reservation boundaries, strategic utilities, and initial anchor bids...'
                    : 'Click "Resume" or enter your opening offer to commence the negotiation.'}
                </p>
              </div>
            )}

            {/* Render rounds sequentially */}
            {Object.keys(itemsByRound)
              .map(Number)
              .sort((a, b) => a - b)
              .map((roundNum) => {
                const roundData = itemsByRound[roundNum];
                if (roundData.messages.length === 0 && roundData.offers.length === 0) return null;

                return (
                  <div key={roundNum} className="space-y-4">
                    {/* Round Separator Divider */}
                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative px-3 py-1 rounded-full bg-[#111827] border border-white/15 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-brand-400" />
                        <span>Round {roundNum} of {maxRounds}</span>
                      </div>
                    </div>

                    {/* Messages in this round */}
                    {roundData.messages.map((msg) => {
                      if (msg.role === 'system') {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <span className="text-xs px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-400 text-center max-w-md">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      const isAgentA = msg.role === 'agent_a';
                      const isHuman = msg.role === 'human';

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex items-start gap-3 w-full',
                            isAgentA ? 'justify-start' : 'justify-end'
                          )}
                        >
                          {isAgentA && renderRoleAvatar('agent_a')}

                          <div
                            className={cn(
                              'max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-1.5 shadow-lg border text-sm leading-relaxed',
                              isAgentA
                                ? 'bg-blue-950/30 border-blue-500/25 text-slate-200 rounded-tl-none'
                                : isHuman
                                ? 'bg-emerald-950/30 border-emerald-500/25 text-slate-200 rounded-tr-none'
                                : 'bg-amber-950/30 border-amber-500/25 text-slate-200 rounded-tr-none'
                            )}
                          >
                            <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                              <span
                                className={cn(
                                  isAgentA
                                    ? 'text-blue-400'
                                    : isHuman
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                                )}
                              >
                                {isAgentA
                                  ? config.agent_a_name || 'Agent A'
                                  : isHuman
                                  ? 'You (Human Negotiator)'
                                  : config.agent_b_name || 'Agent B'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {formatSafeTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>

                          {!isAgentA && renderRoleAvatar(isHuman ? 'human' : 'agent_b')}
                        </div>
                      );
                    })}

                    {/* Offers made in this round */}
                    {roundData.offers.map((offer: Offer) => (
                      <div
                        key={offer.id}
                        className="my-3 mx-auto max-w-xl p-4 rounded-xl glass border border-white/15 shadow-xl space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              Official Proposal by {offer.made_by}
                            </span>
                          </div>
                          <Badge value={offer.status} size="sm" />
                        </div>

                        {/* Offer data grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {Object.entries(offer.offer_data || {}).map(([key, val]) => (
                            <div
                              key={key}
                              className="p-2 rounded-lg bg-white/[0.03] border border-white/5"
                            >
                              <div className="text-[10px] uppercase font-mono text-slate-400 truncate">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="font-semibold text-slate-100 font-mono mt-0.5 truncate">
                                {formatOfferValue(key, val)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {offer.rationale && (
                          <div className="text-xs text-slate-400 italic bg-white/[0.02] p-2 rounded border border-white/5">
                            "{offer.rationale}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

            <div ref={transcriptEndRef} />
          </div>

          {/* Practice Mode Bottom Input Area */}
          {isPractice && !isTerminal && (
            <div className="p-4 bg-[#0d1117] border-t border-white/10 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Your Turn: Submit Counter-Offer or Statement
                </span>
                <span className="text-[11px] text-slate-400">
                  Negotiating as Agent A against AI Counterpart
                </span>
              </div>

              <form onSubmit={handlePracticeOfferSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder={
                      negotiation.scenario_type === 'vendor_pricing'
                        ? 'Proposed Unit Price (₹)'
                        : negotiation.scenario_type === 'job_offer'
                          ? 'Proposed Salary (₹ Lakhs / LPA)'
                          : 'Proposed Alpha Allocation (₹ Lakhs)'
                    }
                    type="number"
                    step="any"
                    value={practicePrice}
                    onChange={(e) => setPracticePrice(e.target.value)}
                  />
                  <Input
                    placeholder="Key terms (e.g. Net 30, Remote 3 days, etc.)"
                    type="text"
                    value={practiceTerms}
                    onChange={(e) => setPracticeTerms(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={practiceMessage}
                    onChange={(e) => setPracticeMessage(e.target.value)}
                    placeholder="Enter negotiation rationale or counter argument..."
                    className="flex-1 bg-[#111827] text-white text-sm rounded-xl border border-white/10 px-4 py-2.5 focus:border-emerald-500 focus-ring outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    loading={practiceSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 shrink-0"
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Intel & Metrics Panel */}
        {!metricsCollapsed && (
          <aside className="w-80 shrink-0 bg-[#0d1117]/95 border-l border-white/10 flex flex-col h-full overflow-y-auto p-4 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Arena Intelligence
                </h3>
              </div>
              <Badge value={negotiation.status} size="sm" />
            </div>

            {/* Round Progress Meter */}
            <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Progress</span>
                <span className="font-mono font-semibold text-white">
                  Round {currentRound} of {maxRounds}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((currentRound / maxRounds) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Agent A Summary Card */}
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">Agent A</span>
                <Badge variant="info" size="sm">
                  {config.agent_a_personality || 'Initiator'}
                </Badge>
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {config.agent_a_name || 'Agent A'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isPractice ? 'Human User Controller' : 'Autonomous AI Persona'}
              </div>
            </div>

            {/* Agent B Summary Card */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">Agent B</span>
                <Badge variant="amber" size="sm">
                  {config.agent_b_personality || 'Respondent'}
                </Badge>
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {config.agent_b_name || 'Agent B'}
              </div>
              <div className="text-[11px] text-slate-400">
                Autonomous AI Persona
              </div>
            </div>

            {/* Parameters Overview */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Scenario Bounds
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                {negotiation.scenario_type === 'vendor_pricing' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Starting Anchor</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.starting_price))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Buyer Target</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.buyer_target_price))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Buyer Max Ceiling</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.buyer_max_price))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vendor Min Floor</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.vendor_min_price))}</span>
                    </div>
                  </>
                )}

                {negotiation.scenario_type === 'job_offer' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Initial Offer</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.starting_salary))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Candidate Target</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.candidate_target))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Recruiter Budget</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.recruiter_budget))}</span>
                    </div>
                  </>
                )}

                {negotiation.scenario_type === 'project_budget' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Pool</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.total_budget))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alpha Ask</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.alpha_requested))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beta Ask</span>
                      <span className="font-mono text-white">{formatCurrency(Number(config.beta_requested))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Concession summary count */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Offers Submitted</span>
                <span className="font-mono font-semibold text-white">
                  {(negotiation.offers || []).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Transcript Turns</span>
                <span className="font-mono font-semibold text-white">
                  {(negotiation.messages || []).length}
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
