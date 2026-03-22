"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = 'focus' | 'short_break' | 'long_break';

const DURATIONS = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60
};

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTask, setCurrentTask] = useState("");

  const playNotification = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      playNotification();
      setIsRunning(false);
      
      if (mode === 'focus') {
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);
        if (newSessions > 0 && newSessions % 4 === 0) {
          setMode('long_break');
          setTimeLeft(DURATIONS.long_break);
        } else {
          setMode('short_break');
          setTimeLeft(DURATIONS.short_break);
        }
      } else {
        setMode('focus');
        setTimeLeft(DURATIONS.focus);
      }
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, sessionsCompleted, playNotification]);

  useEffect(() => {
    if (isRunning) {
      document.title = `🍅 ${formatTime(timeLeft)} — ${currentTask || 'Focus'}`;
    } else {
      document.title = "AssembleOne"; 
    }
    return () => {
      document.title = "AssembleOne";
    };
  }, [isRunning, timeLeft, currentTask]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(DURATIONS[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(DURATIONS[mode]);
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - (timeLeft / DURATIONS[mode]);
  const strokeDashoffset = Math.max(0, circumference * (1 - progress));

  const getModeColorStr = () => {
    if (mode === 'focus') return "var(--violet)";
    if (mode === 'short_break') return "var(--green)";
    return "var(--blue)";
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-[var(--surface-hi)] border border-[var(--border)] rounded-full px-4 py-2 flex items-center gap-3 shadow-lg cursor-pointer hover:border-[var(--violet)] transition-colors z-50 animate-in slide-in-from-bottom-4"
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getModeColorStr() }} />
        <span className="font-mono text-[14px] font-medium text-[var(--text-1)]">{formatTime(timeLeft)}</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-[var(--surface-hi)] border border-[var(--border)] rounded-2xl w-[240px] shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex bg-[var(--background)] rounded-lg p-0.5 border border-[var(--border)]">
          <button onClick={() => handleModeChange('focus')} className={cn("px-2 py-1 rounded-md text-[10px] font-medium transition-colors", mode === 'focus' ? "bg-[var(--surface-hi)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]")}>Focus</button>
          <button onClick={() => handleModeChange('short_break')} className={cn("px-2 py-1 rounded-md text-[10px] font-medium transition-colors", mode === 'short_break' ? "bg-[var(--surface-hi)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]")}>Short</button>
          <button onClick={() => handleModeChange('long_break')} className={cn("px-2 py-1 rounded-md text-[10px] font-medium transition-colors", mode === 'long_break' ? "bg-[var(--surface-hi)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]")}>Long</button>
        </div>
        <button onClick={() => setIsMinimized(true)} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-md hover:bg-[var(--surface)] transition-colors">
          <Minus size={14} />
        </button>
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center py-6 px-4">
        <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-4 cursor-pointer select-none" onClick={toggleTimer}>
          <svg width="140" height="140" viewBox="0 0 140 140" className="absolute inset-0">
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="70" cy="70" r="54" fill="none" 
              stroke={getModeColorStr()}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <span className="font-mono text-[32px] font-medium text-[var(--text-1)] leading-none mb-1">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-medium">
              {mode === 'focus' ? 'Focus Time' : mode === 'short_break' ? 'Short Break' : 'Rest'}
            </span>
          </div>
        </div>

        {/* Task Input */}
        <input 
          type="text"
          placeholder="What are you working on?"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-1)] text-center outline-none focus:border-[var(--violet)] transition-colors mb-4"
        />

        {/* Controls */}
        <div className="flex w-full gap-2">
          <button 
            onClick={toggleTimer}
            className="flex-1 py-2.5 rounded-xl font-medium text-[13px] text-white shadow-sm transition-all flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: getModeColorStr() }}
          >
            {isRunning ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Start</>}
          </button>
          
          <button 
            onClick={resetTimer}
            className="w-10 py-2.5 flex items-center justify-center rounded-xl font-medium text-[var(--text-3)] border border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text-1)] transition-colors"
          >
            <RotateCcw size={14}/>
          </button>
        </div>
      </div>

      {/* Footer / Sessions */}
      <div className="bg-[var(--surface)] border-t border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => {
            const isCompleted = i < (sessionsCompleted % 4);
            return (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isCompleted ? "bg-[var(--violet)]" : "bg-[var(--border-hi)]"
                )}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-[var(--text-3)] font-medium">
          {sessionsCompleted} total
        </span>
      </div>
    </div>
  );
}

export default PomodoroTimer;
