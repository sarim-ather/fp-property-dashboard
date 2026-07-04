import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import type { UserProfile } from '../../types';

const ROLES: { id: UserProfile; label: string; desc: string; color: string; bg: string; active: string; text: string }[] = [
  { id: 'finance',   label: 'Finance',   desc: 'Full P&L, budgets, reallocation',  color: '#0F3460', bg: 'bg-white',       active: 'bg-navy text-white',        text: 'text-navy' },
  { id: 'sales',     label: 'Sales',     desc: 'Closures, commission, pipeline',   color: '#059669', bg: 'bg-white',       active: 'bg-emerald-600 text-white',  text: 'text-emerald-700' },
  { id: 'marketing', label: 'Marketing', desc: 'ROAS, leads, spend',               color: '#B8860B', bg: 'bg-white',       active: 'bg-brass text-ink',          text: 'text-brass' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
};

export default function ProfileGate() {
  const { state } = useApp();
  const { unlock } = useProfile();
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) { setPin(''); setError(''); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [selected]);

  function handleKey(k: string) {
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    setError('');
    if (next.length === 4) verify(next);
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
      setTimeout(() => { setShaking(false); inputRef.current?.focus(); }, 500);
    }
  }

  return (
    <div className="h-screen bg-sand flex flex-col items-center justify-center px-6 gap-6 overflow-hidden">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="text-3xl font-bold text-brass tracking-widest mb-1">FP</div>
        <div className="text-[11px] text-ink-300 uppercase tracking-widest">Roadshow Dashboard</div>
      </motion.div>

      {/* Role picker */}
      <motion.div className="w-full max-w-xs" variants={container} initial="hidden" animate="show">
        <motion.p variants={item} className="text-[11px] font-semibold text-ink-300 uppercase tracking-widest text-center mb-4">
          Select your role
        </motion.p>
        {ROLES.map(role => {
          const isActive = selected === role.id;
          return (
            <motion.button
              key={role.id}
              variants={item}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
              onClick={() => setSelected(role.id)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 mb-2.5 transition-colors duration-200 ${
                isActive ? role.active + ' border-transparent shadow-lg' : `bg-white border-bone ${role.text}`
              }`}
            >
              <div className="font-semibold text-sm">{role.label}</div>
              <div className={`text-xs mt-0.5 ${isActive ? 'opacity-75' : 'text-ink-300'}`}>{role.desc}</div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* PIN entry */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="w-full max-w-xs flex flex-col items-center gap-4"
          >
            <p className="text-[11px] text-ink-300 uppercase tracking-widest font-semibold">Enter PIN</p>

            {/* Dots */}
            <motion.div
              className="flex gap-3"
              animate={shaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: pin.length > i ? 1 : 0.85, backgroundColor: pin.length > i ? '#0F3460' : '#ffffff' }}
                  transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                  className="w-4 h-4 rounded-full border-2 border-navy/30"
                />
              ))}
            </motion.div>

            <input
              ref={inputRef}
              type="tel" inputMode="numeric" pattern="[0-9]*"
              value={pin}
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); setError(''); if (v.length === 4) verify(v); }}
              className="opacity-0 absolute pointer-events-none"
              maxLength={4}
            />

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: k ? 0.88 : 1, backgroundColor: k === '⌫' ? '#d1d5db' : '#e5e0d8' }}
                  onClick={() => k && handleKey(k)}
                  disabled={!k}
                  className={`h-12 rounded-xl text-lg font-semibold ${
                    !k ? 'invisible' :
                    k === '⌫' ? 'bg-bone text-ink-400' :
                    'bg-white border border-bone text-ink shadow-sm'
                  }`}
                >
                  {k}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-red-500 font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button onClick={() => inputRef.current?.focus()} className="text-xs text-ink-300 border border-bone rounded-lg px-4 py-2 bg-white">
              Tap to type PIN
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-[11px] text-ink-200 text-center"
      >
        Contact Finance to get your PIN
      </motion.p>
    </div>
  );
}

function defaultPin(p: UserProfile) { return { finance: '4567', sales: '0001', marketing: '0987' }[p]; }
