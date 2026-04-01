import React, { useState } from 'react';
import { useCalendar } from '../CalendarContext';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';

export default function SmartAddModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedEvent, setParsedEvent] = useState<any>(null);
  const { addEvent } = useCalendar();

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract appointment details from the following text. The current date and time is ${new Date().toString()}.
        
        Text:
        ${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The title of the event" },
              startTime: { type: Type.STRING, description: "The start time of the event in ISO 8601 format" },
              endTime: { type: Type.STRING, description: "The end time of the event in ISO 8601 format (optional)" },
              description: { type: Type.STRING, description: "Any additional details, including location if mentioned." }
            },
            required: ["title", "startTime"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (!data.title || !data.startTime) {
        throw new Error("Could not extract event details.");
      }

      setParsedEvent({
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        description: data.description || ''
      });
    } catch (err: any) {
      setError(err.message || "Failed to parse event details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedEvent) return;
    setLoading(true);
    try {
      await addEvent(parsedEvent);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add event.");
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
        
        {!parsedEvent ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Paste a text message, email, or any text containing event details. We'll automatically extract the title, date, and time.
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
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Title</span>
                <p className="font-medium text-slate-900">{parsedEvent.title}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Start Time</span>
                <p className="text-slate-700">{parsedEvent.startTime.toLocaleString()}</p>
              </div>
              {parsedEvent.endTime && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">End Time</span>
                  <p className="text-slate-700">{parsedEvent.endTime.toLocaleString()}</p>
                </div>
              )}
              {parsedEvent.description && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Description / Location</span>
                  <p className="text-slate-700">{parsedEvent.description}</p>
                </div>
              )}
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setParsedEvent(null)}
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add to Calendar'}
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
