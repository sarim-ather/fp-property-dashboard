import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppData, AppState, CostLineItem, Closure, Event, Reallocation, Screen, Settings } from '../types';
import { SEED_DATA } from '../data/seed';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { supabase, ROW_ID, TABLE } from '../lib/supabase';

type AppAction =
  | { type: 'IMPORT_DATA'; payload: AppData }
  | { type: 'UPDATE_POOL'; payload: number }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'CREATE_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: { id: string; changes: Partial<Event> } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_COST_ITEM'; payload: CostLineItem }
  | { type: 'UPDATE_COST_ITEM'; payload: { id: string; changes: Partial<CostLineItem> } }
  | { type: 'DELETE_COST_ITEM'; payload: string }
  | { type: 'ADD_CLOSURE'; payload: Closure }
  | { type: 'UPDATE_CLOSURE'; payload: { id: string; changes: Partial<Closure> } }
  | { type: 'DELETE_CLOSURE'; payload: string }
  | { type: 'ADD_REALLOCATION'; payload: Reallocation }
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SELECT_EVENT'; payload: string | null }
  | { type: '_REMOTE_SYNC'; payload: AppData };

const initialState: AppState = {
  data: loadFromStorage() ?? SEED_DATA,
  ui: { screen: 'portfolio', selectedEventId: null },
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'IMPORT_DATA':
    case '_REMOTE_SYNC':
      return { ...state, data: action.payload };
    case 'UPDATE_POOL':
      return { ...state, data: { ...state.data, corporatePool: { totalPool: action.payload } } };
    case 'UPDATE_SETTINGS':
      return { ...state, data: { ...state.data, settings: { ...state.data.settings, ...action.payload } } };
    case 'CREATE_EVENT':
      return { ...state, data: { ...state.data, events: [...state.data.events, action.payload] } };
    case 'UPDATE_EVENT':
      return {
        ...state,
        data: {
          ...state.data,
          events: state.data.events.map(e =>
            e.id === action.payload.id ? { ...e, ...action.payload.changes } : e
          ),
        },
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        data: {
          ...state.data,
          events: state.data.events.filter(e => e.id !== action.payload),
          costLineItems: state.data.costLineItems.filter(i => i.eventId !== action.payload),
          closures: state.data.closures.filter(c => c.eventId !== action.payload),
        },
        ui: state.ui.selectedEventId === action.payload
          ? { ...state.ui, selectedEventId: null }
          : state.ui,
      };
    case 'ADD_COST_ITEM':
      return { ...state, data: { ...state.data, costLineItems: [...state.data.costLineItems, action.payload] } };
    case 'UPDATE_COST_ITEM':
      return {
        ...state,
        data: {
          ...state.data,
          costLineItems: state.data.costLineItems.map(i =>
            i.id === action.payload.id ? { ...i, ...action.payload.changes } : i
          ),
        },
      };
    case 'DELETE_COST_ITEM':
      return { ...state, data: { ...state.data, costLineItems: state.data.costLineItems.filter(i => i.id !== action.payload) } };
    case 'ADD_CLOSURE':
      return { ...state, data: { ...state.data, closures: [...state.data.closures, action.payload] } };
    case 'UPDATE_CLOSURE':
      return {
        ...state,
        data: {
          ...state.data,
          closures: state.data.closures.map(c =>
            c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
          ),
        },
      };
    case 'DELETE_CLOSURE':
      return { ...state, data: { ...state.data, closures: state.data.closures.filter(c => c.id !== action.payload) } };
    case 'ADD_REALLOCATION':
      return { ...state, data: { ...state.data, reallocations: [...state.data.reallocations, action.payload] } };
    case 'SET_SCREEN':
      return { ...state, ui: { ...state.ui, screen: action.payload, selectedEventId: null } };
    case 'SELECT_EVENT':
      return { ...state, ui: { ...state.ui, selectedEventId: action.payload } };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  syncing: boolean;
  syncError: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [syncing, setSyncing] = [false, (_: boolean) => {}]; // placeholder for UI
  const [syncError, setSyncError] = [null as string | null, (_: string | null) => {}];

  // Block writes to Supabase until after the initial fetch resolves
  const isInitializedRef = useRef(false);
  // Track whether last write came from remote to avoid re-uploading it
  const remoteUpdateRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: fetch latest from Supabase, then mark initialized
  useEffect(() => {
    if (!supabase) {
      isInitializedRef.current = true;
      return;
    }
    supabase
      .from(TABLE)
      .select('data')
      .eq('id', ROW_ID)
      .single()
      .then(({ data: row, error }) => {
        if (!error && row?.data) {
          remoteUpdateRef.current = true;
          dispatch({ type: '_REMOTE_SYNC', payload: row.data as AppData });
        }
        // Allow writes only after we know what Supabase has
        isInitializedRef.current = true;
      });
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('app_data_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` },
        (payload) => {
          const incoming = (payload.new as { data: AppData }).data;
          if (incoming) {
            remoteUpdateRef.current = true;
            dispatch({ type: '_REMOTE_SYNC', payload: incoming });
          }
        }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, []);

  // Write to Supabase on local data change (debounced 600ms, skip remote updates)
  useEffect(() => {
    saveToStorage(state.data);

    if (!supabase) return;

    // Never write before initial fetch — would overwrite Supabase with stale local data
    if (!isInitializedRef.current) return;

    // Cancel any pending write and skip if this update came from remote
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      supabase!
        .from(TABLE)
        .upsert({ id: ROW_ID, data: state.data, updated_at: new Date().toISOString() })
        .then(() => {});
    }, 600);
  }, [state.data]);

  return (
    <AppContext.Provider value={{ state, dispatch, syncing, syncError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
