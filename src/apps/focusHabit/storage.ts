import { smartLoad, smartSave } from '../../utils/storage';
import type {
  DailyJournalEntry,
  FocusSession,
  FocusTodoItem,
  HabitCheckin,
  HabitItem,
  StudyRoomEvent,
  StudyRoomSession,
} from './types';

const KEY_SESSIONS = 'focus_habit_sessions';
const KEY_HABITS = 'focus_habit_habits';
const KEY_CHECKINS = 'focus_habit_checkins';
const KEY_TODOS = 'focus_habit_todos';
const KEY_JOURNALS = 'focus_habit_journals';
const KEY_STUDY_ROOM_SESSIONS = 'focus_habit_study_room_sessions';
const KEY_STUDY_ROOM_EVENTS = 'focus_habit_study_room_events';

async function loadArray<T>(key: string): Promise<T[]> {
  const data = await smartLoad(key);
  return Array.isArray(data) ? (data as T[]) : [];
}

export const focusHabitStorage = {
  loadSessions: () => loadArray<FocusSession>(KEY_SESSIONS),
  saveSessions: (items: FocusSession[]) => smartSave(KEY_SESSIONS, items),

  loadHabits: () => loadArray<HabitItem>(KEY_HABITS),
  saveHabits: (items: HabitItem[]) => smartSave(KEY_HABITS, items),

  loadCheckins: () => loadArray<HabitCheckin>(KEY_CHECKINS),
  saveCheckins: (items: HabitCheckin[]) => smartSave(KEY_CHECKINS, items),

  loadTodos: () => loadArray<FocusTodoItem>(KEY_TODOS),
  saveTodos: (items: FocusTodoItem[]) => smartSave(KEY_TODOS, items),

  loadJournals: () => loadArray<DailyJournalEntry>(KEY_JOURNALS),
  saveJournals: (items: DailyJournalEntry[]) => smartSave(KEY_JOURNALS, items),

  // V2预留
  loadStudyRoomSessions: () => loadArray<StudyRoomSession>(KEY_STUDY_ROOM_SESSIONS),
  saveStudyRoomSessions: (items: StudyRoomSession[]) => smartSave(KEY_STUDY_ROOM_SESSIONS, items),

  // V2预留
  loadStudyRoomEvents: () => loadArray<StudyRoomEvent>(KEY_STUDY_ROOM_EVENTS),
  saveStudyRoomEvents: (items: StudyRoomEvent[]) => smartSave(KEY_STUDY_ROOM_EVENTS, items),
};
