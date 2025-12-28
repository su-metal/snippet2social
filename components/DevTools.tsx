'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useLocale, UiLocale, TranslationKey } from '../context/LocaleContext';
import { Settings, RefreshCw, UserCheck, ShieldAlert, GripVertical, Minimize2 } from 'lucide-react';

const LANGUAGE_OPTIONS: { id: UiLocale; labelKey: TranslationKey }[] = [
  { id: 'ja', labelKey: 'devtools.languageOption.ja' },
  { id: 'en', labelKey: 'devtools.languageOption.en' },
];

export const DevTools: React.FC = () => {
  const { isPro, togglePro, usageCount, resetUsage, maxUsage } = useUser();
  const { uiLocale, setUiLocale, t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState({ x: -20, y: -100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const devToolsRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const rect = devToolsRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartPos.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setIsDragging(true);
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      startDrag(event.clientX, event.clientY);
    },
    [startDrag]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (touch) {
        startDrag(touch.clientX, touch.clientY);
      }
    },
    [startDrag]
  );

  useEffect(() => {
    if (!isDragging) return;

    const movePanel = (clientX: number, clientY: number) => {
      const bounds = devToolsRef.current;
      if (!bounds) return;
      const newX = window.innerWidth - clientX - bounds.offsetWidth + dragStartPos.current.x;
      const newY = window.innerHeight - clientY - bounds.offsetHeight + dragStartPos.current.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      movePanel(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      movePanel(event.touches[0].clientX, event.touches[0].clientY);
    };

    const handleRelease = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleRelease);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleRelease);
    };
  }, [isDragging]);

  return (
    <div
      ref={devToolsRef}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`fixed z-50 transition-shadow duration-200 ${isDragging ? 'shadow-2xl scale-[1.02]' : 'shadow-xl'} pointer-events-none`}
    >
      <div
        className={`bg-slate-900 text-white border border-slate-700 pointer-events-auto overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'w-64 rounded-2xl' : 'w-12 h-12 rounded-full'}`}
      >
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`flex items-center justify-between bg-slate-800/50 cursor-move select-none p-3 ${!isExpanded ? 'h-full justify-center p-0' : 'border-b border-slate-700'}`}
        >
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-500" />
                <Settings className="w-4 h-4 text-brand-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Dev Tools</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-slate-700 rounded-md transition-colors"
              >
                <Minimize2 className="w-3 h-3 text-slate-400" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="w-full h-full flex items-center justify-center relative group"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 group-hover:rotate-90 ${isPro ? 'text-amber-400' : 'text-brand-400'}`} />
              <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isPro ? 'bg-amber-500' : 'bg-brand-500'}`} />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Plan Status</span>
              <div className={`text-xs font-bold px-2 py-2 rounded-lg flex items-center justify-between ${isPro ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
                <div className="flex items-center gap-2">
                  {isPro ? <UserCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isPro ? 'PRO ACTIVE' : 'FREE PLAN'}
                </div>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isPro ? 'bg-amber-500' : 'bg-brand-500'}`} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Usage Tracker</span>
                <span className="text-[10px] font-mono text-slate-300">
                  {usageCount} / {isPro ? 'UNLIMITED' : maxUsage}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-700 ease-out ${isPro ? 'bg-amber-500' : usageCount >= maxUsage ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ width: isPro ? '100%' : `${Math.min((usageCount / maxUsage) * 100, 100)}%` }}
                />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase">{t('devtools.languageLabel')}</span>
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = uiLocale === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                  onClick={() => setUiLocale(option.id, { syncUrl: true })}
                    className={`flex-1 text-[10px] font-bold py-2 px-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-slate-700 text-white border-slate-600'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={togglePro}
                className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 ${isPro ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20'}`}
              >
                {isPro ? 'Switch to Free' : 'Switch to PRO'}
              </button>
              <button
                type="button"
                onClick={resetUsage}
                className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl transition-colors border border-slate-700"
                title="Reset Usage"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
