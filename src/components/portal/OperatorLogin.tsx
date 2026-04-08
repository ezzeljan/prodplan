import { useState } from 'react';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { Mail, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../../assets/lifewood-logo.png';

export default function OperatorLogin() {
    const { login } = useOperatorAuth();
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !pin.trim()) {
            setError('Please enter your email and PIN.');
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await login(email, pin);
        if (!result.success) {
            setError(result.error || 'Login failed.');
        }
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg px-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-sm"
            >
                <div className="flex flex-col items-center mb-8">
                    <img
                        src={logo}
                        alt="Lifewood"
                        className="h-10 w-auto object-contain brightness-0 invert mb-6"
                    />
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">Operator Portal</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Sign in to view your assigned output
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--metric-red)]/10 border border-[var(--metric-red)]/20"
                        >
                            <AlertCircle className="w-4 h-4 text-[var(--metric-red)] shrink-0" />
                            <span className="text-xs text-[var(--metric-red)]">{error}</span>
                        </motion.div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] pl-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                placeholder="you@company.com"
                                className="glass-input w-full pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)]"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] pl-1">
                            PIN
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="password"
                                value={pin}
                                onChange={e => { setPin(e.target.value); setError(''); }}
                                placeholder="Enter your PIN"
                                className="glass-input w-full pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)]"
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                            bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
                            hover:shadow-lg hover:shadow-[var(--accent-glow)]
                            disabled:opacity-50 disabled:cursor-not-allowed
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

                <p className="text-center text-[10px] text-[var(--text-muted)] mt-6">
                    Contact your admin if you don't have an account.
                </p>
            </motion.div>
        </div>
    );
}
