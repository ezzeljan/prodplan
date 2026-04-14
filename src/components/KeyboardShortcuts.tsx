import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KeyboardShortcuts() {
    const navigate = useNavigate();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.altKey) {
            // Use e.code (not e.key) — layout-independent, fixes Ctrl+Alt on Windows (AltGr)
            const code = e.code;
            if (code === 'KeyA') {
                e.preventDefault();
                navigate('/admin');
            } else if (code === 'KeyT') {
                e.preventDefault();
                navigate('/teamlead');
            } else if (code === 'KeyO') {
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