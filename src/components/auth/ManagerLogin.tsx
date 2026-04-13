import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../contexts/UserContext';
import { Role } from '../../types/auth';
import { motion } from 'motion/react';
import { Briefcase, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/lifewood-logo.png';

export default function ManagerLogin() {
  const { login } = useAuth();
  const { users, switchUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          navigate('/admin');
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          navigate('/manager');
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          navigate('/teamlead');
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          navigate('/portal');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const managers = users.filter(u => u.role === Role.PROJECT_MANAGER);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your company email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your 6-digit PIN.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:8080/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), pin: password })
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid credentials.');
          setIsSubmitting(false);
          return;
        }

        if (data.user.role !== 'PROJECT_MANAGER' && data.user.role !== 'ADMIN') {
          setError('Invalid manager credentials.');
          setIsSubmitting(false);
          return;
        }

        // Updated login logic using modernized AuthContext
        login({ email: data.user.email, pin: password });
        switchUser(data.user.id.toString());
        navigate('/');
      } catch (err) {
        setError('Could not connect to the server.');
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 font-['Manrope',sans-serif]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <img
            src={logo}
            alt="Lifewood"
            className="h-10 w-auto object-contain mb-6"
          />

          <h1 className="text-xl font-bold text-zinc-900">Project Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to oversee operations</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-zinc-200 shadow-xl rounded-3xl p-6 space-y-5">
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
            <label className="text-xs font-semibold text-zinc-700 pl-1 font-['Manrope']">Company Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 text-zinc-900 placeholder:text-zinc-400 transition-all text-sm"
                placeholder="manager@lifewood.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 pl-1 font-['Manrope']">Personnel PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                maxLength={6}
                className="w-full pl-10 pr-4 py-3 text-lg tracking-[0.5em] bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal transition-all font-bold text-center"
                placeholder="••••••"
              />
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-2 px-4 italic">
              Use your unique 6-digit company PIN to access your projects.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all
                  bg-gradient-to-r from-[var(--accent-primary)] to-[#087851]
                  hover:shadow-lg hover:shadow-[var(--accent-primary)]/30 hover:-translate-y-0.5
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
                  flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </motion.div>
    </div>
  );
}
