import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Group, CalendarEvent } from './types';

interface CalendarContextType {
  events: CalendarEvent[];
  pendingEvents: CalendarEvent[];
  groups: Group[];
  loading: boolean;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'ownerId'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addGroup: (group: Omit<Group, 'id' | 'ownerId'>) => Promise<void>;
  updateGroup: (id: string, group: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  acknowledgeSharedEvent: (event: CalendarEvent) => Promise<void>;
  declineSharedEvent: (event: CalendarEvent) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<CalendarEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setPendingEvents([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    const generateMockConnectedEvents = () => {
      if (!profile?.connectedCalendars || profile.connectedCalendars.length === 0) return [];
      const now = new Date();
      const mockConnectedEvents: CalendarEvent[] = [];
      
      profile.connectedCalendars.forEach((provider, index) => {
        mockConnectedEvents.push({
          id: `connected-${provider}-${index}`,
          ownerId: user.uid,
          title: `Sync: ${provider} Meeting`,
          description: `Imported from ${provider}`,
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + index, 9 + index, 0),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + index, 10 + index, 0),
        });
      });
      return mockConnectedEvents;
    };

    if (user.isAnonymous) {
      // Load test data for guest user
      const now = new Date();
      const baseEvents = [
        {
          id: 'test-1',
          ownerId: user.uid,
          title: 'Welcome to HomeCal!',
          description: 'This is a test event for your guest session.',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 2, 0),
        },
        {
          id: 'test-2',
          ownerId: user.uid,
          title: 'Project Sync',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 4, 30),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 5, 0),
        },
        {
          id: 'test-3',
          ownerId: user.uid,
          title: 'Lunch with Team',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 30),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 13, 30),
          sharedWith: ['team@example.com']
        },
        {
          id: 'test-4',
          ownerId: user.uid,
          title: 'Weekly Review',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 11, 0),
        },
        {
          id: 'test-5',
          ownerId: user.uid,
          title: 'Dentist Appointment',
          startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 15, 0),
          endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 16, 0),
        }
      ];
      setEvents([...baseEvents, ...generateMockConnectedEvents()]);
      setGroups([
        { id: 'group-1', ownerId: user.uid, name: 'Family', members: ['spouse@example.com', 'kid@example.com'] },
        { id: 'group-2', ownerId: user.uid, name: 'Work Team', members: ['boss@example.com', 'colleague@example.com'] }
      ]);
      setLoading(false);
      return;
    }

    const q1 = query(
      collection(db, 'events'),
      where('ownerId', '==', user.uid)
    );
    
    const q2 = query(
      collection(db, 'events'),
      where('sharedWith', 'array-contains', user.email)
    );

    // We need to listen to both queries and merge the results
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const newEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: (data.startTime as Timestamp).toDate(),
          endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
          snoozedUntil: data.snoozedUntil ? (data.snoozedUntil as Timestamp).toDate() : undefined,
        } as CalendarEvent;
      });
      
      setEvents(prev => {
        const others = prev.filter(e => e.ownerId !== user.uid && !e.id.startsWith('connected-'));
        const merged = [...newEvents, ...others, ...generateMockConnectedEvents()];
        // Remove duplicates just in case
        return Array.from(new Map(merged.map(item => [item.id, item])).values());
      });
      setLoading(false);
    }, (error) => {
      console.error('Error fetching owned events:', error);
      setLoading(false);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const sharedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: (data.startTime as Timestamp).toDate(),
          endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
          snoozedUntil: data.snoozedUntil ? (data.snoozedUntil as Timestamp).toDate() : undefined,
        } as CalendarEvent;
      });
      
      const accepted = sharedEvents.filter(e => e.ownerId === user.uid || (e.acknowledgedBy || []).includes(user.email!));
      const pending = sharedEvents.filter(e => e.ownerId !== user.uid && !(e.acknowledgedBy || []).includes(user.email!));

      setPendingEvents(pending);

      setEvents(prev => {
        const others = prev.filter(e => e.ownerId === user.uid || e.id.startsWith('connected-'));
        const merged = [...others, ...accepted];
        // Remove duplicates just in case
        return Array.from(new Map(merged.map(item => [item.id, item])).values());
      });
    }, (error) => {
      console.error('Error fetching shared events:', error);
    });

    const q3 = query(
      collection(db, 'groups'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe3 = onSnapshot(q3, (snapshot) => {
      const newGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(newGroups);
    }, (error) => {
      console.error('Error fetching groups:', error);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, [user, profile?.connectedCalendars]);

  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'ownerId'>) => {
    if (!user) return;
    
    // Auto-share with groups that have shareAllEvents enabled
    const autoShareEmails = new Set<string>(event.sharedWith || []);
    groups.forEach(g => {
      if (g.shareAllEvents) {
        g.members.forEach(m => autoShareEmails.add(m));
      }
    });
    const finalSharedWith = Array.from(autoShareEmails);

    if (user.isAnonymous) {
      const newEvent: CalendarEvent = {
        ...event,
        sharedWith: finalSharedWith,
        id: `guest-${Date.now()}`,
        ownerId: user.uid,
      };
      setEvents(prev => [...prev, newEvent]);
      return;
    }

    try {
      const eventData: any = {
        ...event,
        sharedWith: finalSharedWith,
        ownerId: user.uid,
        startTime: Timestamp.fromDate(event.startTime),
      };
      if (event.endTime) {
        eventData.endTime = Timestamp.fromDate(event.endTime);
      }
      if (event.snoozedUntil) {
        eventData.snoozedUntil = Timestamp.fromDate(event.snoozedUntil);
      }
      
      // Remove undefined fields to prevent Firestore errors
      Object.keys(eventData).forEach(key => eventData[key] === undefined && delete eventData[key]);

      await addDoc(collection(db, 'events'), eventData);
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const updateEvent = async (id: string, event: Partial<CalendarEvent>) => {
    if (!user || id.startsWith('connected-')) return;

    // Auto-share with groups that have shareAllEvents enabled
    let finalSharedWith = event.sharedWith;
    if (event.sharedWith !== undefined) {
      const autoShareEmails = new Set<string>(event.sharedWith || []);
      groups.forEach(g => {
        if (g.shareAllEvents) {
          g.members.forEach(m => autoShareEmails.add(m));
        }
      });
      finalSharedWith = Array.from(autoShareEmails);
    }

    if (user.isAnonymous) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...event, ...(finalSharedWith !== undefined && { sharedWith: finalSharedWith }) } : e));
      return;
    }

    try {
      const docRef = doc(db, 'events', id);
      const updateData: any = { ...event };
      if (finalSharedWith !== undefined) updateData.sharedWith = finalSharedWith;
      if (event.startTime) updateData.startTime = Timestamp.fromDate(event.startTime);
      if (event.endTime) {
        updateData.endTime = Timestamp.fromDate(event.endTime);
      } else if (event.endTime === null) {
        updateData.endTime = null;
      }
      if (event.snoozedUntil) {
        updateData.snoozedUntil = Timestamp.fromDate(event.snoozedUntil);
      } else if (event.snoozedUntil === null) {
        updateData.snoozedUntil = null;
      }
      if (event.reminderMinutes === null) {
        updateData.reminderMinutes = null;
      }

      // Remove undefined fields to prevent Firestore errors
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user || id.startsWith('connected-')) return;

    if (user.isAnonymous) {
      setEvents(prev => prev.filter(e => e.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const addGroup = async (group: Omit<Group, 'id' | 'ownerId'>) => {
    if (!user) return;
    
    if (user.isAnonymous) {
      const newGroup: Group = {
        ...group,
        id: `guest-group-${Date.now()}`,
        ownerId: user.uid,
      };
      setGroups(prev => [...prev, newGroup]);
      
      if (group.shareAllEvents && group.members.length > 0) {
        setEvents(prev => prev.map(e => {
          if (e.ownerId !== user.uid) return e;
          const currentShared = new Set(e.sharedWith || []);
          group.members.forEach(m => currentShared.add(m));
          return { ...e, sharedWith: Array.from(currentShared) };
        }));
      }
      return;
    }

    try {
      const groupData = {
        ...group,
        ownerId: user.uid,
      };
      await addDoc(collection(db, 'groups'), groupData);
      
      if (group.shareAllEvents && group.members.length > 0) {
        const myEvents = events.filter(e => e.ownerId === user.uid);
        for (const e of myEvents) {
          const currentShared = new Set(e.sharedWith || []);
          let changed = false;
          group.members.forEach(m => {
            if (!currentShared.has(m)) {
              currentShared.add(m);
              changed = true;
            }
          });
          if (changed) {
            await updateDoc(doc(db, 'events', e.id), { sharedWith: Array.from(currentShared) });
          }
        }
      }
    } catch (error) {
      console.error('Error adding group:', error);
      throw error;
    }
  };

  const updateGroup = async (id: string, group: Partial<Group>) => {
    if (!user) return;

    if (user.isAnonymous) {
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...group } : g));
      
      if (group.shareAllEvents && group.members && group.members.length > 0) {
        setEvents(prev => prev.map(e => {
          if (e.ownerId !== user.uid) return e;
          const currentShared = new Set(e.sharedWith || []);
          group.members!.forEach(m => currentShared.add(m));
          return { ...e, sharedWith: Array.from(currentShared) };
        }));
      }
      return;
    }

    try {
      const docRef = doc(db, 'groups', id);
      await updateDoc(docRef, group);
      
      if (group.shareAllEvents && group.members && group.members.length > 0) {
        const myEvents = events.filter(e => e.ownerId === user.uid);
        for (const e of myEvents) {
          const currentShared = new Set(e.sharedWith || []);
          let changed = false;
          group.members.forEach(m => {
            if (!currentShared.has(m)) {
              currentShared.add(m);
              changed = true;
            }
          });
          if (changed) {
            await updateDoc(doc(db, 'events', e.id), { sharedWith: Array.from(currentShared) });
          }
        }
      }
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  };

  const deleteGroup = async (id: string) => {
    if (!user) return;

    if (user.isAnonymous) {
      setGroups(prev => prev.filter(g => g.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'groups', id));
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  };

  const acknowledgeSharedEvent = async (event: CalendarEvent) => {
    if (!user || !user.email) return;
    
    if (user.isAnonymous) {
      setPendingEvents(prev => prev.filter(e => e.id !== event.id));
      setEvents(prev => {
        const others = prev.filter(e => e.id !== event.id);
        return [...others, { ...event, acknowledgedBy: [...(event.acknowledgedBy || []), user.email!] }];
      });
      return;
    }

    try {
      const currentAck = event.acknowledgedBy || [];
      if (!currentAck.includes(user.email)) {
        await updateDoc(doc(db, 'events', event.id), {
          acknowledgedBy: [...currentAck, user.email]
        });
      }
    } catch (err) {
      console.error("Error acknowledging event", err);
    }
  };

  const declineSharedEvent = async (event: CalendarEvent) => {
    if (!user || !user.email) return;
    
    if (user.isAnonymous) {
      setPendingEvents(prev => prev.filter(e => e.id !== event.id));
      return;
    }

    try {
      const currentShared = event.sharedWith || [];
      const newShared = currentShared.filter(e => e !== user.email);
      await updateDoc(doc(db, 'events', event.id), {
        sharedWith: newShared
      });
    } catch (err) {
      console.error("Error declining event", err);
    }
  };

  return (
    <CalendarContext.Provider value={{ events, pendingEvents, groups, loading, addEvent, updateEvent, deleteEvent, addGroup, updateGroup, deleteGroup, acknowledgeSharedEvent, declineSharedEvent }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
