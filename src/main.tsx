import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LeaderboardWindow } from './LeaderboardWindow';
import { GamepadTest } from './GamepadTest';
import { preloadSprites } from './sprites';
import { sfx, unlockAudioOnGesture } from './sound';
import './styles.css';

preloadSprites();
unlockAudioOnGesture();
// son de validation sur tous les boutons pixel (souris, tactile, manette, Entrée)
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement | null)?.closest('.px-btn');
  if (b && !b.classList.contains('sound-btn') && !b.classList.contains('letter')) sfx.select();
});
const view = new URLSearchParams(location.search).get('view');

createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'classement' ? <LeaderboardWindow /> : view === 'manette' ? <GamepadTest /> : <App />}</StrictMode>);
