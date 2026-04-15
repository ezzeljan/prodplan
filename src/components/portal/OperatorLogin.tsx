import { useState } from 'react';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../../assets/lifewood-logo.png';
import DarkVeil from '../DarkVeil';

export default function OperatorLogin() {
    const { login } = useOperatorAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) {
            setError('Please enter your 6-digit PIN.');
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await login('', pin);
        if (!result.success) {
            setError(result.error || 'Login failed.');
        }
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 font-['Manrope',sans-serif]">
            <DarkVeil
                noiseIntensity={0.05}
                scanlineIntensity={0.1}
                speed={0.5}
                scanlineFrequency={80}
                warpAmount={0.3}
                colorTint={[0.039, 0.486, 0.306]}
            />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-sm relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white/90 rounded-full px-4 py-2 mb-6">
                        <img
                            src={logo}
                            alt="Lifewood"
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-xl font-bold text-white">Operator Portal</h1>
                    <p className="text-sm text-white/70 mt-1">
                        Sign in to view your assigned output
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl rounded-3xl p-6 space-y-5">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200"
                        >
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs text-red-600 font-medium">{error}</span>
                        </motion.div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 pl-1 font-['Manrope']">Personnel PIN</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="password"
                                value={pin}
                                onChange={e => { setPin(e.target.value); setError(''); }}
                                maxLength={6}
                                className="w-full pl-10 pr-4 py-3 text-lg bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 text-zinc-900 placeholder:text-zinc-400 transition-all font-bold text-center tracking-[0.5em] placeholder:tracking-[0.5em]"
                                placeholder="••••••"
                                autoComplete="current-password"
                            />
                        </div>
                        <p className="text-[10px] text-zinc-500 text-center mt-2 px-4 italic">
                            Use your unique 6-digit company PIN to view your assigned projects.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all
                            bg-gradient-to-r from-[var(--accent-primary)] to-[#087851]
                            hover:shadow-lg hover:shadow-[var(--accent-primary)]/30 hover:-translate-y-0.5
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
                            flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-white/70 mt-6 font-medium">
                    Contact your admin if you don't have an account.
                </p>
            </motion.div>
        </div>
    );
}