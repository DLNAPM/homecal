import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCalendar } from '../CalendarContext';
import { LogOut, Calendar as CalendarIcon, Mic, Plus, Share2, Settings } from 'lucide-react';
import { format, isToday, isThisWeek } from 'date-fns';
import { GoogleGenAI, Type } from '@google/genai';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function Dashboard() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { events, loading, addEvent } = useCalendar();
  const [greetingShown, setGreetingShown] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (!profile || loading || greetingShown) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    if (profile.lastGreetingDate !== today) {
      const todayEvents = events.filter(e => isToday(e.startTime));
      const message = `Hello ${profile.displayName || 'User'}, How are you today? You have ${todayEvents.length} appointments today. Do you want to update your Calendar Appointment?`;
      
      const utterance = new SpeechSynthesisUtterance(message);
      window.speechSynthesis.speak(utterance);
      
      alert(message);
      
      setTimeout(() => {
        const weekEvents = events.filter(e => isThisWeek(e.startTime) && !isToday(e.startTime));
        if (weekEvents.length > 0) {
          const askDictate = window.confirm('Do you want your appointments for the rest of the week dictated to you?');
          if (askDictate) {
            let dictation = 'For the rest of the week, you have: ';
            weekEvents.forEach(e => {
              dictation += `${e.title} on ${format(e.startTime, 'EEEE')} at ${format(e.startTime, 'h:mm a')}. `;
            });
            const dictationUtterance = new SpeechSynthesisUtterance(dictation);
            window.speechSynthesis.speak(dictationUtterance);
          }
        }
      }, 5000);

      updateProfile({ lastGreetingDate: today });
      setGreetingShown(true);
    }
  }, [profile, loading, events, greetingShown, updateProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime,
    resource: e
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <CalendarIcon className="h-6 w-6" />
            <span className="text-xl font-bold text-slate-900">HomeCal</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowVoiceAssistant(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <Mic className="h-4 w-4" />
              Voice Assistant
            </button>
            <button
              onClick={() => setShowIntegrations(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Integrations"
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              {profile?.photoURL && (
                <img src={profile.photoURL} alt="Profile" className="h-8 w-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              )}
              <button onClick={signOut} className="text-slate-500 hover:text-slate-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Calendar</h1>
          <button 
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Event
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 min-h-[600px]">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            views={['month', 'week', 'day', 'agenda']}
            onSelectEvent={(event) => alert(`Event: ${event.title}\nShared with: ${event.resource.sharedWith?.join(', ') || 'None'}`)}
          />
        </div>
      </main>

      {showVoiceAssistant && (
        <VoiceAssistantModal onClose={() => setShowVoiceAssistant(false)} />
      )}
      
      {showEventModal && (
        <EventModal onClose={() => setShowEventModal(false)} />
      )}

      {showIntegrations && (
        <IntegrationsModal onClose={() => setShowIntegrations(false)} />
      )}
    </div>
  );
}

function IntegrationsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Calendar Integrations</h2>
        <div className="space-y-4">
          {['Google Calendar', 'Apple Calendar', 'Microsoft 365', 'Microsoft Exchange'].map(provider => (
            <div key={provider} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-700">{provider}</span>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
                Connect
              </button>
            </div>
          ))}
        </div>
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

function EventModal({ onClose }: { onClose: () => void }) {
  const { addEvent } = useCalendar();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [sharedWith, setSharedWith] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
    
    await addEvent({
      title,
      startTime: start,
      endTime: end,
      sharedWith: sharedWith ? sharedWith.split(',').map(s => s.trim()) : [],
    });
    
    if (sharedWith) {
      alert(`Notification sent to ${sharedWith} about the new event: ${title}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">New Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Meeting with Jane"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input 
                type="time" 
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Share with (emails, comma separated)</label>
            <input 
              type="text" 
              value={sharedWith}
              onChange={e => setSharedWith(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="jane@example.com"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors mt-6"
          >
            Save Event
          </button>
        </form>
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

function VoiceAssistantModal({ onClose }: { onClose: () => void }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const { addEvent } = useCalendar();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (transcript) {
        processTranscript(transcript);
      }
    };

    recognition.start();
  };

  const processTranscript = async (text: string) => {
    setProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const now = new Date();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Parse this voice command into a calendar event. Today is ${now.toISOString()}. 
        Command: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'The title of the event' },
              description: { type: Type.STRING, description: 'Optional description' },
              startTimeISO: { type: Type.STRING, description: 'ISO 8601 start time' },
              endTimeISO: { type: Type.STRING, description: 'ISO 8601 end time (default to 1 hour after start if not specified)' }
            },
            required: ['title', 'startTimeISO', 'endTimeISO']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      
      const event = {
        title: parsed.title || text || 'New Voice Appointment',
        description: parsed.description || '',
        startTime: parsed.startTimeISO ? new Date(parsed.startTimeISO) : new Date(now.getTime() + 60 * 60 * 1000),
        endTime: parsed.endTimeISO ? new Date(parsed.endTimeISO) : new Date(now.getTime() + 2 * 60 * 60 * 1000),
      };

      await addEvent(event);
      
      const utterance = new SpeechSynthesisUtterance(`I've added ${event.title} to your calendar.`);
      window.speechSynthesis.speak(utterance);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error processing transcript:', error);
      alert('Failed to process voice command.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Voice Assistant</h2>
        <p className="text-slate-500 mb-8">"Add a meeting with John tomorrow at 2pm"</p>
        
        <div className="relative flex justify-center items-center h-40 mb-8">
          {listening && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="absolute w-24 h-24 bg-blue-200 rounded-full animate-pulse"></div>
            </div>
          )}
          
          <button
            onClick={listening ? undefined : startListening}
            disabled={processing}
            className={`relative z-10 h-20 w-20 rounded-full flex items-center justify-center transition-all ${
              listening 
                ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/30' 
                : processing
                ? 'bg-slate-200 text-slate-400'
                : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl'
            }`}
          >
            <Mic className={`h-8 w-8 ${listening ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="min-h-[60px] flex items-center justify-center">
          {transcript ? (
            <p className="text-lg text-slate-700 font-medium">"{transcript}"</p>
          ) : processing ? (
            <p className="text-blue-600 font-medium animate-pulse">Processing with AI...</p>
          ) : (
            <p className="text-slate-400">Tap the microphone to speak</p>
          )}
        </div>

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
