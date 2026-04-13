import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useProjects } from '../contexts/ProjectContext';
import { useAISpreadsheet } from '../contexts/AISpreadsheetContext';

export default function DebugPage() {
    let auth, user, projects, ai;

    try { auth = useAuth(); } catch (e: any) { auth = { error: e.message }; }
    try { user = useUser(); } catch (e: any) { user = { error: e.message }; }
    try { projects = useProjects(); } catch (e: any) { projects = { error: e.message }; }
    try { ai = useAISpreadsheet(); } catch (e: any) { ai = { error: e.message }; }

    return (
        <div style={{ padding: '20px', color: 'white', background: '#1a1a1a', height: '100vh', overflow: 'auto' }}>
            <h1>Diagnostic Debug Page</h1>
            <hr />
            <h2>Context Status</h2>
            <pre>{JSON.stringify({
                auth: auth ? 'Connected' : 'Missing',
                user: user ? 'Connected' : 'Missing',
                projects: projects ? 'Connected' : 'Missing',
                ai: ai ? 'Connected' : 'Missing'
            }, null, 2)}</pre>

            <hr />
            <h2>Auth Details</h2>
            <pre>{JSON.stringify(auth, null, 2)}</pre>

            <hr />
            <h2>Environment</h2>
            <pre>{JSON.stringify({
                href: window.location.href,
                pathname: window.location.pathname,
                localStorage: Object.keys(localStorage),
                sessionStorage: Object.keys(sessionStorage)
            }, null, 2)}</pre>
        </div>
    );
}
