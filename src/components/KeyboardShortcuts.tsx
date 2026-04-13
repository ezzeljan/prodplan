import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function KeyboardShortcuts() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.altKey) {
            const key = e.key.toLowerCase();
            if (key === 'a') {
                e.preventDefault();
                navigate('/admin');
            } else if (key === 'm') {
                e.preventDefault();
                navigate('/manager');
            } else if (key === 't') {
                e.preventDefault();
                navigate('/teamlead');
            } else if (key === 'o') {
                e.preventDefault();
                navigate('/portal');
            }
        }
    }, [navigate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return null;
}