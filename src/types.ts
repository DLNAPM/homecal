export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isPremium?: boolean;
  lastGreetingDate?: string;
  webAuthnCredentialId?: string;
  webAuthnPublicKey?: string;
  connectedCalendars?: string[];
  voicePreference?: 'male' | 'female';
  integrationConfigs?: {
    [provider: string]: {
      clientId?: string;
      appPassword?: string;
    };
  };
}

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  members: string[]; // array of emails
  shareAllEvents?: boolean;
}

export interface CalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date | null;
  sharedWith?: string[];
  reminderMinutes?: number | null;
  reminderChime?: boolean;
  acknowledged?: boolean;
  snoozedUntil?: Date | null;
}
