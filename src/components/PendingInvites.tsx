import React, { useEffect, useState } from 'react';
import { useCalendar } from '../CalendarContext';
import { Bell, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingInvites() {
  const { pendingEvents, acknowledgeSharedEvent, declineSharedEvent } = useCalendar();
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    if (pendingEvents.length > prevCount) {
      playChime();
    }
    setPrevCount(pendingEvents.length);
  }, [pendingEvents.length, prevCount]);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  if (pendingEvents.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full max-h-[50vh] overflow-y-auto pr-2">
      {pendingEvents.map(event => (
        <div key={event.id} className="bg-white rounded-xl shadow-xl border border-blue-100 p-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 text-sm">New Event Invitation</h4>
              <p className="text-slate-800 font-medium mt-1">{event.title}</p>
              <p className="text-slate-500 text-xs mt-1">
                {format(event.startTime, 'MMM d, yyyy h:mm a')}
              </p>
              {event.description && (
                <p className="text-slate-600 text-xs mt-2 line-clamp-2">{event.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => acknowledgeSharedEvent(event)}
                  className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" /> Accept
                </button>
                <button
                  onClick={() => declineSharedEvent(event)}
                  className="flex-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" /> Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
