import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import type { AppData, AppState, CostLineItem, Closure, Event, Reallocation, Screen, Settings } from '../types';
import { SEED_DATA } from '../data/seed';
import { loadFromStorage, saveToStorage } from '../utils/storage';

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
  | { type: 'SELECT_EVENT'; payload: string | null };

const initialState: AppState = {
  data: loadFromStorage() ?? SEED_DATA,
  ui: { screen: 'portfolio', selectedEventId: null },
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'IMPORT_DATA':
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    saveToStorage(state.data);
  }, [state.data]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
