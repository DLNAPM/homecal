import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { CalendarEvent } from './types';

interface CalendarContextType {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'ownerId'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEvents([]);
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
          endTime: (data.endTime as Timestamp).toDate(),
        } as CalendarEvent;
      });
      
      setEvents(prev => {
        const others = prev.filter(e => e.ownerId !== user.uid);
        const merged = [...newEvents, ...others];
        // Remove duplicates just in case
        return Array.from(new Map(merged.map(item => [item.id, item])).values());
      });
      setLoading(false);
    }, (error) => {
      console.error('Error fetching owned events:', error);
      setLoading(false);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const newEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: (data.startTime as Timestamp).toDate(),
          endTime: (data.endTime as Timestamp).toDate(),
        } as CalendarEvent;
      });
      
      setEvents(prev => {
        const others = prev.filter(e => e.ownerId === user.uid);
        const merged = [...others, ...newEvents];
        // Remove duplicates just in case
        return Array.from(new Map(merged.map(item => [item.id, item])).values());
      });
    }, (error) => {
      console.error('Error fetching shared events:', error);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'events'), {
        ...event,
        ownerId: user.uid,
        startTime: Timestamp.fromDate(event.startTime),
        endTime: Timestamp.fromDate(event.endTime),
      });
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const updateEvent = async (id: string, event: Partial<CalendarEvent>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'events', id);
      const updateData: any = { ...event };
      if (event.startTime) updateData.startTime = Timestamp.fromDate(event.startTime);
      if (event.endTime) updateData.endTime = Timestamp.fromDate(event.endTime);
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  return (
    <CalendarContext.Provider value={{ events, loading, addEvent, updateEvent, deleteEvent }}>
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
