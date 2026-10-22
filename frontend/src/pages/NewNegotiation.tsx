import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Briefcase,
  PieChart,
  ArrowRight,
  Bot,
  Send,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { SimulationSetup } from '@/components/simulation/SimulationSetup';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export const NewNegotiation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scenarioParam = searchParams.get('scenario');

  const [aiPrompt, setAiPrompt] = useState('');
  const setupRef = useRef<HTMLDivElement>(null);

  // If a scenario is selected, scroll smoothly into view
  useEffect(() => {
    if (scenarioParam && setupRef.current) {
      setupRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scenarioParam]);

  const selectScenario = (type: string) => {
    setSearchParams({ scenario: type });
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    navigate(`/app/assistant?message=${encodeURIComponent(aiPrompt.trim())}`);
  };

  const promptChips = [
    'Negotiate an enterprise SaaS annual contract discount',
    'Counter a senior software engineer offer with equity & remote days',
    'Divide a $2M infrastructure & compute budget between two departments',
  ];

  const scenarios = [
    {
      id: 'vendor_pricing',
      title: 'Vendor Pricing & Terms',
      description:
        'Procurement negotiation covering unit pricing, order quantities, delivery windows, and Net payment terms.',
      icon: ShoppingCart,
      borderGradient: 'from-amber-500 via-orange-500 to-amber-600',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      parameters: 'Price • Quantity • Terms • Lead Times',
    },
    {
      id: 'job_offer',
      title: 'Job Offer & Compensation',
      description:
        'Executive salary, signing bonus, equity perks, PTO allowance, and joining notice period negotiation.',
      icon: Briefcase,
      borderGradient: 'from-blue-500 via-indigo-500 to-cyan-500',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      parameters: 'Base Pay • Stock Grants • Perks • Joining Date',
    },
    {
      id: 'project_budget',
      title: 'Project Budget Allocation',
      description:
        'Resource bargaining between two engineering teams for annual GPU compute, cloud licenses, and staff headcount.',
      icon: PieChart,
      borderGradient: 'from-emerald-500 via-teal-500 to-green-500',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      parameters: 'Total Pool • Alpha Share • Beta Share • Reservation Floors',
    },
  ];

  return (
    <div className="min-h-full px-4 sm:px-8 py-8 max-w-6xl mx-auto space-y-12">
      {/* Top Banner / Heading */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          Multi-Agent Arena Sandbox
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          What would you like to negotiate?
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          Select a pre-calibrated scenario template or instruct our AI Strategist to create a custom deal structure from scratch.
        </p>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = scenarioParam === sc.id;

          return (
            <div
              key={sc.id}
              className={cn(
                'group relative rounded-2xl p-6 glass flex flex-col justify-between transition-all duration-200 overflow-hidden border',
                isSelected
                  ? 'border-brand-500 shadow-2xl shadow-brand-500/15 ring-1 ring-brand-500 -translate-y-1'
                  : 'border-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-0.5'
              )}
            >
              {/* Gradient Top Border Bar */}
              <div
                className={cn(
                  'absolute top-0 inset-x-0 h-1 bg-gradient-to-r',
                  sc.borderGradient
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center border',
                      sc.badgeColor
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      sc.badgeColor
                    )}
                  >
                    Scenario
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                    {sc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-[11px] text-slate-400 font-mono">
                    {sc.parameters}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="button"
                  onClick={() => selectScenario(sc.id)}
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full justify-between"
                  rightIcon={
                    isSelected ? (
                      <SlidersHorizontal className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                >
                  {isSelected ? 'Configuring Setup' : 'Start Simulation'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conditional Setup Form if ?scenario is present */}
      {scenarioParam && (
        <div ref={setupRef} className="pt-4">
          <SimulationSetup
            key={scenarioParam}
            scenarioType={scenarioParam}
            onCancel={() => setSearchParams({})}
          />
        </div>
      )}

      {/* AI Chat Input Box at Bottom */}
      <div className="rounded-2xl glass p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              AI Negotiation Assistant
            </h3>
            <p className="text-xs text-slate-400">
              Describe a custom deal in natural language and the AI will generate parameters automatically.
            </p>
          </div>
        </div>

        {/* Quick Chip Suggestions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setAiPrompt(chip)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-left"
            >
              "{chip}"
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAiSubmit} className="relative mt-2">
          <textarea
            rows={3}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAiSubmit(e);
              }
            }}
            placeholder="e.g. 'I want to simulate buying 500 laptops for my company. I have a maximum budget of $450,000, but I want to target $400,000 with a 3-year warranty included...'"
            className="w-full bg-[#111827]/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl border border-white/10 p-4 pb-12 focus:border-brand-500 focus-ring outline-none resize-none"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
              Press Enter to send
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!aiPrompt.trim()}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Analyze & Setup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
