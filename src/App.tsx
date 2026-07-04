import { useApp } from './context/AppContext';
import { useProfile } from './context/ProfileContext';
import { supabase } from './lib/supabase';
import ProfileGate from './components/ProfileGate';
import Portfolio from './components/Portfolio';
import EventDetail from './components/EventDetail';
import Reallocation from './components/Reallocation';
import Baselines from './components/Baselines';
import Insights from './components/Insights';
import Settings from './components/Settings';
import SalesDashboard from './components/SalesDashboard';
import MarketingDashboard from './components/MarketingDashboard';
import type { Screen } from './types';

const FINANCE_NAV: { id: Screen; label: string }[] = [
  { id: 'portfolio',    label: 'Portfolio' },
  { id: 'reallocation', label: 'Reallocation' },
  { id: 'baselines',    label: 'Baselines' },
  { id: 'insights',     label: '✦ Insights' },
  { id: 'settings',     label: 'Settings' },
];

const SALES_NAV: { id: Screen; label: string }[] = [
  { id: 'portfolio',    label: 'Events' },
  { id: 'insights',     label: '✦ Insights' },
];

const MARKETING_NAV: { id: Screen; label: string }[] = [
  { id: 'portfolio',    label: 'Events' },
  { id: 'insights',     label: '✦ Insights' },
];

const PROFILE_COLOR = {
  finance:   { badge: 'bg-navy text-white',        dot: 'bg-blue-300' },
  sales:     { badge: 'bg-emerald-600 text-white',  dot: 'bg-emerald-300' },
  marketing: { badge: 'bg-brass text-ink',          dot: 'bg-amber-300' },
};

const PROFILE_LABEL = { finance: 'Finance', sales: 'Sales', marketing: 'Marketing' };

export default function App() {
  const { state, dispatch } = useApp();
  const { profile, lock } = useProfile();
  const { screen, selectedEventId } = state.ui;

  if (!profile) return <ProfileGate />;

  const showEventDetail = !!selectedEventId;
  const navItems = profile === 'finance' ? FINANCE_NAV : profile === 'sales' ? SALES_NAV : MARKETING_NAV;
  const colors = PROFILE_COLOR[profile];

  function renderMain() {
    if (showEventDetail) return <EventDetail />;

    if (profile === 'sales') {
      if (screen === 'insights') return <Insights />;
      return <SalesDashboard />;
    }

    if (profile === 'marketing') {
      if (screen === 'insights') return <Insights />;
      return <MarketingDashboard />;
    }

    // Finance — full access
    switch (screen) {
      case 'portfolio':    return <Portfolio />;
      case 'reallocation': return <div className="h-full overflow-y-auto"><Reallocation /></div>;
      case 'baselines':    return <div className="h-full overflow-y-auto"><Baselines /></div>;
      case 'insights':     return <Insights />;
      default:             return <div className="h-full overflow-y-auto"><Settings /></div>;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-sand overflow-hidden">
      {!showEventDetail && (
        <nav className="bg-white border-b border-bone flex-shrink-0">
          <div className="flex items-center px-4 h-11 gap-2">
            <div className="text-xs font-bold text-brass uppercase tracking-widest mr-2">FP</div>

            {/* Role badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mr-2 ${colors.badge}`}>
              {PROFILE_LABEL[profile]}
            </span>

            {/* Nav tabs */}
            <div className="flex gap-1 flex-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => dispatch({ type: 'SET_SCREEN', payload: item.id })}
                  className={`px-4 py-2 text-xs font-medium rounded transition-all duration-200 active:scale-95 ${
                    screen === item.id
                      ? item.id === 'insights'
                        ? 'bg-brass text-ink shadow-sm'
                        : profile === 'sales'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : profile === 'marketing'
                            ? 'bg-brass text-ink shadow-sm'
                            : 'bg-navy text-white shadow-sm'
                      : item.id === 'insights'
                        ? 'text-brass hover:bg-brass/10'
                        : 'text-ink-500 hover:text-ink hover:bg-bone'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Live sync indicator */}
            {supabase && (
              <span title="Live sync active" className="flex-shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}

            {/* Lock / switch profile */}
            <button
              onClick={lock}
              title="Switch profile"
              className="flex-shrink-0 text-ink-300 hover:text-ink p-1.5 rounded-lg hover:bg-bone transition-colors"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M11 7V5A3 3 0 0 0 5 5v2H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1zm-4 0V5a1 1 0 0 1 2 0v2H7z"/>
              </svg>
            </button>
          </div>
        </nav>
      )}

      <main key={showEventDetail ? 'event' : `${profile}-${screen}`} className="flex-1 overflow-hidden anim-fade-in">
        {renderMain()}
      </main>
    </div>
  );
}
