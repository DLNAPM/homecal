import React, { useState } from 'react';
import { useCalendar } from '../CalendarContext';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';

export default function SmartAddModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedEvents, setParsedEvents] = useState<any[] | null>(null);
  const { addEvent } = useCalendar();

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract appointment details from the following text. If there is more than 1 day mentioned or multiple distinct events, create multiple events. The current date and time is ${new Date().toString()}.
        
        Text:
        ${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The title of the event" },
                startTime: { type: Type.STRING, description: "The start time of the event in ISO 8601 format" },
                endTime: { type: Type.STRING, description: "The end time of the event in ISO 8601 format (optional)" },
                description: { type: Type.STRING, description: "Any additional details, including location if mentioned." },
                comment: { type: Type.STRING, description: "Extra details or comments about the event." }
              },
              required: ["title", "startTime"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Could not extract event details.");
      }

      const events = data.map((evt: any) => ({
        title: evt.title,
        startTime: new Date(evt.startTime),
        endTime: evt.endTime ? new Date(evt.endTime) : undefined,
        description: evt.description || '',
        comment: evt.comment || ''
      }));

      setParsedEvents(events);
    } catch (err: any) {
      setError(err.message || "Failed to parse event details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedEvents || parsedEvents.length === 0) return;
    setLoading(true);
    try {
      for (const evt of parsedEvents) {
        await addEvent(evt);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add events.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          Smart Add Event
        </h2>
        
        {!parsedEvents ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Paste a text message, email, or any text containing event details. We'll automatically extract the title, date, and time. If multiple days or events are mentioned, we'll create multiple events.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Let's meet for coffee tomorrow at 3pm at Starbucks on Main St."
              className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Parse Details'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-semibold text-slate-800">Found {parsedEvents.length} Event{parsedEvents.length !== 1 ? 's' : ''}:</h3>
            {parsedEvents.map((evt, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Title</span>
                  <p className="font-medium text-slate-900">{evt.title}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Start Time</span>
                  <p className="text-slate-700">{evt.startTime.toLocaleString()}</p>
                </div>
                {evt.endTime && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">End Time</span>
                    <p className="text-slate-700">{evt.endTime.toLocaleString()}</p>
                  </div>
                )}
                {evt.description && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Description / Location</span>
                    <p className="text-slate-700">{evt.description}</p>
                  </div>
                )}
                {evt.comment && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Comment</span>
                    <p className="text-slate-700">{evt.comment}</p>
                  </div>
                )}
              </div>
            ))}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
              <button
                onClick={() => setParsedEvents(null)}
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Add ${parsedEvents.length} Event${parsedEvents.length !== 1 ? 's' : ''}`}
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
