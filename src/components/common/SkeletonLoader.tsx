import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'table-row' | 'table' | 'stat' | 'detail';
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ type = 'card', rows = 3, className = '' }: SkeletonLoaderProps) {
  if (type === 'stat') {
    return (
      <div className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="h-7 w-32 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 ${className}`}>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
            </div>
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <div className="p-4 flex items-center justify-between gap-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block"></div>
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className={`p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded"></div>
        <div className="h-3.5 w-4/5 bg-slate-100 dark:bg-slate-800/80 rounded"></div>
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
}
