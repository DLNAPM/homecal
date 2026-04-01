import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isFaceLocked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  lockWithFaceId: () => void;
  unlockWithFaceId: () => void;
  connectGoogleCalendar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFaceLocked, setIsFaceLocked] = useState(() => {
    return localStorage.getItem('isFaceLocked') === 'true';
  });

  const lockWithFaceId = () => {
    setIsFaceLocked(true);
    localStorage.setItem('isFaceLocked', 'true');
  };

  const unlockWithFaceId = () => {
    setIsFaceLocked(false);
    localStorage.removeItem('isFaceLocked');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.isAnonymous) {
          setProfile({
            uid: currentUser.uid,
            email: 'guest@homecal.test',
            displayName: 'Guest User',
            isPremium: false,
          });
        } else {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (currentUser.email === 'dlaniger.napm.consulting@gmail.com' && !data.isPremium) {
              const updatedProfile = { ...data, isPremium: true };
              await setDoc(docRef, updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email!,
              displayName: currentUser.displayName || undefined,
              photoURL: currentUser.photoURL || undefined,
              isPremium: currentUser.email === 'dlaniger.napm.consulting@gmail.com',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.setCustomParameters({
        prompt: 'consent'
      });
      await signInWithPopup(auth, provider);
      
      if (profile) {
        const currentConnections = profile.connectedCalendars || [];
        if (!currentConnections.includes('Google Calendar')) {
          await updateProfile({ connectedCalendars: [...currentConnections, 'Google Calendar'] });
        }
      }
    } catch (error) {
      console.error('Error connecting Google Calendar', error);
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      // Create a mock guest user to avoid requiring Firebase Anonymous Auth to be enabled
      const guestUid = `guest-${Date.now()}`;
      const mockGuestUser = {
        uid: guestUid,
        email: 'guest@homecal.test',
        isAnonymous: true,
        displayName: 'Guest User',
        photoURL: null,
      } as unknown as User;

      setUser(mockGuestUser);
      setProfile({
        uid: guestUid,
        email: 'guest@homecal.test',
        displayName: 'Guest User',
        isPremium: false,
      });
    } catch (error) {
      console.error('Error signing in as guest', error);
      throw error;
    }
  };

  const signOut = async () => {
    unlockWithFaceId();
    if (user?.isAnonymous) {
      setUser(null);
      setProfile(null);
    } else {
      await auth.signOut();
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile || user.isAnonymous) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, data, { merge: true });
    setProfile({ ...profile, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isFaceLocked, signInWithGoogle, signInAsGuest, signOut, updateProfile, lockWithFaceId, unlockWithFaceId, connectGoogleCalendar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
