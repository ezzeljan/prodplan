import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { Mail, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../../assets/lifewood-logo.png';

export default function OperatorLogin() {
    const { login } = useOperatorAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.altKey) {
                if (e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    navigate('/admin');
                } else if (e.key.toLowerCase() === 'm') {
                    e.preventDefault();
                    navigate('/manager');
                } else if (e.key.toLowerCase() === 'o') {
                    e.preventDefault();
                    navigate('/portal');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

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
        <div className="min-h-screen flex items-center justify-center bg-white px-4 font-['Manrope',sans-serif]">
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
                        className="h-10 w-auto object-contain mb-6"
                    />
                    <h1 className="text-xl font-bold text-zinc-900">Operator Portal</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Sign in to view your assigned output
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-6 space-y-5">
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
                        <label className="text-xs font-semibold text-zinc-700 pl-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                placeholder="you@company.com"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 text-zinc-900 placeholder:text-zinc-400 transition-all font-medium"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 pl-1">
                            PIN
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="password"
                                value={pin}
                                onChange={e => { setPin(e.target.value); setError(''); }}
                                placeholder="Enter your PIN"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 text-zinc-900 placeholder:text-zinc-400 transition-all font-medium"
                                autoComplete="current-password"
                            />
                        </div>
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

                <p className="text-center text-xs text-zinc-500 mt-6 font-medium">
                    Contact your admin if you don't have an account.
                </p>
            </motion.div>
        </div>
    );
}
