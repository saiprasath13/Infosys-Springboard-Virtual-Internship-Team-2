import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'glass-light' | 'outline' | 'solid';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'glass',
  hoverEffect = false,
  children,
  ...props
}) => {
  const variants = {
    glass: 'bg-[#0d1117]/80 backdrop-blur-md border border-white/10 shadow-xl',
    'glass-light': 'bg-white/[0.03] backdrop-blur-sm border border-white/10',
    outline: 'bg-transparent border border-white/10',
    solid: 'bg-[#111827] border border-white/10',
  };

  return (
    <div
      className={cn(
        'rounded-xl text-slate-100 transition-all duration-150 ease-out',
        variants[variant],
        hoverEffect &&
          'hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('px-6 py-5 border-b border-white/10 flex flex-col gap-1', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-lg font-semibold tracking-tight text-white', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-sm text-slate-400 leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => <div className={cn('p-6', className)} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('px-6 py-4 border-t border-white/10 flex items-center', className)} {...props}>
    {children}
  </div>
);
