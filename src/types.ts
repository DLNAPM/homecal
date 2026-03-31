export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isPremium?: boolean;
  lastGreetingDate?: string;
  webAuthnCredentialId?: string;
  webAuthnPublicKey?: string;
}

export interface CalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  sharedWith?: string[];
}
