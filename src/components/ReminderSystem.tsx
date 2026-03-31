import React, { useEffect, useState } from 'react';
import { CalendarEvent } from '../types';
import { useCalendar } from '../CalendarContext';
import { Bell, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function ReminderSystem() {
  const { events, updateEvent } = useCalendar();
  const [activeReminders, setActiveReminders] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const triggered: CalendarEvent[] = [];

      events.forEach(event => {
        if (!event.reminderMinutes || event.acknowledged) return;

        const reminderTime = new Date(event.startTime.getTime() - event.reminderMinutes * 60000);
        
        // If it's past the reminder time
        if (now >= reminderTime) {
          // If it's snoozed, check if snooze time has passed
          if (event.snoozedUntil) {
            if (now >= event.snoozedUntil) {
              triggered.push(event);
            }
          } else {
            // Not snoozed, trigger it
            triggered.push(event);
          }
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
    return () => clearInterval(interval);
  }, [events]);

  const handleAcknowledge = async (eventId: string) => {
    await updateEvent(eventId, { acknowledged: true });
  };

  const handleSnooze = async (eventId: string, minutes: number) => {
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
