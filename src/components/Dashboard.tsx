import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useCalendar } from '../CalendarContext';
import { LogOut, Calendar as CalendarIcon, Mic, Plus, Share2, Settings, Volume2, Upload, FileJson, FileSpreadsheet, FileText, Link, Sparkles, HelpCircle, Users, Shield, ScanFace } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { GoogleGenAI, Type } from '@google/genai';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AnimatedAvatar from './AnimatedAvatar';
import UploadModal from './UploadModal';
import SmartAddModal from './SmartAddModal';
import ReminderSystem from './ReminderSystem';
import PendingInvites from './PendingInvites';
import HelpModal from './HelpModal';
import GroupsModal from './GroupsModal';
import AdminModal from './AdminModal';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const localizer = momentLocalizer(moment);

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, lockWithFaceId } = useAuth();
  const { events, loading, addEvent } = useCalendar();
  const [greetingShown, setGreetingShown] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDictateModal, setShowDictateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSmartAddModal, setShowSmartAddModal] = useState(false);
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [greetingData, setGreetingData] = useState<{ message: string, todayEvents: any[], weekEvents: any[] } | null>(null);
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

  const speak = (text: string | string[]): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      
      if (Array.isArray(text)) {
        if (text.length === 0) {
          resolve();
          return;
        }
        
        let currentIndex = 0;
        
        const playNext = () => {
          if (currentIndex >= text.length) {
            setIsSpeaking(false);
            resolve();
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
              resolve();
            }
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        };
        
        playNext();
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        applyVoice(utterance);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      }
    });
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
      const message = `Hello ${profile.displayName || 'User'}, How are you today? You have ${todayEvents.length} appointments today. Do you want to hear your appointments for today?`;
      const weekEvents = events.filter(e => isThisWeek(e.startTime) && !isToday(e.startTime));
      
      setGreetingData({ message, todayEvents, weekEvents });
      setShowGreetingModal(true);

      updateProfile({ lastGreetingDate: today });
      setGreetingShown(true);
    }
  }, [profile, loading, events, greetingShown, updateProfile]);

  const components = React.useMemo(() => ({
    dateCellWrapper: ({ value, children }: any) => {
      const hasEvents = events.some(e => 
        moment(e.startTime).isSame(value, 'day') || (e.endTime && moment(e.endTime).isSame(value, 'day')) || (e.endTime && moment(e.startTime).isBefore(value) && moment(e.endTime).isAfter(value))
      );

      return React.cloneElement(children as React.ReactElement<any>, {
        className: `${(children as React.ReactElement<any>).props.className} relative cursor-pointer hover:bg-slate-50 transition-colors`,
        onClick: (e: React.MouseEvent) => {
          if ((children as React.ReactElement<any>).props.onClick) {
            (children as React.ReactElement<any>).props.onClick(e);
          }
          if (hasEvents) {
            setDate(value);
            setView(Views.DAY);
          }
        },
        children: (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-6">
            {hasEvents && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>}
          </div>
        )
      });
    }
  }), [events]);

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
    end: e.endTime || new Date(e.startTime.getTime() + 60 * 60 * 1000),
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
              onClick={() => setShowGroups(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Manage Groups"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Help & Information"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              {user?.email === 'dlaniger.napm.consulting@gmail.com' && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-1"
                  title="Admin Dashboard"
                >
                  <Shield className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">Admin</span>
                </button>
              )}
              {profile?.photoURL && (
                <img src={profile.photoURL} alt="Profile" className="h-8 w-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              )}
              {profile?.isPremium && (
                <button onClick={lockWithFaceId} className="text-slate-500 hover:text-indigo-600 transition-colors" title="Lock with Face ID">
                  <ScanFace className="h-5 w-5" />
                </button>
              )}
              <button onClick={signOut} className="text-slate-500 hover:text-red-600 transition-colors" title="Sign Out">
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 min-h-[600px] flex flex-col">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            components={components}
            startAccessor="start"
            endAccessor="end"
            style={{ flex: 1, minHeight: '500px' }}
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
                  moment(e.startTime).isSame(date, 'day') || (e.endTime && moment(e.endTime).isSame(date, 'day')) || (e.endTime && moment(e.startTime).isBefore(date) && moment(e.endTime).isAfter(date))
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
                  moment(e.startTime).isSame(slotInfo.start, 'day') || (e.endTime && moment(e.endTime).isSame(slotInfo.start, 'day')) || (e.endTime && moment(e.startTime).isBefore(slotInfo.start) && moment(e.endTime).isAfter(slotInfo.start))
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

      {showGreetingModal && greetingData && (
        <GreetingModal 
          message={greetingData.message}
          todayEvents={greetingData.todayEvents}
          weekEvents={greetingData.weekEvents}
          speak={speak}
          onClose={() => setShowGreetingModal(false)}
        />
      )}

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      {showGroups && <GroupsModal onClose={() => setShowGroups(false)} />}
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}

      <ReminderSystem />
      <PendingInvites />

      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <AnimatedAvatar isSpeaking={isSpeaking} />
      </div>
    </div>
  );
}

