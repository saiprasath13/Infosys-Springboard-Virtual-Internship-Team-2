import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  UserCheck,
  Flame,
  Users,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { scenariosApi, negotiationsApi, getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { PersonalityType, NegotiationMode } from '@/types';

interface SimulationSetupProps {
  scenarioType: string;
  onCancel?: () => void;
}

const PERSONALITY_OPTIONS: {
  id: PersonalityType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: 'aggressive',
    label: 'Aggressive',
    desc: 'High anchor, slow concessions, firm reservation limit.',
    icon: Flame,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'collaborative',
    label: 'Collaborative',
    desc: 'Seeks mutual win-win, trades multi-issue terms creatively.',
    icon: Users,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    id: 'risk_averse',
    label: 'Risk-Averse',
    desc: 'Prioritizes deal certainty, avoids aggressive walkaways.',
    icon: ShieldAlert,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
];

export const SimulationSetup: React.FC<SimulationSetupProps> = ({
  scenarioType,
}) => {
  const navigate = useNavigate();

  // Mode: simulation (AI vs AI) or practice (Human vs AI)
  const [mode, setMode] = useState<NegotiationMode>('simulation');
  const [title, setTitle] = useState('');
  const [maxRounds, setMaxRounds] = useState(10);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Common Agent Meta
  const [agentAName, setAgentAName] = useState('');
  const [agentBName, setAgentBName] = useState('');
  const [agentAPersonality, setAgentAPersonality] = useState<PersonalityType>('aggressive');
  const [agentBPersonality, setAgentBPersonality] = useState<PersonalityType>('collaborative');

  // Vendor Pricing Fields
  const [startingPrice, setStartingPrice] = useState(120);
  const [buyerTargetPrice, setBuyerTargetPrice] = useState(90);
  const [buyerMaxPrice, setBuyerMaxPrice] = useState(105);
  const [vendorMinPrice, setVendorMinPrice] = useState(85);
  const [quantity, setQuantity] = useState(1000);
  const [deliveryDays, setDeliveryDays] = useState(14);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Job Offer Fields (in Lakhs ₹)
  const [startingSalary, setStartingSalary] = useState(24);
  const [candidateTarget, setCandidateTarget] = useState(30);
  const [candidateMin, setCandidateMin] = useState(25);
  const [recruiterBudget, setRecruiterBudget] = useState(28);
  const [benefits, setBenefits] = useState('Remote Work, Health Insurance, Stock Options');
  const [joiningDays, setJoiningDays] = useState(30);

  // Project Budget Fields (in Lakhs ₹ or units)
  const [totalBudget, setTotalBudget] = useState(100);
  const [alphaRequested, setAlphaRequested] = useState(65);
  const [betaRequested, setBetaRequested] = useState(55);
  const [alphaMinimum, setAlphaMinimum] = useState(40);
  const [betaMinimum, setBetaMinimum] = useState(35);

  // Load defaults from API or fallback
  useEffect(() => {
    let isMounted = true;

    async function loadDefaults() {
      try {
        if (scenarioType === 'vendor_pricing') {
          setTitle('Procurement Contract & Pricing Agreement');
          setAgentAName('Apex Procurement Corp (Buyer)');
          setAgentBName('Zenith Tech Components (Vendor)');
          const res = await scenariosApi.vendorPricingDefaults();
          if (res.data && isMounted) {
            const d = res.data;
            if (d.starting_price) setStartingPrice(d.starting_price);
            if (d.buyer_target_price) setBuyerTargetPrice(d.buyer_target_price);
            if (d.buyer_max_price) setBuyerMaxPrice(d.buyer_max_price);
            if (d.vendor_min_price) setVendorMinPrice(d.vendor_min_price);
            if (d.quantity) setQuantity(d.quantity);
            if (d.delivery_days) setDeliveryDays(d.delivery_days);
            if (d.payment_terms) setPaymentTerms(d.payment_terms);
            if (d.max_rounds) setMaxRounds(d.max_rounds);
          }
        } else if (scenarioType === 'job_offer') {
          setTitle('Principal AI Engineer Compensation Package');
          setAgentAName('Jordan Vance (Candidate)');
          setAgentBName('Nova AI Labs (Hiring Team)');
          const res = await scenariosApi.jobOfferDefaults();
          if (res.data && isMounted) {
            const d = res.data;
            if (d.starting_salary) setStartingSalary(d.starting_salary / 100000);
            if (d.candidate_target) setCandidateTarget(d.candidate_target / 100000);
            if (d.candidate_min) setCandidateMin(d.candidate_min / 100000);
            if (d.recruiter_budget) setRecruiterBudget(d.recruiter_budget / 100000);
            if (d.joining_days) setJoiningDays(d.joining_days);
            if (d.benefits) setBenefits(Array.isArray(d.benefits) ? d.benefits.join(', ') : d.benefits);
            if (d.max_rounds) setMaxRounds(d.max_rounds);
          }
        } else if (scenarioType === 'project_budget') {
          setTitle('Q3 Enterprise Cloud Infrastructure Allocation');
          setAgentAName('Platform Engineering (Alpha)');
          setAgentBName('Applied Machine Learning (Beta)');
          const res = await scenariosApi.projectBudgetDefaults();
          if (res.data && isMounted) {
            const d = res.data;
            if (d.total_budget) setTotalBudget(d.total_budget / 100000);
            if (d.alpha_requested) setAlphaRequested(d.alpha_requested / 100000);
            if (d.beta_requested) setBetaRequested(d.beta_requested / 100000);
            if (d.alpha_minimum) setAlphaMinimum(d.alpha_minimum / 100000);
            if (d.beta_minimum) setBetaMinimum(d.beta_minimum / 100000);
            if (d.max_rounds) setMaxRounds(d.max_rounds);
          }
        }
      } catch {
        // Safe fallbacks already set in state
      }
    }

    loadDefaults();
    return () => {
      isMounted = false;
    };
  }, [scenarioType]);

  // Adjust names when mode changes
  const handleModeChange = (newMode: NegotiationMode) => {
    setMode(newMode);
    if (newMode === 'practice') {
      if (!agentAName.includes('You')) {
        setAgentAName('You (Human Negotiator)');
      }
    } else {
      if (agentAName.includes('You')) {
        if (scenarioType === 'vendor_pricing') setAgentAName('Apex Procurement Corp (Buyer)');
        else if (scenarioType === 'job_offer') setAgentAName('Jordan Vance (Candidate)');
        else setAgentAName('Platform Engineering (Alpha)');
      }
    }
  };

  const asRupees = (value: number) => Number(value) * 100000;

  // Build config payload
  const buildConfig = () => {
    if (scenarioType === 'vendor_pricing') {
      return {
        scenario_type: 'vendor_pricing',
        mode,
        agent_a_name: agentAName.trim() || 'Buyer',
        agent_b_name: agentBName.trim() || 'Vendor',
        agent_a_personality: agentAPersonality,
        agent_b_personality: agentBPersonality,
        starting_price: Number(startingPrice),
        buyer_target_price: Number(buyerTargetPrice),
        buyer_max_price: Number(buyerMaxPrice),
        vendor_min_price: Number(vendorMinPrice),
        quantity: Number(quantity),
        delivery_days: Number(deliveryDays),
        payment_terms: paymentTerms,
        max_rounds: Number(maxRounds),
      };
    }

    if (scenarioType === 'job_offer') {
      const benefitsList = benefits
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      return {
        scenario_type: 'job_offer',
        mode,
        agent_a_name: agentAName.trim() || 'Candidate',
        agent_b_name: agentBName.trim() || 'Recruiter',
        agent_a_personality: agentAPersonality,
        agent_b_personality: agentBPersonality,
        starting_salary: asRupees(Number(startingSalary)),
        candidate_target: asRupees(Number(candidateTarget)),
        candidate_min: asRupees(Number(candidateMin)),
        recruiter_budget: asRupees(Number(recruiterBudget)),
        benefits: benefitsList,
        joining_days: Number(joiningDays),
        max_rounds: Number(maxRounds),
      };
    }

    // Default to project budget
    return {
      scenario_type: 'project_budget',
      mode,
      agent_a_name: agentAName.trim() || 'Alpha Team',
      agent_b_name: agentBName.trim() || 'Beta Team',
      agent_a_personality: agentAPersonality,
      agent_b_personality: agentBPersonality,
      total_budget: asRupees(Number(totalBudget)),
      alpha_requested: asRupees(Number(alphaRequested)),
      beta_requested: asRupees(Number(betaRequested)),
      alpha_minimum: asRupees(Number(alphaMinimum)),
      beta_minimum: asRupees(Number(betaMinimum)),
      max_rounds: Number(maxRounds),
    };
  };

  // Validate form
  const validate = (): boolean => {
    setValidationError(null);
    if (!title.trim()) {
      setValidationError('Please specify a title for the negotiation.');
      return false;
    }
    if (!agentAName.trim() || !agentBName.trim()) {
      setValidationError('Both agent names are required.');
      return false;
    }

    if (scenarioType === 'vendor_pricing') {
      if (buyerMaxPrice < buyerTargetPrice) {
        setValidationError('Buyer Max Price should be greater than or equal to Buyer Target Price.');
        return false;
      }
      if (buyerMaxPrice < vendorMinPrice) {
        setValidationError('Warning: Buyer Max Price is lower than Vendor Min Price (No ZOPA overlap!). Agreement may be impossible.');
      }
    }

    if (scenarioType === 'job_offer') {
      if (candidateTarget < candidateMin) {
        setValidationError('Candidate Target must be greater than Candidate Min.');
        return false;
      }
    }

    if (scenarioType === 'project_budget') {
      if (alphaMinimum + betaMinimum > totalBudget) {
        setValidationError('Combined minimum requests exceed the total budget!');
        return false;
      }
    }

    return true;
  };

  // Submit and start
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const config = buildConfig();

      const createRes = await negotiationsApi.create({
        title: title.trim(),
        scenario_type: scenarioType,
        mode,
        config,
        max_rounds: Number(maxRounds),
      });

      const newId = createRes.data.id;
      toast.success('Simulation created! Initializing arena...');

      // Start negotiation
      try {
        await negotiationsApi.start(newId);
      } catch (startErr) {
        // If start fails asynchronously, still navigate to arena
        console.warn('Initial start triggered with notification:', startErr);
      }

      navigate(`/app/negotiations/${newId}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pt-4 pb-16">
      {/* Configuration Header Card */}
      <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge value={scenarioType} />
              <span className="text-xs text-slate-400">Parameter Configuration</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Simulation Setup & Strategic Weights
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Rounds Limit:</span>
            <span className="font-mono font-bold text-brand-300 text-sm bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              {maxRounds} Rounds
            </span>
          </div>
        </div>

        <form onSubmit={handleStart} className="space-y-8 pt-6">
          {/* Section 0: Title */}
          <div>
            <Input
              label="Simulation Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Software Vendor Pricing Round"
              required
            />
          </div>

          {/* Section 1: Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              1. Choose Execution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Simulation Mode Card */}
              <div
                onClick={() => handleModeChange('simulation')}
                className={cn(
                  'p-5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-4',
                  mode === 'simulation'
                    ? 'bg-brand-500/15 border-brand-500 text-white shadow-lg shadow-brand-500/10 ring-1 ring-brand-500'
                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                    mode === 'simulation'
                      ? 'bg-brand-500 text-white border-brand-400'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  )}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">
                      AI vs AI Simulation
                    </span>
                    {mode === 'simulation' && (
                      <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Watch two autonomous AI agents negotiate with distinct calibrated personalities and reservation bounds.
                  </p>
                </div>
              </div>

              {/* Practice Mode Card */}
              <div
                onClick={() => handleModeChange('practice')}
                className={cn(
                  'p-5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-4',
                  mode === 'practice'
                    ? 'bg-teal-500/15 border-teal-500 text-white shadow-lg shadow-teal-500/10 ring-1 ring-teal-500'
                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                    mode === 'practice'
                      ? 'bg-teal-500 text-white border-teal-400'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  )}
                >
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">
                      Practice Arena (Human vs AI)
                    </span>
                    {mode === 'practice' && (
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Step in as Agent A. Pitch offers, formulate strategic concessions, and counter the AI opponent live.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Agent Identification & Personalities */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              2. Agent Setup & Behavioral Profiles
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agent A Box */}
              <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold text-white">
                      {mode === 'practice' ? 'You (Agent A)' : 'Agent A (Initiator)'}
                    </span>
                  </div>
                  <Badge variant="info" size="sm">
                    {mode === 'practice' ? 'Human' : 'Autonomous'}
                  </Badge>
                </div>

                <Input
                  label="Display Name / Role"
                  value={agentAName}
                  onChange={(e) => setAgentAName(e.target.value)}
                  placeholder="e.g. Apex Procurement Buyer"
                  required
                />

                {mode !== 'practice' && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 font-medium">
                      Personality Archetype
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PERSONALITY_OPTIONS.map((p) => {
                        const Icon = p.icon;
                        const isSelected = agentAPersonality === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setAgentAPersonality(p.id)}
                            className={cn(
                              'p-2.5 rounded-lg border text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-1',
                              isSelected
                                ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            )}
                          >
                            <Icon className="w-4 h-4 text-blue-400" />
                            <span className="text-[11px] font-medium leading-tight">
                              {p.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Agent B Box */}
              <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm font-semibold text-white">
                      Agent B (Counterpart)
                    </span>
                  </div>
                  <Badge variant="amber" size="sm">
                    Autonomous AI
                  </Badge>
                </div>

                <Input
                  label="Display Name / Role"
                  value={agentBName}
                  onChange={(e) => setAgentBName(e.target.value)}
                  placeholder="e.g. Zenith Tech Vendor"
                  required
                />

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">
                    Personality Archetype
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERSONALITY_OPTIONS.map((p) => {
                      const Icon = p.icon;
                      const isSelected = agentBPersonality === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setAgentBPersonality(p.id)}
                          className={cn(
                            'p-2.5 rounded-lg border text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-1',
                            isSelected
                              ? 'bg-amber-600/20 border-amber-400 text-white shadow-sm'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          )}
                        >
                          <Icon className="w-4 h-4 text-amber-400" />
                          <span className="text-[11px] font-medium leading-tight">
                            {p.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Scenario Specific Numerical Constraints */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              3. Scenario Boundaries & Deal Terms
            </label>

            {scenarioType === 'vendor_pricing' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <Input
                  label="Vendor Starting Price (₹)"
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(Number(e.target.value))}
                  required
                />
                <Input
                  label="Buyer Target Price (₹)"
                  type="number"
                  value={buyerTargetPrice}
                  onChange={(e) => setBuyerTargetPrice(Number(e.target.value))}
                  required
                />
                <Input
                  label="Buyer Max Price (₹)"
                  type="number"
                  value={buyerMaxPrice}
                  onChange={(e) => setBuyerMaxPrice(Number(e.target.value))}
                  helperText="Buyer reservation limit"
                  required
                />
                <Input
                  label="Vendor Min Price (₹)"
                  type="number"
                  value={vendorMinPrice}
                  onChange={(e) => setVendorMinPrice(Number(e.target.value))}
                  helperText="Vendor walkaway floor"
                  required
                />
                <Input
                  label="Order Quantity (Units)"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
                <Input
                  label="Delivery Days"
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(Number(e.target.value))}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Payment Terms"
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Net 30, Net 45, Immediate"
                    required
                  />
                </div>
              </div>
            )}

            {scenarioType === 'job_offer' && (
              <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Starting Salary Offer (₹ Lakhs)"
                    type="number"
                    step="0.5"
                    value={startingSalary}
                    onChange={(e) => setStartingSalary(Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Candidate Target (₹ Lakhs)"
                    type="number"
                    step="0.5"
                    value={candidateTarget}
                    onChange={(e) => setCandidateTarget(Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Candidate Min (₹ Lakhs)"
                    type="number"
                    step="0.5"
                    value={candidateMin}
                    onChange={(e) => setCandidateMin(Number(e.target.value))}
                    helperText="Candidate floor"
                    required
                  />
                  <Input
                    label="Recruiter Budget Ceiling (₹ Lakhs)"
                    type="number"
                    step="0.5"
                    value={recruiterBudget}
                    onChange={(e) => setRecruiterBudget(Number(e.target.value))}
                    helperText="Maximum allowed budget"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Key Perks & Benefits (Comma-separated)"
                      type="text"
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      placeholder="Remote Work, Relocation Bonus, Stock Options"
                    />
                  </div>
                  <Input
                    label="Joining Notice (Days)"
                    type="number"
                    value={joiningDays}
                    onChange={(e) => setJoiningDays(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            )}

            {scenarioType === 'project_budget' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <Input
                  label="Total Available Budget (₹ Lakhs)"
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  required
                />
                <Input
                  label="Team Alpha Desired (₹ Lakhs)"
                  type="number"
                  value={alphaRequested}
                  onChange={(e) => setAlphaRequested(Number(e.target.value))}
                  required
                />
                <Input
                  label="Team Beta Desired (₹ Lakhs)"
                  type="number"
                  value={betaRequested}
                  onChange={(e) => setBetaRequested(Number(e.target.value))}
                  required
                />
                <Input
                  label="Team Alpha Minimum Floor"
                  type="number"
                  value={alphaMinimum}
                  onChange={(e) => setAlphaMinimum(Number(e.target.value))}
                  required
                />
                <Input
                  label="Team Beta Minimum Floor"
                  type="number"
                  value={betaMinimum}
                  onChange={(e) => setBetaMinimum(Number(e.target.value))}
                  required
                />
              </div>
            )}
          </div>

          {/* Section 4: Max Rounds Slider */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  4. Maximum Negotiation Rounds
                </label>
                <p className="text-xs text-slate-400">
                  Negotiation concludes when consensus is reached or upon round limit exhaustion.
                </p>
              </div>
              <span className="text-base font-bold font-mono text-brand-400 bg-brand-500/10 px-3 py-1 rounded-lg border border-brand-500/20">
                {maxRounds} Rounds
              </span>
            </div>

            <input
              type="range"
              min="3"
              max="30"
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>3 (Rapid Blitz)</span>
              <span>10 (Standard Deal)</span>
              <span>30 (Deep Multi-Issue)</span>
            </div>
          </div>

          {/* Config Summary Box */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-200">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Zone of Possible Agreement (ZOPA) Analysis: </span>
              {scenarioType === 'vendor_pricing' && (
                <span>
                  Vendor floor is ₹{Number(vendorMinPrice).toLocaleString('en-IN')} and Buyer ceiling is ₹{Number(buyerMaxPrice).toLocaleString('en-IN')}.{' '}
                  {buyerMaxPrice >= vendorMinPrice ? (
                    <span className="text-emerald-400 font-medium">
                      Viable ZOPA spread of ₹{(Number(buyerMaxPrice) - Number(vendorMinPrice)).toLocaleString('en-IN')}.
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">
                      Negative spread (Deadlock probable unless concessions occur).
                    </span>
                  )}
                </span>
              )}
              {scenarioType === 'job_offer' && (
                <span>
                  Candidate floor is ₹{(Number(candidateMin) * 100000).toLocaleString('en-IN')} and Recruiter budget is ₹{(Number(recruiterBudget) * 100000).toLocaleString('en-IN')}.{' '}
                  {recruiterBudget >= candidateMin ? (
                    <span className="text-emerald-400 font-medium">
                      Overlapping zone of ₹{((Number(recruiterBudget) - Number(candidateMin)) * 100000).toLocaleString('en-IN')}.
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">
                      Budget is below candidate reservation minimum.
                    </span>
                  )}
                </span>
              )}
              {scenarioType === 'project_budget' && (
                <span>
                  Total budget ₹{(Number(totalBudget) * 100000).toLocaleString('en-IN')} vs total minimum needs ₹{((Number(alphaMinimum) + Number(betaMinimum)) * 100000).toLocaleString('en-IN')}.{' '}
                  {Number(totalBudget) >= Number(alphaMinimum) + Number(betaMinimum) ? (
                    <span className="text-emerald-400 font-medium">
                      Surplus of ₹{((Number(totalBudget) - (Number(alphaMinimum) + Number(betaMinimum))) * 100000).toLocaleString('en-IN')} available for allocation.
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">
                      Combined floors exceed total funds.
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Submission Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full text-base py-3.5 shadow-xl shadow-brand-500/25"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Start Negotiation Arena
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
