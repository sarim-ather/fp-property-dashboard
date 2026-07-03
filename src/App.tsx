import { useApp } from './context/AppContext';
import Portfolio from './components/Portfolio';
import EventDetail from './components/EventDetail';
import Reallocation from './components/Reallocation';
import Baselines from './components/Baselines';
import Insights from './components/Insights';
import Settings from './components/Settings';
import type { Screen } from './types';

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'portfolio',    label: 'Portfolio' },
  { id: 'reallocation', label: 'Reallocation' },
  { id: 'baselines',    label: 'Baselines' },
  { id: 'insights',     label: '✦ Insights' },
  { id: 'settings',     label: 'Settings' },
];

export default function App() {
  const { state, dispatch } = useApp();
  const { screen, selectedEventId } = state.ui;

  const showEventDetail = !!selectedEventId;

  return (
    <div className="h-screen flex flex-col bg-sand overflow-hidden">
      {!showEventDetail && (
        <nav className="bg-white border-b border-bone flex-shrink-0">
          <div className="flex items-center px-4 h-11">
            <div className="text-xs font-bold text-brass uppercase tracking-widest mr-6">FP</div>
            <div className="flex gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => dispatch({ type: 'SET_SCREEN', payload: item.id })}
                  className={`px-4 py-2 text-xs font-medium rounded transition-colors ${
                    screen === item.id
                      ? item.id === 'insights'
                        ? 'bg-brass text-ink'
                        : 'bg-navy text-white'
                      : item.id === 'insights'
                        ? 'text-brass hover:bg-brass-pale'
                        : 'text-ink-500 hover:text-ink hover:bg-bone'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 overflow-hidden">
        {showEventDetail ? (
          <EventDetail />
        ) : screen === 'portfolio' ? (
          <Portfolio />
        ) : screen === 'reallocation' ? (
          <div className="h-full overflow-y-auto">
            <Reallocation />
          </div>
        ) : screen === 'baselines' ? (
          <div className="h-full overflow-y-auto">
            <Baselines />
          </div>
        ) : screen === 'insights' ? (
          <Insights />
        ) : (
          <div className="h-full overflow-y-auto">
            <Settings />
          </div>
        )}
      </main>
    </div>
  );
}
