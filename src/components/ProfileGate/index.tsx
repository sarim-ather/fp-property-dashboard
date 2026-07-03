import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import type { UserProfile } from '../../types';

const ROLES: { id: UserProfile; label: string; desc: string; color: string }[] = [
  {
    id: 'finance',
    label: 'Finance',
    desc: 'Full P&L, budgets, reallocation pool',
    color: 'navy',
  },
  {
    id: 'sales',
    label: 'Sales',
    desc: 'Closures, commission, pipeline',
    color: 'emerald',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    desc: 'ROAS, leads, marketing spend',
    color: 'brass',
  },
];

const COLOR = {
  navy:    { bg: 'bg-navy',    ring: 'ring-navy',    text: 'text-navy',    activeBg: 'bg-navy',    activeText: 'text-white' },
  emerald: { bg: 'bg-emerald-600', ring: 'ring-emerald-600', text: 'text-emerald-700', activeBg: 'bg-emerald-600', activeText: 'text-white' },
  brass:   { bg: 'bg-brass',   ring: 'ring-brass',   text: 'text-brass',   activeBg: 'bg-brass',   activeText: 'text-ink' },
};

export default function ProfileGate() {
  const { state } = useApp();
  const { unlock } = useProfile();
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selected]);

  function handlePinChange(val: string) {
    if (!/^\d*$/.test(val) || val.length > 4) return;
    setPin(val);
    setError('');
    if (val.length === 4) verify(val);
  }

  function verify(value: string) {
    if (!selected) return;
    const correct = state.data.settings.pins?.[selected] ?? defaultPin(selected);
    if (value === correct) {
      unlock(selected);
    } else {
      setError('Incorrect PIN');
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="h-screen bg-sand flex flex-col items-center justify-center px-6 gap-8">
      {/* Logo */}
      <div className="text-center">
        <div className="text-2xl font-bold text-brass tracking-widest mb-1">FP</div>
        <div className="text-xs text-ink-300 uppercase tracking-widest">Roadshow Dashboard</div>
      </div>

      {/* Role picker */}
      <div className="w-full max-w-xs">
        <p className="text-xs font-semibold text-ink-300 uppercase tracking-widest text-center mb-4">
          Select your role
        </p>
        <div className="flex flex-col gap-3">
          {ROLES.map(role => {
            const c = COLOR[role.color as keyof typeof COLOR];
            const isActive = selected === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? `${c.activeBg} ${c.activeText} border-transparent`
                    : `bg-white ${c.text} border-bone hover:border-current`
                }`}
              >
                <div className="font-semibold text-sm">{role.label}</div>
                <div className={`text-xs mt-0.5 ${isActive ? 'opacity-80' : 'text-ink-300'}`}>
                  {role.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PIN entry */}
      {selected && (
        <div className="w-full max-w-xs flex flex-col items-center gap-4">
          <p className="text-xs text-ink-300 uppercase tracking-widest font-semibold">Enter PIN</p>

          {/* PIN dots */}
          <div className="flex gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > i
                    ? 'bg-navy border-navy'
                    : 'border-ink-200 bg-white'
                }`}
              />
            ))}
          </div>

          {/* Hidden numeric input */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={e => handlePinChange(e.target.value)}
            className="opacity-0 absolute pointer-events-none"
            maxLength={4}
          />

          {/* Tap-to-focus hint */}
          <button
            onClick={() => inputRef.current?.focus()}
            className="text-xs text-ink-300 border border-bone rounded-lg px-4 py-2 bg-white"
          >
            Tap to type PIN
          </button>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button
                key={i}
                onClick={() => {
                  if (k === '') return;
                  if (k === '⌫') { handlePinChange(pin.slice(0, -1)); return; }
                  handlePinChange(pin + k);
                }}
                disabled={k === ''}
                className={`h-12 rounded-xl text-lg font-semibold transition-colors ${
                  k === '' ? 'invisible' :
                  k === '⌫' ? 'bg-bone text-ink-400 hover:bg-ink-100' :
                  'bg-white border border-bone text-ink hover:bg-bone active:bg-ink-100'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-200 text-center">
        Contact Finance to get your PIN
      </p>
    </div>
  );
}

function defaultPin(profile: UserProfile): string {
  return { finance: '1111', sales: '2222', marketing: '3333' }[profile];
}
