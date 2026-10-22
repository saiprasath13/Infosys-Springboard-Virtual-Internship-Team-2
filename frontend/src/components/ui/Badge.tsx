import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  value?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

function resolveVariant(value?: string, explicitVariant?: BadgeVariant): {
  style: string;
  dotColor: string;
} {
  const normalized = value?.toLowerCase().trim();

  if (explicitVariant) {
    switch (explicitVariant) {
      case 'success':
      case 'emerald':
        return {
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dotColor: 'bg-emerald-400',
        };
      case 'warning':
      case 'amber':
        return {
          style: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          dotColor: 'bg-amber-400',
        };
      case 'error':
      case 'rose':
        return {
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dotColor: 'bg-rose-400',
        };
      case 'info':
        return {
          style: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          dotColor: 'bg-sky-400',
        };
      case 'purple':
        return {
          style: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
          dotColor: 'bg-purple-400',
        };
      default:
        return {
          style: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
          dotColor: 'bg-slate-400',
        };
    }
  }

  // Automatic matching based on value
  switch (normalized) {
    case 'completed':
    case 'accepted':
    case 'agreement':
      return {
        style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dotColor: 'bg-emerald-400',
      };

    case 'active':
    case 'running':
    case 'in_progress':
      return {
        style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dotColor: 'bg-blue-400 animate-pulse',
      };

    case 'paused':
    case 'pending':
    case 'countered':
      return {
        style: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        dotColor: 'bg-amber-400',
      };

    case 'deadlocked':
    case 'rejected':
    case 'failed':
      return {
        style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        dotColor: 'bg-rose-400',
      };

    case 'cancelled':
      return {
        style: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        dotColor: 'bg-slate-400',
      };

    case 'simulation':
      return {
        style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        dotColor: 'bg-indigo-400',
      };

    case 'practice':
      return {
        style: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
        dotColor: 'bg-teal-400',
      };

    case 'vendor_pricing':
      return {
        style: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
        dotColor: 'bg-orange-400',
      };

    case 'job_offer':
      return {
        style: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
        dotColor: 'bg-sky-400',
      };

    case 'project_budget':
      return {
        style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        dotColor: 'bg-emerald-400',
      };

    case 'aggressive':
      return {
        style: 'bg-red-500/10 text-red-300 border-red-500/20',
        dotColor: 'bg-red-400',
      };

    case 'collaborative':
      return {
        style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        dotColor: 'bg-emerald-400',
      };

    case 'risk_averse':
      return {
        style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        dotColor: 'bg-indigo-400',
      };

    default:
      return {
        style: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dotColor: 'bg-slate-400',
      };
  }
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant,
  value,
  size = 'md',
  dot = true,
  ...props
}) => {
  const displayVal = value || (typeof children === 'string' ? children : undefined);
  const { style, dotColor } = resolveVariant(displayVal, variant);

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border tracking-wide uppercase',
        sizeStyles[size],
        style,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />}
      <span>{children || value}</span>
    </span>
  );
};
