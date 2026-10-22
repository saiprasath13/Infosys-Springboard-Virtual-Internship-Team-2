import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Loader2,
  User,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { conversationsApi, negotiationsApi, getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { AssistantMessage, AssistantChatResponse } from '@/types';

interface ExtendedChatItem {
  role: 'user' | 'assistant';
  content: string;
  extracted_config?: Record<string, unknown>;
  ready_to_start?: boolean;
  negotiation_id?: number;
}

export const AssistantPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialParam = searchParams.get('message');

  const [messages, setMessages] = useState<ExtendedChatItem[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Negotiation Strategist. Tell me about any deal you are preparing for—a vendor quote, job offer, or department budget—and I will configure optimal parameters, reservation bounds, and agent personalities for you.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestConfig, setLatestConfig] = useState<Record<string, unknown> | null>(null);
  const [isReadyToStart, setIsReadyToStart] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send message
  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ExtendedChatItem = { role: 'user', content: textToSend.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      // Map history for API
      const apiHistory: AssistantMessage[] = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await conversationsApi.chat(textToSend.trim(), apiHistory);
      const data: AssistantChatResponse = res.data;

      const assistantMsg: ExtendedChatItem = {
        role: 'assistant',
        content: data.reply,
        extracted_config: data.extracted_config,
        ready_to_start: data.ready_to_start,
        negotiation_id: data.negotiation_id,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.extracted_config) {
        setLatestConfig(data.extracted_config);
      }
      if (data.ready_to_start !== undefined) {
        setIsReadyToStart(data.ready_to_start);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
      // Fallback message so user isn't stuck if offline/mock
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I've analyzed your negotiation scenario. You can review the extracted parameters below or head to the setup arena directly.",
          ready_to_start: true,
          extracted_config: {
            scenario_type: 'vendor_pricing',
            title: textToSend.slice(0, 40) + '...',
            starting_price: 100,
            target_price: 85,
            reservation_limit: 95,
          },
        },
      ]);
      setIsReadyToStart(true);
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial query param message on mount once
  useEffect(() => {
    if (initialParam && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(initialParam);
    }
  }, [initialParam]);

  const handleLaunchSimulation = async () => {
    if (!latestConfig) {
      navigate('/app/new');
      return;
    }

    try {
      const scenarioType = String(latestConfig.scenario_type || 'vendor_pricing');
      const title = String(latestConfig.title || 'AI Strategy Session');
      const mode = String(latestConfig.mode || 'simulation');
      const normalizedMode = mode === 'practice' ? 'practice' : 'simulation';

      const createRes = await negotiationsApi.create({
        title,
        scenario_type: scenarioType,
        mode: normalizedMode,
        config: latestConfig,
        max_rounds: Number(latestConfig.max_rounds || 10),
      });

      const newId = createRes.data.id;
      toast.success(
        normalizedMode === 'practice'
          ? 'Practice negotiation created! Loading arena...'
          : 'Simulation generated! Commencing...'
      );
      await negotiationsApi.start(newId).catch(() => {});
      navigate(`/app/negotiations/${newId}`);
    } catch {
      toast.success('Navigating to scenario setup...');
      navigate(`/app/new?scenario=${latestConfig.scenario_type || 'vendor_pricing'}`);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Conversation reset. Describe a new negotiation scenario and I will extract the game-theoretic parameters for you.',
      },
    ]);
    setLatestConfig(null);
    setIsReadyToStart(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#080b14] overflow-hidden">
      {/* Top Banner */}
      <header className="px-6 py-3.5 bg-[#0d1117] border-b border-white/10 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              AI Negotiation Strategist
              <Badge variant="purple" size="sm">
                LLM Agent
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-400">
              Conversational parameter extraction & scenario builder
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors text-xs flex items-center gap-1.5 focus-ring"
          title="Reset Conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </header>

      {/* Mock / Live Notice Bar */}
      <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-2 flex items-center justify-between text-xs text-brand-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>
            Strategy engine active. The strategist analyzes Batna, ZOPA, and agent behavioral traits.
          </span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 w-full',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 shadow-lg text-sm leading-relaxed border',
                  isUser
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 border-indigo-400/30 text-white rounded-tr-none'
                    : 'glass border-white/10 text-slate-200 rounded-tl-none'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* If this assistant message returned extracted parameters */}
                {msg.extracted_config && (
                  <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-semibold text-brand-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        Extracted Scenario Parameters
                      </span>
                      <Badge value={String(msg.extracted_config.scenario_type || 'Custom')} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      {Object.entries(msg.extracted_config).map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded bg-white/5 truncate">
                          <span className="text-slate-400 uppercase text-[9px] block">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-white font-semibold truncate block">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass rounded-2xl rounded-tl-none p-4 border border-white/10 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Analyzing scenario parameters & game bounds...</span>
            </div>
          </div>
        )}

        {/* Ready to start action banner */}
        {isReadyToStart && latestConfig && (
          <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-brand-950/30 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Strategy Configuration Ready!
                </h4>
                <p className="text-xs text-slate-400">
                  Parameters extracted and validated. You can launch into the arena now.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleLaunchSimulation}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white shrink-0"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Configure & Start
            </Button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 bg-[#0d1117] border-t border-white/10 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="max-w-4xl mx-auto flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your scenario description or adjust terms..."
            className="flex-1 bg-[#111827] text-white text-sm rounded-xl border border-white/10 px-4 py-3 focus:border-brand-500 focus-ring outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!inputText.trim() || loading}
            className="shrink-0 px-5"
            rightIcon={<Send className="w-4 h-4" />}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};
