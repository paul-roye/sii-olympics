# World Olympics

Jeu web. Stack : code sur GitHub, déploiement Vercel, base Supabase.

## MCP (connecteurs claude.ai)
- github : repo, issues, PR
- vercel : déploiements, logs, env vars (OAuth)
- supabase : schéma, migrations, SQL, clés (OAuth)

## Conventions
- Secrets uniquement dans .env.local / variables Vercel, jamais commités.
- Schéma Supabase géré par migrations (pas d'édition manuelle en prod).

## Specs
Specs détaillées : « Tour du Monde des Sports » (4 zones × 3 activités : runner, chaser, qte).
Contraintes event : pseudo + email avant de jouer, score enregistré en fin de parcours, partie ≤ 3 min,
contre une IA (rival du QTE + score à battre). Plus tard : export CSV, mode 2 joueurs.

## Code
- Vite + React + TypeScript. `npm run dev`, `npm run build`.
- `src/game/` : moteurs canvas purs (800×450), indépendants de React. `data.ts` = zones/sports.
- `src/scores.ts` : Supabase si `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, sinon localStorage.
- `supabase/migrations/` : table `scores` ; anon peut insérer, et lire tout sauf l'email.
- Score total = somme des points des 3 activités ; départage par chrono jeux 2 + 3.
- `src/game/gamepad.ts` : manette (Gamepad API, mapping standard Xbox) → touches logiques de `Input`. Croix/stick G = directions, A = saut, LB/LT ◀ RB/RT ▶ (course), A/B/X/Y/LB/RB = 6 lettres proposées en « figures » (`SlotMapper`).
- `src/useGamepadMenu.ts` : navigation des menus à la manette (croix = focus, A = clic), coupée pendant une épreuve.
- `?view=manette` : page de diagnostic manette (`src/GamepadTest.tsx`).
- `src/styles.css` : thème provisoire, en attente du design final.