function GreetingModal({ message, todayEvents, weekEvents, speak, onClose }: { message: string, todayEvents: any[], weekEvents: any[], speak: (text: string | string[]) => Promise<void>, onClose: () => void }) {
  const [step, setStep] = useState<'init' | 'today' | 'week' | 'done'>('init');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const isCancelled = useRef(false);

  useEffect(() => {
    return () => {
      isCancelled.current = true;
      window.speechSynthesis.cancel();
    };
  }, []);

  const startListeningForResponse = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isCancelled.current) {
        resolve(false);
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalResult = '';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalResult += event.results[i][0].transcript;
          } else {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalResult || currentTranscript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        resolve(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isCancelled.current) {
          resolve(false);
          return;
        }
        const lowerResult = finalResult.toLowerCase();
        if (lowerResult.includes('yes') || lowerResult.includes('yeah') || lowerResult.includes('sure') || lowerResult.includes('yep') || lowerResult.includes('ok') || lowerResult.includes('please')) {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      recognition.start();
    });
  };

  const handleStart = async () => {
    setStep('today');
    await speak(message);
    if (isCancelled.current) return;
    
    const wantsToday = await startListeningForResponse();
    if (isCancelled.current) return;
    
    if (wantsToday) {
      if (todayEvents.length > 0) {
        const todayDictation = ['For today, you have: '];
        todayEvents.forEach((e: any) => {
          todayDictation.push(`${e.title} at ${format(e.startTime, 'h:mm a')}.`);
        });
        await speak(todayDictation);
      } else {
        await speak("You have no appointments today.");
      }
    }
    if (isCancelled.current) return;
    
    if (weekEvents.length > 0) {
      setStep('week');
      await speak("Do you want your appointments for the rest of the week dictated to you?");
      if (isCancelled.current) return;
      
      const wantsWeek = await startListeningForResponse();
      if (isCancelled.current) return;
      
      if (wantsWeek) {
        const weekDictation = ['For the rest of the week, you have: '];
        weekEvents.forEach((e: any) => {
          weekDictation.push(`${e.title} on ${format(e.startTime, 'EEEE')} at ${format(e.startTime, 'h:mm a')}.`);
        });
        await speak(weekDictation);
      }
    }
    if (isCancelled.current) return;
    
    await speak("Okay, have a great day!");
    if (!isCancelled.current) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {step === 'init' ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome!</h2>
            <p className="text-slate-600 mb-8">You have new updates for today.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Start Daily Briefing
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {step === 'today' ? "Today's Briefing" : "Week's Briefing"}
            </h2>
            <div className="flex flex-col items-center justify-center py-8 min-h-[200px]">
              {isListening ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Mic className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-blue-600 font-medium">Listening for your response...</p>
                  {transcript && <p className="text-slate-500 mt-4 italic">"{transcript}"</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Volume2 className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-600 font-medium">Speaking...</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                onClose();
              }}
              className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </>
        )}
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
  const { addEvent, groups } = useCalendar();
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState('13:00');
  const [sharedWith, setSharedWith] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>('');
  const [reminderChime, setReminderChime] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}`);
    const end = hasEndTime ? new Date(`${endDate}T${endTime}`) : undefined;
    
    await addEvent({
      title,
      comment,
      startTime: start,
      endTime: end,
      sharedWith: sharedWith ? sharedWith.split(',').map(s => s.trim()) : [],
      reminderMinutes: reminderMinutes === '' ? undefined : Number(reminderMinutes),
      reminderChime,
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comment / Details</label>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-20"
              placeholder="Extra details about the event..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
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
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEndTime}
                onChange={e => setHasEndTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              Has End Time
            </label>
            {hasEndTime && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    required={hasEndTime}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required={hasEndTime}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reminder</label>
            <div className="flex items-center gap-4">
              <select
                value={reminderMinutes}
                onChange={e => setReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">No reminder</option>
                <option value="5">5 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
              {reminderMinutes !== '' && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderChime}
                    onChange={e => setReminderChime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  Play Chime
                </label>
              )}
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
            {groups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const currentEmails = sharedWith ? sharedWith.split(',').map(s => s.trim()).filter(s => s) : [];
                      const newEmails = g.members.filter(m => !currentEmails.includes(m));
                      if (newEmails.length > 0) {
                        setSharedWith([...currentEmails, ...newEmails].join(', '));
                      }
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors border border-slate-200"
                  >
                    + {g.name}
                  </button>
                ))}
              </div>
            )}
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
  const { updateEvent, deleteEvent, groups } = useCalendar();
  const [title, setTitle] = useState(event.title);
  const [comment, setComment] = useState(event.comment || '');
  const [date, setDate] = useState(format(event.startTime, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(event.startTime, 'HH:mm'));
  const [hasEndTime, setHasEndTime] = useState(!!event.endTime);
  const [endDate, setEndDate] = useState(event.endTime ? format(event.endTime, 'yyyy-MM-dd') : format(event.startTime, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(event.endTime ? format(event.endTime, 'HH:mm') : format(new Date(event.startTime.getTime() + 60 * 60 * 1000), 'HH:mm'));
  const [sharedWith, setSharedWith] = useState(event.sharedWith?.join(', ') || '');
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>(event.reminderMinutes || '');
  const [reminderChime, setReminderChime] = useState(event.reminderChime || false);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isConnectedEvent = event.id.startsWith('connected-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnectedEvent) return;
    const start = new Date(`${date}T${time}`);
    const end = hasEndTime ? new Date(`${endDate}T${endTime}`) : null;
    
    await updateEvent(event.id, {
      title,
      comment,
      startTime: start,
      endTime: end,
      sharedWith: sharedWith ? sharedWith.split(',').map(s => s.trim()) : [],
      reminderMinutes: reminderMinutes === '' ? null : Number(reminderMinutes),
      reminderChime,
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comment / Details</label>
            <textarea 
              disabled={isConnectedEvent}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-20 disabled:opacity-50 disabled:bg-slate-50"
              placeholder="Extra details about the event..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
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
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isConnectedEvent}
                checked={hasEndTime}
                onChange={e => setHasEndTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
              />
              Has End Time
            </label>
            {hasEndTime && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    required={hasEndTime}
                    disabled={isConnectedEvent}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required={hasEndTime}
                    disabled={isConnectedEvent}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reminder</label>
            <div className="flex items-center gap-4">
              <select
                value={reminderMinutes}
                disabled={isConnectedEvent}
                onChange={e => setReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                <option value="">No reminder</option>
                <option value="5">5 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
              {reminderMinutes !== '' && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isConnectedEvent}
                    checked={reminderChime}
                    onChange={e => setReminderChime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                  />
                  Play Chime
                </label>
              )}
            </div>
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
            {!isConnectedEvent && groups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const currentEmails = sharedWith ? sharedWith.split(',').map(s => s.trim()).filter(s => s) : [];
                      const newEmails = g.members.filter(m => !currentEmails.includes(m));
                      if (newEmails.length > 0) {
                        setSharedWith([...currentEmails, ...newEmails].join(', '));
                      }
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors border border-slate-200"
                  >
                    + {g.name}
                  </button>
                ))}
              </div>
            )}
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
  const transcriptRef = useRef('');
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
      transcriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
      transcriptRef.current = fullTranscript;
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (transcriptRef.current) {
        processTranscript(transcriptRef.current);
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
        contents: `Parse this voice command into calendar events. If multiple days or distinct events are mentioned, create multiple events. Today is ${now.toISOString()}. 
        Command: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'The title of the event' },
                description: { type: Type.STRING, description: 'Optional description' },
                comment: { type: Type.STRING, description: 'Extra details or comments about the event' },
                startTimeISO: { type: Type.STRING, description: 'ISO 8601 start time' },
                endTimeISO: { type: Type.STRING, description: 'ISO 8601 end time (optional)' }
              },
              required: ['title', 'startTimeISO']
            }
          }
        }
      });

      let responseText = response.text || '[]';
      // Strip markdown code blocks if present
      if (responseText.startsWith('```')) {
        const match = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          responseText = match[1];
        } else {
          responseText = responseText.replace(/```(?:json)?\n/g, '').replace(/\n```/g, '');
        }
      }
      
      const parsed = JSON.parse(responseText);
      const eventsData = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const evtData of eventsData) {
        if (!evtData.title && !evtData.startTimeISO && eventsData.length === 1) {
           evtData.title = text || 'New Voice Appointment';
        }
        
        const event = {
          title: evtData.title || 'New Voice Appointment',
          description: evtData.description || '',
          comment: evtData.comment || '',
          startTime: evtData.startTimeISO ? new Date(evtData.startTimeISO) : new Date(now.getTime() + 60 * 60 * 1000),
          endTime: evtData.endTimeISO ? new Date(evtData.endTimeISO) : undefined,
        };

        await addEvent(event);
      }
      
      if (eventsData.length > 1) {
        speak(`I've added ${eventsData.length} events to your calendar.`);
      } else if (eventsData.length === 1) {
        speak(`I've added ${eventsData[0].title || 'the event'} to your calendar.`);
      }
      
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
