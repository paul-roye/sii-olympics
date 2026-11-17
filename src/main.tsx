import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LeaderboardWindow } from './LeaderboardWindow';
import { GamepadTest } from './GamepadTest';
import { preloadSprites } from './sprites';
import './styles.css';

preloadSprites();
const view = new URLSearchParams(location.search).get('view');

createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'classement' ? <LeaderboardWindow /> : view === 'manette' ? <GamepadTest /> : <App />}</StrictMode>);
