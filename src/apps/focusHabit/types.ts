export type FocusTimerMode = 'pomodoro' | 'stopwatch' | 'countdown';

export interface FocusSession {
  id: string;
  mode: FocusTimerMode;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  targetMs?: number;
  completed: boolean;
  selectedAiIds?: string[];
}

export interface HabitItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  startDate: string;
}

export interface HabitCheckin {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  count: number;
}

export type FocusTodoStatus = 'todo' | 'in_progress' | 'done';

export interface FocusTodoItem {
  id: string;
  title: string;
  status: FocusTodoStatus;
  updatedAt: number;
}

export interface DailyJournalEntry {
  date: string; // YYYY-MM-DD
  weather?: string;
  mood?: string;
  luck?: number;
  habits?: string[];
  withWhom?: string;
  food?: string;
  workout?: string;
  achievements?: string;
}

// V2: AI自习室预留结构
export interface StudyRoomSession {
  sessionId: string;
  focusSessionId: string;
  selectedAiIds: string[];
  status: 'active' | 'ended';
  createdAt: number;
}

// V2: AI自习室预留结构
export interface StudyRoomEvent {
  id: string;
  sessionId: string;
  aiId: string;
  timestamp: number;
  eventType: 'status' | 'self_talk' | 'leave_note';
  content: string;
}
