
export enum ServiceType {
  AUXILIARY = 'Pioneiro Auxiliar',
  REGULAR = 'Pioneiro Regular'
}

export interface UserProfile {
  name: string;
  serviceType: ServiceType;
  monthlyGoal: number;
  whatsappNumber: string;
  coverPhoto?: string; // Base64 string or URL
  profilePicture?: string; // Base64 string or URL
}

export interface DailyEntry {
  id: string;
  date: string; // ISO string
  hours: number;
  minutes: number;
  bibleStudies: number;
  notes?: string;
}

export interface ExtraActivity {
  id: string;
  type: 'LDC' | 'AssemblyHall';
  hours: number;
  minutes: number;
  date: string;
}

export type TabType = 'diary' | 'extras' | 'report' | 'settings';
