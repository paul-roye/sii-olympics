// Données des zones et des sports. Pour ajouter une zone : ajouter une entrée à ZONES.

/** Ordre des épreuves dans chaque zone : figures (QTE lettres), ballon (chaser), course (animal). */
export type ModeKind = 'tricks' | 'chaser' | 'race';
export const MODES: ModeKind[] = ['tricks', 'chaser', 'race'];
export const MODE_LABEL: Record<ModeKind, string> = { tricks: 'FIGURES', chaser: 'BALLON', race: 'COURSE' };

import { SCENES } from '../zoneAssets';

const W_FULL = 800;

export type SceneBands = [number, number, number, number, string][];

export interface Sport {
  name: string;
  country: string;
  flag: string; // nom du sprite drapeau
  rule: string;
  /** Pour l'épreuve 1 : "figure" ou "esquive" (Nage dans le lagon). */
  trickWord?: string;
  /** Sprite de l'obstacle de l'épreuve 1 (défaut : plot). */
  hazard?: string;
  /** Sprites et décor propres au continent (renseignés plus bas). */
  player?: string;
  ball?: string;
  rival?: string;
  scene?: SceneBands;
}

export interface Zone {
  id: string;
  name: string;
  accent: string;
  sports: [Sport, Sport, Sport];
}

const TRICK_RULE = 'Tape chaque lettre avant que le cadre se referme. Après 30 s : 2 touches EN MÊME TEMPS. Une réussite accélère le rythme, un raté te ralentit.';
const BALL_RULE = 'Touche le ballon 8 fois en moins de 30 secondes !';
const RACE_RULE = 'Alterne ◀ ▶ très vite pour accélérer, saute les obstacles avec ▲ ou ESPACE. Bats le rival !';

export const ZONES: Zone[] = [
  {
    id: 'amerique',
    name: 'Amérique',
    accent: '#FF8A1F',
    sports: [
      { name: 'Skate Park', country: 'États-Unis', flag: 'flag_us', rule: TRICK_RULE, trickWord: 'figure' },
      { name: 'Football', country: 'Brésil', flag: 'flag_br', rule: BALL_RULE },
      { name: 'Course de Chevaux', country: 'Chili', flag: 'flag_cl', rule: RACE_RULE },
    ],
  },
  {
    id: 'europe-asie',
    name: 'Europe-Asie',
    accent: '#3C8CFF',
    sports: [
      { name: 'Descente à Ski', country: 'France', flag: 'flag_fr', rule: TRICK_RULE, trickWord: 'figure' },
      { name: 'Basket', country: 'Lituanie', flag: 'flag_lt', rule: BALL_RULE },
      { name: 'Course des Taureaux', country: 'Espagne', flag: 'flag_es', rule: RACE_RULE },
    ],
  },
  {
    id: 'afrique',
    name: 'Afrique',
    accent: '#3CC84B',
    sports: [
      { name: 'Surf', country: 'Afrique du Sud', flag: 'flag_za', rule: TRICK_RULE, trickWord: 'figure' },
      { name: 'Foot de rue', country: 'Sénégal', flag: 'flag_sn', rule: BALL_RULE },
      { name: 'Course de Chameaux', country: 'Maroc', flag: 'flag_ma', rule: RACE_RULE },
    ],
  },
  {
    id: 'oceanie',
    name: 'Océanie',
    accent: '#2ED8E0',
    sports: [
      {
        name: 'Nage dans le lagon',
        country: 'Polynésie',
        flag: 'flag_pf',
        rule: 'Tape chaque lettre avant que le cadre se referme pour esquiver les requins. Après 30 s : 2 touches EN MÊME TEMPS.',
        trickWord: 'esquive',
        hazard: 'shark',
      },
      { name: 'Rugby', country: 'Samoa', flag: 'flag_ws', rule: BALL_RULE },
      { name: 'Course de Kangourous', country: 'Australie', flag: 'flag_au', rule: RACE_RULE },
    ],
  },
];

// Assets par continent : sprites des planches Sprites-XX et décors des écrans du design.
for (const z of ZONES) {
  const [t, c, r] = z.sports;
  const sc = SCENES[z.id] ?? {};
  // on ne garde que les bandes plein cadre (le design y superpose ses propres panneaux de HUD)
  const full = (b?: SceneBands) => b?.filter(([x, , w]) => x === 0 && w >= W_FULL);
  z.sports.forEach((s, i) => (s.flag = `${z.id}_flag${i + 1}`));
  Object.assign(t, { player: `${z.id}_tricksPlayer`, hazard: `${z.id}_hazard`, scene: full(sc.tricks) });
  Object.assign(c, { player: `${z.id}_chaserPlayer`, ball: `${z.id}_ball`, scene: sc.chaser });
  Object.assign(r, { player: `${z.id}_racePlayer`, rival: `${z.id}_rival`, hazard: `${z.id}_hazard`, scene: full(sc.race) });
}

export const zoneById = (id: string) => ZONES.find((z) => z.id === id);
