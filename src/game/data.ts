// Données des zones et des sports. Pour ajouter une zone : ajouter une entrée à ZONES.

/** Ordre des épreuves dans chaque zone : figures (QTE lettres), ballon (chaser), course (animal). */
export type ModeKind = 'tricks' | 'chaser' | 'race';
export const MODES: ModeKind[] = ['tricks', 'chaser', 'race'];
export const MODE_LABEL: Record<ModeKind, string> = { tricks: 'FIGURES', chaser: 'BALLON', race: 'COURSE' };

export interface Sport {
  name: string;
  country: string;
  flag: string; // nom du sprite drapeau
  rule: string;
  /** Pour l'épreuve 1 : "figure" ou "esquive" (Nage dans le lagon). */
  trickWord?: string;
  /** Sprite de l'obstacle de l'épreuve 1 (défaut : plot). */
  hazard?: string;
}

export interface Zone {
  id: string;
  name: string;
  accent: string;
  sports: [Sport, Sport, Sport];
}

const TRICK_RULE = 'Tape les lettres affichées dans l’ordre pour réussir tes figures. Une réussite accélère le rythme, un raté te ralentit.';
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
        rule: 'Tape les lettres affichées dans l’ordre pour esquiver les requins. Une réussite accélère le rythme, un raté te ralentit.',
        trickWord: 'esquive',
        hazard: 'shark',
      },
      { name: 'Rugby', country: 'Samoa', flag: 'flag_ws', rule: BALL_RULE },
      { name: 'Course de Kangourous', country: 'Australie', flag: 'flag_au', rule: RACE_RULE },
    ],
  },
];

export const zoneById = (id: string) => ZONES.find((z) => z.id === id);
