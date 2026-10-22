import React, { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      className="inline-flex items-center gap-2 rounded-full p-1.5 text-slate-400 hover:text-slate-200 transition-colors focus-ring"
    >
      <span className="relative flex h-6 w-12 items-center rounded-full bg-slate-700 p-0.5 transition-colors data-[checked=true]:bg-brand-600" data-checked={isLight}>
        <span className={`absolute left-1 z-10 transition-opacity ${isLight ? 'opacity-50' : 'opacity-100'}`}>
          <Moon className="h-3.5 w-3.5" />
        </span>
        <span className={`absolute right-1 z-10 transition-opacity ${isLight ? 'opacity-100' : 'opacity-50'}`}>
          <Sun className="h-3.5 w-3.5" />
        </span>
        <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isLight ? 'translate-x-6' : 'translate-x-0'}`} />
      </span>
    </button>
  );
};
