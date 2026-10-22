import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Swords,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Plus,
  ShoppingCart,
  Briefcase,
  PieChart,
  Search,
  Eye,
  FileText,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { useNegotiations, useDeleteNegotiation } from '@/hooks/useNegotiations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: negotiations = [] } = useNegotiations();
  const deleteMutation = useDeleteNegotiation();

  const [search, setSearch] = useState('');
  const [filterScenario, setFilterScenario] = useState<string>('all');

  // Stats calculation
  const totalCount = negotiations.length;
  const activeCount = negotiations.filter((n) => n.status === 'active' || n.status === 'pending').length;
  const completedCount = negotiations.filter((n) => n.status === 'completed').length;
  const deadlockedCount = negotiations.filter((n) => n.status === 'deadlocked').length;

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Delete negotiation "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Negotiation removed');
      } catch {
        toast.error('Failed to delete negotiation');
      }
    }
  };

  const filteredNegotiations = negotiations.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.scenario_type.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterScenario === 'all' || item.scenario_type === filterScenario;
    return matchesSearch && matchesFilter;
  });

  const quickStartTemplates = [
    {
      type: 'vendor_pricing',
      title: 'Vendor Pricing',
      desc: 'B2B Procurement & Contract Terms',
      icon: ShoppingCart,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      type: 'job_offer',
      title: 'Job Offer',
      desc: 'Salary, Stock Grants & Perks',
      icon: Briefcase,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      type: 'project_budget',
      title: 'Project Budget',
      desc: 'Multi-Department Compute Allocation',
      icon: PieChart,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="min-h-full px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Strategist'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor active multi-agent arenas and review post-deal intelligence.
          </p>
        </div>

        <Link to="/app/new">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lg shadow-brand-500/25"
          >
            New Negotiation
          </Button>
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total */}
        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Sessions
            </span>
            <Swords className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-400">All created negotiations</p>
        </div>

        {/* Active */}
        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Arenas
            </span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-blue-400">
            {activeCount}
          </div>
          <p className="text-[11px] text-slate-400">Simulations in flight</p>
        </div>

        {/* Completed */}
        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Consensus Deals
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {completedCount}
          </div>
          <p className="text-[11px] text-slate-400">Mutually accepted terms</p>
        </div>

        {/* Deadlocked */}
        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Deadlocks
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400">
            {deadlockedCount}
          </div>
          <p className="text-[11px] text-slate-400">Exhausted ZOPA bounds</p>
        </div>
      </div>

      {/* Quick Start Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Launch Presets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickStartTemplates.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div
                key={tmpl.type}
                onClick={() => navigate(`/app/new?scenario=${tmpl.type}`)}
                className="p-4 rounded-xl glass border border-white/10 hover:border-brand-500/40 hover:bg-white/[0.04] cursor-pointer transition-all duration-150 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center border shrink-0',
                      tmpl.bg
                    )}
                  >
                    <Icon className={cn('w-5 h-5', tmpl.color)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                      {tmpl.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">{tmpl.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Negotiations Table Section */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Table controls */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Negotiation Sessions
            </h3>
            <p className="text-xs text-slate-400">
              Browse history, jump into live arenas, or read detailed debriefs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111827] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 border border-white/10 focus:border-brand-500 focus-ring outline-none"
              />
            </div>

            {/* Scenario Filter */}
            <select
              value={filterScenario}
              onChange={(e) => setFilterScenario(e.target.value)}
              className="bg-[#111827] text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-white/10 focus:border-brand-500 focus-ring outline-none cursor-pointer"
            >
              <option value="all">All Scenarios</option>
              <option value="vendor_pricing">Vendor Pricing</option>
              <option value="job_offer">Job Offer</option>
              <option value="project_budget">Project Budget</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Title</th>
                <th className="px-6 py-3.5">Scenario</th>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Rounds</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredNegotiations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Swords className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium">No negotiations found</p>
                      <Link to="/app/new">
                        <Button variant="secondary" size="sm">
                          Start Your First Negotiation
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNegotiations.map((item) => {
                  let dateStr = '—';
                  if (item.created_at) {
                    try {
                      dateStr = format(parseISO(item.created_at), 'MMM dd, yyyy');
                    } catch {
                      dateStr = String(item.created_at);
                    }
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-white max-w-xs truncate">
                        <Link
                          to={`/app/negotiations/${item.id}`}
                          className="hover:text-brand-300 transition-colors"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge value={item.scenario_type} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <Badge value={item.mode} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <Badge value={item.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {item.current_round} / {item.max_rounds}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {dateStr}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/app/negotiations/${item.id}`}
                            title="Open Arena"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-white/5 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {['completed', 'deadlocked', 'cancelled'].includes(
                            item.status
                          ) && (
                            <Link
                              to={`/app/reports/${item.id}`}
                              title="View Report"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
