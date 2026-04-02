import React, { useEffect, useState, useRef } from 'react';
import { CalendarEvent } from '../types';
import { useCalendar } from '../CalendarContext';
import { useAuth } from '../AuthContext';
import { Bell, Clock, Check, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function ReminderSystem() {
  const { events, updateEvent } = useCalendar();
  const { isFaceLocked, isBackgroundLocked } = useAuth();
  const [activeReminders, setActiveReminders] = useState<CalendarEvent[]>([]);
  const activeChimesRef = useRef<{ [eventId: string]: { stop: () => void } }>({});

  const isLocked = isFaceLocked || isBackgroundLocked;

  const playChimeForEvent = (eventId: string) => {
    if (activeChimesRef.current[eventId]) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      
      const playBeep = () => {
        if (audioCtx.state === 'closed') return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      };

      // Play immediately, then repeat every 2 seconds
      playBeep();
      const interval = setInterval(playBeep, 2000);

      activeChimesRef.current[eventId] = {
        stop: () => {
          clearInterval(interval);
          if (audioCtx.state !== 'closed') {
            audioCtx.close().catch(() => {});
          }
        }
      };
    } catch (e) {
      console.error("Failed to play chime:", e);
    }
  };

  const stopChimeForEvent = (eventId: string) => {
    if (activeChimesRef.current[eventId]) {
      activeChimesRef.current[eventId].stop();
      delete activeChimesRef.current[eventId];
    }
  };

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const triggered: CalendarEvent[] = [];

      events.forEach(event => {
        if (!event.reminderMinutes || event.acknowledged) {
          stopChimeForEvent(event.id);
          return;
        }

        const reminderTime = new Date(event.startTime.getTime() - event.reminderMinutes * 60000);
        
        // If it's past the reminder time
        if (now >= reminderTime) {
          // If it's snoozed, check if snooze time has passed
          if (event.snoozedUntil) {
            if (now >= event.snoozedUntil) {
              triggered.push(event);
            } else {
              stopChimeForEvent(event.id);
            }
          } else {
            // Not snoozed, trigger it
            triggered.push(event);
          }
        }
      });

      // Handle chimes for newly triggered events
      triggered.forEach(event => {
        if (event.reminderChime) {
          playChimeForEvent(event.id);
        }
      });

      // Stop chimes for events that are no longer triggered
      const triggeredIds = new Set(triggered.map(e => e.id));
      Object.keys(activeChimesRef.current).forEach(id => {
        if (!triggeredIds.has(id)) {
          stopChimeForEvent(id);
        }
      });

      // Only update state if there's a difference to avoid unnecessary re-renders
      setActiveReminders(prev => {
        const prevIds = prev.map(e => e.id).sort().join(',');
        const newIds = triggered.map(e => e.id).sort().join(',');
        if (prevIds !== newIds) return triggered;
        return prev;
      });
    };

    // Check immediately and then every 10 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    
    return () => {
      clearInterval(interval);
      // Cleanup all chimes on unmount
      Object.keys(activeChimesRef.current).forEach(stopChimeForEvent);
    };
  }, [events]);

  const handleAcknowledge = async (eventId: string) => {
    stopChimeForEvent(eventId);
    await updateEvent(eventId, { acknowledged: true });
  };

  const handleSnooze = async (eventId: string, minutes: number) => {
    stopChimeForEvent(eventId);
    const snoozedUntil = new Date(Date.now() + minutes * 60000);
    await updateEvent(eventId, { snoozedUntil });
  };

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-4 max-w-sm w-full">
      {activeReminders.map(event => (
        <div key={event.id} className="bg-white rounded-2xl shadow-xl border border-blue-100 p-5 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{event.title}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Starts at {format(event.startTime, 'h:mm a')}
              </p>
              
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => handleAcknowledge(event.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Acknowledge
                </button>
                <button
                  onClick={() => handleSnooze(event.id, 5)}
                  className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  title="Snooze for 5 minutes"
                >
                  <Clock className="h-4 w-4" />
                  Snooze
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
