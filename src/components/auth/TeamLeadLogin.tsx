import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';
import { motion } from 'motion/react';
import { Users, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/lifewood-logo.png';
import DarkVeil from '../DarkVeil';

export default function TeamLeadLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and PIN.');
      return;
    }

    setIsSubmitting(true);

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

      const userRoleLower = data.user.role.toUpperCase();
      if (userRoleLower !== Role.TEAM_LEAD) {
        setError('Invalid team lead credentials.');
        setIsSubmitting(false);
        return;
      }

      login({
        id: data.user.id.toString(),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role.toUpperCase() as Role,
        pin: password,
      });
      navigate('/teamlead-dashboard');
    } catch (err) {
      setError('Could not connect to the server.');
      setIsSubmitting(false);
    }
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
          <h1 className="text-xl font-bold text-white">Team Lead</h1>
          <p className="text-sm text-white/70 mt-1">Sign in to view all projects</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl rounded-3xl p-6 space-y-5">
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
            <label className="text-xs font-semibold text-zinc-700 pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 text-zinc-900 placeholder:text-zinc-400 transition-all font-medium"
                placeholder="teamlead@lifewood.ph"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 pl-1">PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 text-zinc-900 placeholder:text-zinc-400 transition-all font-medium"
                placeholder="Enter your 6-digit PIN"
              />
            </div>
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