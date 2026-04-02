import React, { useState } from 'react';
import { useCalendar } from '../CalendarContext';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';

export default function SmartAddModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedOperations, setParsedOperations] = useState<any[] | null>(null);
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const simplifiedEvents = events.map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        reminderMinutes: e.reminderMinutes
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Process the following request to manage calendar events. The user might want to add new events, update existing events (like adding reminders), or delete events. 
        The current date and time is ${new Date().toString()}.
        
        Here are the user's current events:
        ${JSON.stringify(simplifiedEvents, null, 2)}
        
        User Request:
        ${text}
        
        Return an array of operations. Each operation must have an 'action' ('create', 'update', or 'delete').
        For 'update' or 'delete', provide the 'eventId' matching an existing event.
        For 'create' or 'update', provide 'eventData' with the relevant fields.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, description: "'create', 'update', or 'delete'" },
                eventId: { type: Type.STRING, description: "The ID of the event to update or delete." },
                eventData: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING },
                    description: { type: Type.STRING },
                    comment: { type: Type.STRING },
                    reminderMinutes: { type: Type.NUMBER },
                    reminderChime: { type: Type.BOOLEAN }
                  }
                }
              },
              required: ["action"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Could not extract any operations from the request.");
      }

      setParsedOperations(data);
    } catch (err: any) {
      setError(err.message || "Failed to parse request.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedOperations || parsedOperations.length === 0) return;
    setLoading(true);
    try {
      for (const op of parsedOperations) {
        if (op.action === 'create' && op.eventData) {
          const newEvent: any = { ...op.eventData };
          if (newEvent.startTime) newEvent.startTime = new Date(newEvent.startTime);
          if (newEvent.endTime) newEvent.endTime = new Date(newEvent.endTime);
          await addEvent(newEvent);
        } else if (op.action === 'update' && op.eventId && op.eventData) {
          const updates: any = { ...op.eventData };
          if (updates.startTime) updates.startTime = new Date(updates.startTime);
          if (updates.endTime) updates.endTime = new Date(updates.endTime);
          await updateEvent(op.eventId, updates);
        } else if (op.action === 'delete' && op.eventId) {
          await deleteEvent(op.eventId);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute operations.");
      setLoading(false);
    }
  };

  const getEventTitle = (id: string) => {
    const evt = events.find(e => e.id === id);
    return evt ? evt.title : 'Unknown Event';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          Smart Assistant
        </h2>
        
        {!parsedOperations ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tell me what you want to do with your calendar. You can add new events, update existing ones, or delete them.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Add 30min reminders to all events for the rest of the week, or Let's meet for coffee tomorrow at 3pm."
              className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Process Request'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-semibold text-slate-800">Found {parsedOperations.length} Action{parsedOperations.length !== 1 ? 's' : ''}:</h3>
            {parsedOperations.map((op, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {op.action === 'create' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md uppercase"><Plus className="w-3 h-3" /> Create</span>}
                  {op.action === 'update' && <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md uppercase"><Edit2 className="w-3 h-3" /> Update</span>}
                  {op.action === 'delete' && <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md uppercase"><Trash2 className="w-3 h-3" /> Delete</span>}
                </div>
                
                {op.action === 'create' && op.eventData && (
                  <>
                    <div><span className="text-xs font-semibold text-slate-500">Title:</span> <span className="font-medium">{op.eventData.title}</span></div>
                    {op.eventData.startTime && <div><span className="text-xs font-semibold text-slate-500">Start:</span> {new Date(op.eventData.startTime).toLocaleString()}</div>}
                  </>
                )}
                
                {op.action === 'update' && (
                  <>
                    <div><span className="text-xs font-semibold text-slate-500">Target Event:</span> <span className="font-medium">{getEventTitle(op.eventId)}</span></div>
                    <div className="text-sm text-slate-600 mt-2">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Updates:</span>
                      <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto text-xs">
                        {JSON.stringify(op.eventData, null, 2)}
                      </pre>
                    </div>
                  </>
                )}

                {op.action === 'delete' && (
                  <div><span className="text-xs font-semibold text-slate-500">Target Event:</span> <span className="font-medium">{getEventTitle(op.eventId)}</span></div>
                )}
              </div>
            ))}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
              <button
                onClick={() => setParsedOperations(null)}
                className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Edit Text
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Execute ${parsedOperations.length} Action${parsedOperations.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
