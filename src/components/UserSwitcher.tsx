import { useState } from 'react';
import { useUser, UserRole } from '../contexts/UserContext';
import { Users, ChevronDown, Shield, Briefcase, User, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const roleIcons: Record<UserRole, React.ReactNode> = {
    admin: <Shield className="w-3.5 h-3.5" />,
    manager: <Briefcase className="w-3.5 h-3.5" />,
    teamlead: <Users className="w-3.5 h-3.5" />,
    operator: <User className="w-3.5 h-3.5" />,
};

const roleColors: Record<UserRole, string> = {
    admin: 'text-[var(--metric-purple)]',
    manager: 'text-[var(--metric-blue)]',
    teamlead: 'text-[var(--accent-secondary)]',
    operator: 'text-[var(--metric-green)]',
};

const roleBgColors: Record<UserRole, string> = {
    admin: 'bg-[var(--metric-purple)]/10',
    manager: 'bg-[var(--metric-blue)]/10',
    teamlead: 'bg-[var(--accent-secondary)]/10',
    operator: 'bg-[var(--metric-green)]/10',
};

export default function UserSwitcher() {
    const { currentUser, users, switchUser } = useUser();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="glass-card flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
            >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${roleBgColors[currentUser.role]}`}>
                    <span className={roleColors[currentUser.role]}>
                        {roleIcons[currentUser.role]}
                    </span>
                </div>
                <div className="text-left">
                    <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{currentUser.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] capitalize">{currentUser.role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-2 w-56 py-1.5 z-[100] overflow-y-auto custom-scrollbar rounded-2xl border"
                        style={{
                            maxHeight: 320,
                            background: 'rgba(20, 30, 20, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderColor: 'rgba(255,255,255,0.08)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                    >
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Switch User (Demo)
                        </p>
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => { switchUser(user.id); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 ${currentUser.id === user.id
                                    ? 'bg-[var(--accent-primary)]/15 text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${roleBgColors[user.role]}`}>
                                    <span className={roleColors[user.role]}>
                                        {roleIcons[user.role]}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{user.name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] capitalize">{user.role}</p>
                                </div>
                                {currentUser.id === user.id && (
                                    <Check className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
