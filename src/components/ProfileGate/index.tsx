import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import type { UserProfile } from '../../types';

const ROLES: { id: UserProfile; label: string; desc: string; color: string }[] = [
  { id: 'finance',   label: 'Finance',   desc: 'Full P&L, budgets, reallocation pool', color: 'navy' },
  { id: 'sales',     label: 'Sales',     desc: 'Closures, commission, pipeline',        color: 'emerald' },
  { id: 'marketing', label: 'Marketing', desc: 'ROAS, leads, marketing spend',          color: 'brass' },
];

const COLOR = {
  navy:    { activeBg: 'bg-navy',        activeText: 'text-white',  text: 'text-navy',        border: 'border-navy/30' },
  emerald: { activeBg: 'bg-emerald-600', activeText: 'text-white',  text: 'text-emerald-700', border: 'border-emerald-300' },
  brass:   { activeBg: 'bg-brass',       activeText: 'text-ink',    text: 'text-brass',       border: 'border-brass/40' },
};

export default function ProfileGate() {
  const { state } = useApp();
  const { unlock } = useProfile();
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [poppedDot, setPoppedDot] = useState(-1);
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
    if (val.length > pin.length) {
      const newIdx = val.length - 1;
      setPoppedDot(newIdx);
      setTimeout(() => setPoppedDot(-1), 200);
    }
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
      setShaking(true);
      setError('Incorrect PIN');
      setPin('');
      setTimeout(() => { setShaking(false); inputRef.current?.focus(); }, 420);
    }
  }

  return (
    <div className="h-screen bg-sand flex flex-col items-center justify-center px-6 gap-7">
      {/* Logo */}
      <div className="text-center anim-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="text-2xl font-bold text-brass tracking-widest mb-1">FP</div>
        <div className="text-xs text-ink-300 uppercase tracking-widest">Roadshow Dashboard</div>
      </div>

      {/* Role picker */}
      <div className="w-full max-w-xs anim-fade-in-up" style={{ animationDelay: '80ms' }}>
        <p className="text-xs font-semibold text-ink-300 uppercase tracking-widest text-center mb-3">
          Select your role
        </p>
        <div className="flex flex-col gap-2.5">
          {ROLES.map((role, i) => {
            const c = COLOR[role.color as keyof typeof COLOR];
            const isActive = selected === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                style={{ animationDelay: `${120 + i * 70}ms` }}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 anim-fade-in-up active:scale-[0.98] ${
                  isActive
                    ? `${c.activeBg} ${c.activeText} border-transparent shadow-md`
                    : `bg-white ${c.text} border-bone hover:border-current hover:shadow-sm`
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
        <div className="w-full max-w-xs flex flex-col items-center gap-4 anim-slide-down">
          <p className="text-xs text-ink-300 uppercase tracking-widest font-semibold">Enter PIN</p>

          {/* PIN dots */}
          <div className={`flex gap-3 ${shaking ? 'anim-shake' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pin.length > i
                    ? `bg-navy border-navy ${poppedDot === i ? 'anim-dot-pop' : ''}`
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
                className={`h-12 rounded-xl text-lg font-semibold transition-all duration-100 active:scale-90 ${
                  k === '' ? 'invisible' :
                  k === '⌫' ? 'bg-bone text-ink-400 hover:bg-ink-100 active:bg-ink-200' :
                  'bg-white border border-bone text-ink hover:bg-bone active:bg-ink-100 shadow-sm'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium anim-fade-in">{error}</p>
          )}

          <button
            onClick={() => inputRef.current?.focus()}
            className="text-xs text-ink-300 border border-bone rounded-lg px-4 py-2 bg-white hover:bg-bone transition-colors"
          >
            Tap to type PIN
          </button>
        </div>
      )}

      <p className="text-[11px] text-ink-200 text-center anim-fade-in" style={{ animationDelay: '400ms' }}>
        Contact Finance to get your PIN
      </p>
    </div>
  );
}

function defaultPin(profile: UserProfile): string {
  return { finance: '4567', sales: '0001', marketing: '0987' }[profile];
}
