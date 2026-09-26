import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { sounds } from '../utils/sounds';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'compact' | 'pill';
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({
  variant = 'button',
  className = '',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    sounds.click();
    toggleTheme();
  };

  const handleSelect = (mode: ThemeMode) => {
    sounds.click();
    setTheme(mode);
    setDropdownOpen(false);
  };

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl border border-slate-300/60 dark:border-slate-700/60 backdrop-blur-xs transition-colors scale-90 sm:scale-100 origin-right ${className}`}>
        <button
          type="button"
          onClick={() => handleSelect('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            theme === 'light'
              ? 'bg-white text-amber-600 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Light Mode"
        >
          <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} />
          {showLabel && <span>Light</span>}
        </button>
        <button
          type="button"
          onClick={() => handleSelect('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            theme === 'dark'
              ? 'bg-slate-900 text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Dark Mode"
        >
          <Moon size={14} className={theme === 'dark' ? 'text-blue-400' : ''} />
          {showLabel && <span>Dark</span>}
        </button>
        <button
          type="button"
          onClick={() => handleSelect('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="System Preference"
        >
          <Laptop size={14} />
          {showLabel && <span>System</span>}
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all scale-90 sm:scale-100 origin-right ${
            isDark
              ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50'
          } ${className}`}
          title="Change color theme"
          aria-label="Change color theme"
        >
          {theme === 'system' ? (
            <Laptop size={14} className="text-slate-400" />
          ) : isDark ? (
            <Moon size={14} className="text-blue-400" />
          ) : (
            <Sun size={14} className="text-amber-500" />
          )}
          <span>{theme === 'system' ? 'System' : isDark ? 'Dark' : 'Light'}</span>
          <ChevronDown size={12} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-scale-up">
            <button
              onClick={() => handleSelect('light')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                theme === 'light'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-paila-blue dark:text-blue-400 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun size={14} className="text-amber-500" />
              Light Theme
            </button>
            <button
              onClick={() => handleSelect('dark')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-paila-blue dark:text-blue-400 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon size={14} className="text-blue-400" />
              Dark Theme
            </button>
            <button
              onClick={() => handleSelect('system')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                theme === 'system'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-paila-blue dark:text-blue-400 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Laptop size={14} className="text-slate-400" />
              Auto (System)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default button style (1-click toggle with tooltip)
  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center scale-90 sm:scale-100 origin-right ${
        isDark
          ? 'bg-slate-800/80 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-blue-300 shadow-sm'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-amber-600 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Moon size={16} className="transition-transform duration-300 rotate-0 hover:-rotate-12" />
      ) : (
        <Sun size={16} className="text-amber-500 transition-transform duration-300 rotate-0 hover:rotate-45" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
}
