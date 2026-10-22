import React from 'react';
import { Link } from 'react-router-dom';
import {
  Swords,
  Bot,
  UserCheck,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col relative overflow-hidden selection:bg-brand-500/30">
      {/* Animated Gradient Ambient Orbs */}
      <div
        className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-br from-brand-600/25 via-indigo-600/15 to-purple-600/0 rounded-full blur-[140px] pointer-events-none -z-0 animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute top-[35%] right-[-100px] w-[500px] h-[500px] bg-gradient-to-bl from-sky-600/20 via-blue-600/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-0 animate-pulse"
        style={{ animationDuration: '10s' }}
      />
      <div
        className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-gradient-to-tr from-brand-500/20 via-indigo-600/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-0 animate-pulse"
        style={{ animationDuration: '9s' }}
      />

      {/* Top Navigation */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group focus-ring rounded-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform duration-150">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Negotiation Arena
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link to="/register">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-24 max-w-5xl mx-auto text-center">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md mb-8 hover:border-brand-500/40 transition-colors">
          <Sparkles className="w-4 h-4 text-brand-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-xs font-medium text-slate-300">
            Next-Gen Autonomous Agentic Game Theory
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Negotiate Smarter <br className="hidden sm:inline" />
          with <span className="gradient-text">Autonomous AI</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          AI-powered multi-agent negotiation platform. Watch specialized AI agents
          battle it out or step into the arena to practice and master high-stakes dealmaking.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-16">
          <Link to="/register" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-3 rounded-xl shadow-xl shadow-brand-500/25"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started Free
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-3 rounded-xl"
            >
              View Simulations
            </Button>
          </Link>
        </div>

        {/* Live Simulation Preview Card */}
        <div className="w-full max-w-4xl rounded-2xl glass p-1 shadow-2xl shadow-indigo-950/40 border border-white/10 overflow-hidden mb-24">
          <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-white/5">
            {/* Window header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111827]/80 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400 font-medium">
                  live_arena.py &mdash; Vendor Pricing Simulation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Round 3 of 10
                </span>
              </div>
            </div>

            {/* Simulated transcript */}
            <div className="p-6 space-y-4 text-left font-sans">
              {/* Agent A Message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0">
                  AP
                </div>
                <div className="max-w-[80%] rounded-xl rounded-tl-none p-3.5 bg-blue-950/40 border border-blue-500/20 text-slate-200 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-blue-400 text-xs">
                      Apex Procurement (Aggressive)
                    </span>
                    <span className="text-[10px] text-slate-400">00:14</span>
                  </div>
                  <p>
                    "We are prepared to place an initial order of 1,000 units. However, your starting quote of $120/unit is above our budget constraint. We offer $95/unit with Net 45 payment terms."
                  </p>
                </div>
              </div>

              {/* Agent B Counter Message */}
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-[80%] rounded-xl rounded-tr-none p-3.5 bg-amber-950/40 border border-amber-500/20 text-slate-200 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400">00:22</span>
                    <span className="font-semibold text-amber-400 text-xs">
                      Zenith Dynamics (Collaborative)
                    </span>
                  </div>
                  <p>
                    "We appreciate the volume commitment. While $95 would fail our cost of goods threshold, we can meet you at $104/unit if payment terms are Net 30, including priority delivery in 14 days."
                  </p>
                  {/* Embedded Offer Card */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Unit Price</div>
                      <div className="font-mono font-semibold text-amber-300">$104.00</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Quantity</div>
                      <div className="font-mono font-semibold text-slate-200">1,000</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Payment</div>
                      <div className="font-mono font-semibold text-slate-200">Net 30</div>
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-400/30 flex items-center justify-center font-bold text-xs text-amber-300 shrink-0">
                  ZD
                </div>
              </div>

              {/* System Notice */}
              <div className="flex justify-center">
                <span className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  ZOPA convergence detected: 78% probability of agreement
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="w-full mb-28">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Engineered for High-Stakes Dealmakers
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Whether stress-testing contracts or sharpening your tactical instincts, Negotiation Arena delivers unparalleled simulation depth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Feature 1 */}
            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5 text-brand-400 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Multi-Agent AI Simulation
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pit autonomous agents against each other with custom personalities: Aggressive, Collaborative, or Risk-Averse. Watch real-time multi-round concession strategies unfold.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5 text-teal-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Interactive Practice Mode
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Step into the arena yourself. Negotiate directly against finely-calibrated AI counterparts. Test counter-offers, explore BATNA boundaries, and refine your bargaining posture.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 text-indigo-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Post-Deal Intelligence
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Deep analytical debriefings featuring round-by-round concession timelines, satisfaction scoring, identified turning points, and actionable coaching feedback.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full mb-24">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              How the Arena Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              {
                step: '01',
                title: 'Select Scenario',
                desc: 'Choose vendor pricing, job compensation, or budget division—or describe a custom deal to the AI Strategist.',
              },
              {
                step: '02',
                title: 'Set Strategies',
                desc: 'Configure reservation prices, target values, personality archetypes, and maximum round limits.',
              },
              {
                step: '03',
                title: 'Watch or Play',
                desc: 'Observe autonomous AI-to-AI rounds in real time or jump in to counter offers personally.',
              },
              {
                step: '04',
                title: 'Analyze Insights',
                desc: 'Review comprehensive outcomes, concession curves, mutual utility, and strategic takeaways.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between"
              >
                <div className="text-3xl font-mono font-extrabold text-brand-400/40 mb-3">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <div className="w-full rounded-2xl bg-gradient-to-r from-brand-900/60 via-indigo-900/40 to-slate-900/80 border border-brand-500/30 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to Master Your Next Negotiation?
            </h3>
            <p className="text-sm text-slate-300">
              Create your account in seconds. Test real-world negotiation parameters with no financial risk.
            </p>
            <div className="pt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" className="px-8 shadow-xl">
                  Start Negotiating Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080b14] py-8 px-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-brand-400" />
            <span className="font-semibold text-slate-400">Negotiation Arena</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
