import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LeaderboardWindow } from './LeaderboardWindow';
import { preloadSprites } from './sprites';
import './styles.css';

preloadSprites();
const view = new URLSearchParams(location.search).get('view');

createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'classement' ? <LeaderboardWindow /> : <App />}</StrictMode>);
