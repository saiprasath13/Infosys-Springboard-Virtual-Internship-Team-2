import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  Trophy,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  BarChart3,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { reportsApi } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { OutcomeReport } from '@/types';

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
};

const formatOfferValue = (key: string, value: unknown) => {
  if (typeof value === 'number') {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes('price') ||
      normalizedKey.includes('salary') ||
      normalizedKey.includes('budget') ||
      normalizedKey.includes('allocation') ||
      normalizedKey.includes('amount')
    ) {
      return formatCurrency(value);
    }
    return value.toLocaleString('en-IN');
  }
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '—');
};

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const negotiationId = Number(id);
  const navigate = useNavigate();

  const { data: report, isLoading, isError } = useQuery<OutcomeReport>({
    queryKey: ['report', negotiationId],
    queryFn: async () => {
      const res = await reportsApi.get(negotiationId);
      return res.data;
    },
    enabled: !isNaN(negotiationId) && negotiationId > 0,
  });

  const handleDownloadTranscript = () => {
    if (!report) return;

    const exportData = {
      title: report.title,
      negotiation_id: report.negotiation_id,
      scenario: report.scenario_type,
      mode: report.mode,
      status: report.status,
      final_outcome: report.final_outcome,
      agreed_terms: report.agreed_terms,
      total_rounds: report.total_rounds,
      satisfaction_scores: report.satisfaction_scores,
      concession_timeline: report.concession_timeline,
      turning_points: report.key_turning_points,
      suggestions: report.suggestions,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `negotiation-${report.negotiation_id}-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Transcript downloaded successfully');
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Generating Strategic Intelligence...</h3>
          <p className="text-xs text-slate-400">Computing concession curves & mutual satisfaction coefficients</p>
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Report Not Found</h3>
          <p className="text-xs text-slate-400">
            Could not fetch the outcome debrief for negotiation #{negotiationId}.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/app/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isAgreement =
    report.status === 'completed' ||
    report.final_outcome?.toLowerCase().includes('agreement') ||
    report.final_outcome?.toLowerCase().includes('deal');

  const isDeadlock =
    report.status === 'deadlocked' ||
    report.final_outcome?.toLowerCase().includes('deadlock') ||
    report.final_outcome?.toLowerCase().includes('breakdown');

  return (
    <div className="min-h-full px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/app/negotiations/${negotiationId}`)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
            title="Back to Arena"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase text-slate-400">
                Post-Deal Audit #{report.negotiation_id}
              </span>
              <Badge value={report.scenario_type} size="sm" />
              <Badge value={report.mode} size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {report.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTranscript}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download Transcript
          </Button>
          <Link to={`/app/negotiations/${negotiationId}`}>
            <Button variant="primary" size="sm">
              View Arena
            </Button>
          </Link>
        </div>
      </div>

      {/* Large Outcome Status Banner */}
      <div
        className={cn(
          'p-6 sm:p-8 rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6',
          isAgreement
            ? 'bg-emerald-950/30 border-emerald-500/30 shadow-emerald-950/20'
            : isDeadlock
            ? 'bg-rose-950/30 border-rose-500/30 shadow-rose-950/20'
            : 'bg-slate-900/40 border-slate-700/40 shadow-black/20'
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
              isAgreement
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                : isDeadlock
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-400'
                : 'bg-slate-700/30 border-slate-500/30 text-slate-300'
            )}
          >
            {isAgreement ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isDeadlock ? (
              <AlertOctagon className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Final Negotiation Outcome
              </span>
              <Badge
                variant={isAgreement ? 'emerald' : isDeadlock ? 'rose' : 'default'}
                size="sm"
              >
                {report.status}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {report.final_outcome || (isAgreement ? 'Mutually Agreed Settlement' : 'Negotiation Ended without Consensus')}
            </h2>
            {report.breakdown_reason && (
              <p className="text-xs sm:text-sm text-rose-300">
                Reason: {report.breakdown_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
          <span className="text-xs text-slate-400 uppercase font-mono">Total Contested</span>
          <span className="text-2xl font-bold font-mono text-white">
            {report.total_rounds} Rounds
          </span>
        </div>
      </div>

      {/* Agreed Terms or Final Offer Card */}
      {(report.agreed_terms || report.final_offer) && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{report.agreed_terms ? 'Executed Deal Terms' : 'Final Counter Proposal'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(report.agreed_terms || report.final_offer || {}).map(
                ([k, v]) => (
                  <div
                    key={k}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1"
                  >
                    <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-base font-semibold text-white font-mono block truncate">
                      {formatOfferValue(k, v)}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Satisfaction Scores if available */}
      {report.satisfaction_scores && Object.keys(report.satisfaction_scores).length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              <span>Party Mutual Utility & Satisfaction</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(report.satisfaction_scores).map(([party, score]) => {
              const scorePct = Math.min(100, Math.max(0, Math.round(score <= 1 ? score * 100 : score)));
              return (
                <div key={party} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200 capitalize">
                      {party.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-brand-300 font-bold">{scorePct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        scorePct >= 70
                          ? 'bg-emerald-500'
                          : scorePct >= 40
                          ? 'bg-brand-500'
                          : 'bg-rose-500'
                      )}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Concession Timeline */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-sky-400" />
            <span>Round-by-Round Concession Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!report.concession_timeline || report.concession_timeline.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">
              No recorded sequential concessions for this session.
            </div>
          ) : (
            <div className="space-y-4">
              {report.concession_timeline.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 font-mono text-xs font-bold text-white flex items-center justify-center shrink-0">
                      R{entry.round}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {entry.made_by}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {Object.entries(entry.offer_data || {})
                          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatOfferValue(k, v)}`)
                          .join(' • ')}
                      </div>
                    </div>
                  </div>
                  <Badge value={entry.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turning Points and Tactical Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Turning Points */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Key Turning Points</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!report.key_turning_points || report.key_turning_points.length === 0 ? (
              <div className="text-xs text-slate-400 italic">
                Standard progression with no anomalous turning points detected.
              </div>
            ) : (
              <ul className="space-y-3">
                {report.key_turning_points.map((pt, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Actionable Suggestions (Practice Mode or Coaching) */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span>Tactical Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!report.suggestions || report.suggestions.length === 0 ? (
              <div className="text-xs text-slate-400 italic">
                No tactical coach feedback recorded for this simulation run.
              </div>
            ) : (
              <ul className="space-y-3">
                {report.suggestions.map((sug, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
