import React from 'react';
import { Link } from 'react-router-dom';
import { Swords, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/30">
          <Swords className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <div className="text-7xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">
            404
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Arena Coordinate Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The negotiation simulation or session you are looking for does not exist or has been archived.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/app/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Return to Arena
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" size="md">
              Landing Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
