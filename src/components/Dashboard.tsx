import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useCalendar } from '../CalendarContext';
import { LogOut, Calendar as CalendarIcon, Mic, Plus, Share2, Settings, Volume2, Upload, FileJson, FileSpreadsheet, FileText, Link, Sparkles } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { GoogleGenAI, Type } from '@google/genai';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AnimatedAvatar from './AnimatedAvatar';
import UploadModal from './UploadModal';
import SmartAddModal from './SmartAddModal';
import ReminderSystem from './ReminderSystem';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const localizer = momentLocalizer(moment);

export default function Dashboard() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { events, loading, addEvent } = useCalendar();
  const [greetingShown, setGreetingShown] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDictateModal, setShowDictateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSmartAddModal, setShowSmartAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);

  const applyVoice = (utterance: SpeechSynthesisUtterance) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    
    const preference = profile?.voicePreference || 'female';
    
    let voice = null;
    if (preference === 'male') {
      voice = voices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('guy') || 
        v.name.toLowerCase().includes('david') || 
        v.name.toLowerCase().includes('mark') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('arthur')
      );
      if (!voice) {
        voice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Google US English Male'));
      }
    } else {
      voice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('girl') || 
        v.name.toLowerCase().includes('zira') || 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        v.name.toLowerCase().includes('karen')
      );
      if (!voice) {
        voice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Google US English Female'));
      }
    }
    
    if (voice) {
      utterance.voice = voice;
    }
  };

  const speak = (text: string | string[]) => {
    window.speechSynthesis.cancel();
    
    if (Array.isArray(text)) {
      if (text.length === 0) return;
      
      let currentIndex = 0;
      
      const playNext = () => {
        if (currentIndex >= text.length) {
          setIsSpeaking(false);
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text[currentIndex]);
        applyVoice(utterance);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          currentIndex++;
          if (currentIndex < text.length) {
            setIsSpeaking(false);
            setTimeout(playNext, 1000); // 1-second delay
          } else {
            setIsSpeaking(false);
          }
        };
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      };
      
      playNext();
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      applyVoice(utterance);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // Trigger voice loading
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  useEffect(() => {
    if (!profile || loading || greetingShown) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    if (profile.lastGreetingDate !== today) {
      const todayEvents = events.filter(e => isToday(e.startTime));
      const message = `Hello ${profile.displayName || 'User'}, How are you today? You have ${todayEvents.length} appointments today. Do you want to update your Calendar Appointment?`;
      
      speak(message);
      
      alert(message);
      
      setTimeout(() => {
        const weekEvents = events.filter(e => isThisWeek(e.startTime) && !isToday(e.startTime));
        if (weekEvents.length > 0) {
          const askDictate = window.confirm('Do you want your appointments for the rest of the week dictated to you?');
          if (askDictate) {
            const dictationParts = ['For the rest of the week, you have: '];
            weekEvents.forEach(e => {
              dictationParts.push(`${e.title} on ${format(e.startTime, 'EEEE')} at ${format(e.startTime, 'h:mm a')}.`);
            });
            speak(dictationParts);
          }
        }
      }, 5000);

      updateProfile({ lastGreetingDate: today });
      setGreetingShown(true);
    }
  }, [profile, loading, events, greetingShown, updateProfile]);

  const components = React.useMemo(() => ({
    dateCellWrapper: ({ value, children }: any) => {
      return React.cloneElement(children as React.ReactElement, {
        className: `${(children as React.ReactElement).props.className} cursor-pointer hover:bg-slate-100 transition-colors`,
      });
    },
    month: {
      dateHeader: ({ date, label }: any) => {
        const hasEvents = events.some(e => 
          moment(e.startTime).isSame(date, 'day') || moment(e.endTime).isSame(date, 'day') || (moment(e.startTime).isBefore(date) && moment(e.endTime).isAfter(date))
        );
        return (
          <div className="flex flex-col items-center justify-center p-1 pointer-events-none">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <div className="h-2 mt-1">
              {hasEvents && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>}
            </div>
          </div>
        );
      }
    }
  }), [events, setDate, setView]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const calendarEvents = view === Views.MONTH ? [] : events.map(e => ({
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
              <Link className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Settings"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Your Calendar</h1>
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setShowSmartAddModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="truncate">Smart Add</span>
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Upload className="h-4 w-4" />
              <span className="truncate">Upload</span>
            </button>
            <button 
              onClick={() => setShowDictateModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Volume2 className="h-4 w-4" />
              <span className="truncate">Dictate Agenda</span>
            </button>
            <button 
              onClick={() => setShowEventModal(true)}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="truncate">New Event</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 min-h-[600px]">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            components={components}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            views={['month', 'week', 'day', 'agenda']}
            onSelectEvent={(event) => setSelectedEvent(event.resource)}
            selectable={true}
            onDrillDown={(date) => {
              if (view === Views.MONTH) {
                const hasEvents = events.some(e => 
                  moment(e.startTime).isSame(date, 'day') || moment(e.endTime).isSame(date, 'day') || (moment(e.startTime).isBefore(date) && moment(e.endTime).isAfter(date))
                );
                if (hasEvents) {
                  setDate(date);
                  setView(Views.DAY);
                }
              } else {
                setDate(date);
                setView(Views.DAY);
              }
            }}
            onSelectSlot={(slotInfo) => {
              if (view === Views.MONTH && slotInfo.action === 'click') {
                const hasEvents = events.some(e => 
                  moment(e.startTime).isSame(slotInfo.start, 'day') || moment(e.endTime).isSame(slotInfo.start, 'day') || (moment(e.startTime).isBefore(slotInfo.start) && moment(e.endTime).isAfter(slotInfo.start))
                );
                if (hasEvents) {
                  setDate(slotInfo.start);
                  setView(Views.DAY);
                }
              }
            }}
          />
        </div>
      </main>

      {showVoiceAssistant && (
        <VoiceAssistantModal onClose={() => setShowVoiceAssistant(false)} speak={speak} />
      )}
      
      {showEventModal && (
        <EventModal onClose={() => setShowEventModal(false)} />
      )}

      {selectedEvent && (
        <EditEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {showIntegrations && (
        <IntegrationsModal onClose={() => setShowIntegrations(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showDictateModal && (
        <DictateModal onClose={() => setShowDictateModal(false)} events={events} speak={speak} />
      )}

      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}

      {showSmartAddModal && (
        <SmartAddModal onClose={() => setShowSmartAddModal(false)} />
      )}

      <ReminderSystem />

      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <AnimatedAvatar isSpeaking={isSpeaking} />
      </div>
    </div>
  );
}

function IntegrationsModal({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [clientIdInput, setClientIdInput] = useState('');

  const handleConnect = async (provider: string, clientId?: string) => {
    setConnecting(provider);
    try {
      let url = '';
      if (provider === 'Google Calendar') {
        const res = await fetch(`/api/auth/google/url?clientId=${encodeURIComponent(clientId || '')}`);
        const data = await res.json();
        url = data.url;
      } else if (provider === 'Microsoft 365' || provider === 'Microsoft Exchange') {
        const res = await fetch(`/api/auth/microsoft/url?clientId=${encodeURIComponent(clientId || '')}`);
        const data = await res.json();
        url = data.url;
      } else if (provider === 'Apple Calendar') {
        const res = await fetch('/api/auth/apple/url');
        const data = await res.json();
        url = data.url;
      }

      if (url === '/apple-auth-instructions') {
        alert('To connect Apple Calendar, please generate an App-Specific Password at appleid.apple.com and enter it in the settings.');
        setConnecting(null);
        return;
      }

      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
        setConnecting(null);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Failed to initiate connection.');
      setConnecting(null);
    }
  };

  const handleSaveConfigAndConnect = async (provider: string) => {
    if (!clientIdInput.trim() && provider !== 'Apple Calendar') {
      alert('Client ID is required');
      return;
    }
    
    const newConfigs = {
      ...(profile?.integrationConfigs || {}),
      [provider]: { clientId: clientIdInput.trim() }
    };
    
    await updateProfile({ integrationConfigs: newConfigs });
    setConfiguring(null);
    handleConnect(provider, clientIdInput.trim());
  };

  const initiateConnection = (provider: string) => {
    const existingConfig = profile?.integrationConfigs?.[provider];
    if (provider !== 'Apple Calendar' && (!existingConfig || !existingConfig.clientId)) {
      setConfiguring(provider);
      setClientIdInput('');
    } else {
      handleConnect(provider, existingConfig?.clientId);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const provider = event.data.provider;
        const currentConnections = profile?.connectedCalendars || [];
        
        let providerName = provider;
        if (provider === 'Google') providerName = 'Google Calendar';
        if (provider === 'Microsoft') providerName = connecting === 'Microsoft Exchange' ? 'Microsoft Exchange' : 'Microsoft 365';

        if (!currentConnections.includes(providerName)) {
          updateProfile({ connectedCalendars: [...currentConnections, providerName] });
        }
        setConnecting(null);
        alert(`Successfully connected to ${providerName}!`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [profile, updateProfile, connecting]);

  const providers = ['Google Calendar', 'Apple Calendar', 'Microsoft 365', 'Microsoft Exchange'];
  const connected = profile?.connectedCalendars || [];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Calendar Integrations</h2>
        <div className="space-y-4">
          {providers.map(provider => {
            const isConnected = connected.includes(provider);
            const isConfiguring = configuring === provider;
            
            return (
              <div key={provider} className="flex flex-col p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{provider}</span>
                  {isConnected ? (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      Connected
                    </span>
                  ) : isConfiguring ? (
                    <button onClick={() => setConfiguring(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  ) : (
                    <button 
                      onClick={() => initiateConnection(provider)}
                      disabled={connecting === provider}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                    >
                      {connecting === provider ? 'Connecting...' : 'Configure & Connect'}
                    </button>
                  )}
                </div>
                
                {isConfiguring && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {provider === 'Apple Calendar' ? 'App-Specific Password' : 'OAuth Client ID'}
                    </label>
                    <input 
                      type="text" 
                      value={clientIdInput}
                      onChange={e => setClientIdInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3 text-sm"
                      placeholder={`Enter your ${provider} Client ID`}
                    />
                    <button 
                      onClick={() => handleSaveConfigAndConnect(provider)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Save & Connect
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
    
    await addEvent({
      title,
      startTime: start,
      endTime: end,
      sharedWith: sharedWith ? sharedWith.split(',').map(s => s.trim()) : [],
      reminderMinutes: reminderMinutes === '' ? undefined : Number(reminderMinutes),
    });
    
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Reminder</label>
            <select
              value={reminderMinutes}
              onChange={e => setReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
            </select>
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

function EditEventModal({ event, onClose }: { event: any, onClose: () => void }) {
  const { updateEvent, deleteEvent } = useCalendar();
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(format(event.startTime, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(event.startTime, 'HH:mm'));
  const [sharedWith, setSharedWith] = useState(event.sharedWith?.join(', ') || '');
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>(event.reminderMinutes || '');

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isConnectedEvent = event.id.startsWith('connected-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnectedEvent) return;
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + (event.endTime.getTime() - event.startTime.getTime()));
    
    await updateEvent(event.id, {
      title,
      startTime: start,
      endTime: end,
      sharedWith: sharedWith ? sharedWith.split(',').map(s => s.trim()) : [],
      reminderMinutes: reminderMinutes === '' ? null : Number(reminderMinutes),
      acknowledged: false, // Reset acknowledgment on edit
      snoozedUntil: null, // Reset snooze on edit
    });
    
    onClose();
  };

  const handleDelete = async () => {
    if (isConnectedEvent) return;
    await deleteEvent(event.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {isConnectedEvent ? 'View Event' : 'Edit Event'}
        </h2>
        {isConnectedEvent && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            This event is synced from an external calendar and cannot be edited here.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input 
              type="text" 
              required
              disabled={isConnectedEvent}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input 
                type="date" 
                required
                disabled={isConnectedEvent}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input 
                type="time" 
                required
                disabled={isConnectedEvent}
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reminder</label>
            <select
              value={reminderMinutes}
              disabled={isConnectedEvent}
              onChange={e => setReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:opacity-50 disabled:bg-slate-50"
            >
              <option value="">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Share with (emails, comma separated)</label>
            <input 
              type="text" 
              disabled={isConnectedEvent}
              value={sharedWith}
              onChange={e => setSharedWith(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>
          {!isConnectedEvent && (
            <div className="flex flex-col gap-3 mt-6">
              {showConfirmDelete ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-sm text-red-800 mb-3 font-medium">Are you sure you want to delete this event?</p>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleDelete}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}
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

function VoiceAssistantModal({ onClose, speak }: { onClose: () => void, speak: (text: string) => void }) {
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
      
      speak(`I've added ${event.title} to your calendar.`);
      
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

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useAuth();
  const [voicePreference, setVoicePreference] = useState<'male' | 'female'>(profile?.voicePreference || 'female');

  const handleSave = async () => {
    await updateProfile({ voicePreference });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Avatar Voice</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="voice" 
                  value="female" 
                  checked={voicePreference === 'female'}
                  onChange={() => setVoicePreference('female')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-slate-700">Woman</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="voice" 
                  value="male" 
                  checked={voicePreference === 'male'}
                  onChange={() => setVoicePreference('male')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-slate-700">Man</span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Note: Voice availability depends on your browser and operating system.
            </p>
          </div>
          
          <button 
            onClick={handleSave}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
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

function DictateModal({ onClose, events, speak }: { onClose: () => void, events: any[], speak: (text: string | string[]) => void }) {
  const handleDictate = (range: 'day' | 'week' | 'month') => {
    const now = new Date();
    let filteredEvents = [];
    let rangeText = '';

    if (range === 'day') {
      filteredEvents = events.filter(e => isToday(e.startTime) && e.startTime >= now);
      rangeText = 'the rest of the day';
    } else if (range === 'week') {
      filteredEvents = events.filter(e => isThisWeek(e.startTime) && e.startTime >= now);
      rangeText = 'the rest of the week';
    } else if (range === 'month') {
      filteredEvents = events.filter(e => isThisMonth(e.startTime) && e.startTime >= now);
      rangeText = 'the rest of the month';
    }

    // Sort events by start time
    filteredEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (filteredEvents.length === 0) {
      speak(`You have no appointments for ${rangeText}.`);
    } else {
      const dictationParts = [`For ${rangeText}, you have ${filteredEvents.length} appointment${filteredEvents.length > 1 ? 's' : ''}.`];
      filteredEvents.forEach(e => {
        const dayStr = isToday(e.startTime) ? 'today' : format(e.startTime, 'EEEE, MMMM do');
        dictationParts.push(`${e.title} ${dayStr} at ${format(e.startTime, 'h:mm a')}.`);
      });
      speak(dictationParts);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Dictate Agenda</h2>
        <p className="text-slate-500 mb-6">Select a timeframe to hear your upcoming appointments.</p>
        <div className="space-y-3">
          <button onClick={() => handleDictate('day')} className="w-full py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
            <Volume2 className="w-5 h-5" /> Rest of the Day
          </button>
          <button onClick={() => handleDictate('week')} className="w-full py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
            <Volume2 className="w-5 h-5" /> Rest of the Week
          </button>
          <button onClick={() => handleDictate('month')} className="w-full py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
            <Volume2 className="w-5 h-5" /> Rest of the Month
          </button>
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
