// Données des zones et des sports. Pour ajouter une zone : ajouter une entrée à ZONES.

export type ModeKind = 'runner' | 'chaser' | 'qte';

export interface Sport {
  name: string;
  country: string;
  flag: string;
  emoji: string;
  rule: string;
  /** Emojis utilisés par le moteur (obstacles, collectibles, rival...). */
  props: { obstacles?: string[]; collectible?: string; rival?: string; ball?: string };
}

export interface Zone {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  sports: [Sport, Sport, Sport]; // runner, chaser, qte
}

export const MODES: ModeKind[] = ['runner', 'chaser', 'qte'];

export const ZONES: Zone[] = [
  {
    id: 'amerique',
    name: 'Amérique',
    emoji: '🌎',
    accent: '#ff8a3d',
    sports: [
      { name: 'Skate Park', country: 'États-Unis', flag: '🇺🇸', emoji: '🛹', rule: 'Saute par-dessus les obstacles et ramasse les étoiles !', props: { obstacles: ['🚧', '🛢️', '📦'], collectible: '⭐' } },
      { name: 'Football', country: 'Brésil', flag: '🇧🇷', emoji: '⚽', rule: 'Touche le ballon 8 fois en moins de 30 secondes !', props: { ball: '⚽' } },
      { name: 'Course de Chevaux', country: 'Chili', flag: '🇨🇱', emoji: '🐴', rule: 'Appuie sur la bonne flèche à temps pour garder ton élan !', props: { rival: '🐎' } },
    ],
  },
  {
    id: 'europe-asie',
    name: 'Europe-Asie',
    emoji: '🌍',
    accent: '#4d8dff',
    sports: [
      { name: 'Descente à Ski', country: 'France', flag: '🇫🇷', emoji: '🎿', rule: 'Saute par-dessus les sapins et les rochers !', props: { obstacles: ['🌲', '🪨', '⛄'], collectible: '❄️' } },
      { name: 'Basket', country: 'Lituanie', flag: '🇱🇹', emoji: '🏀', rule: 'Touche le ballon 8 fois en moins de 30 secondes !', props: { ball: '🏀' } },
      { name: 'Course des Taureaux', country: 'Espagne', flag: '🇪🇸', emoji: '🐂', rule: 'Appuie sur la bonne flèche à temps pour garder ton élan !', props: { rival: '🐃' } },
    ],
  },
  {
    id: 'afrique',
    name: 'Afrique',
    emoji: '🌍',
    accent: '#3ccf6e',
    sports: [
      { name: 'Surf', country: 'Afrique du Sud', flag: '🇿🇦', emoji: '🏄', rule: 'Saute par-dessus les rochers et les requins !', props: { obstacles: ['🪨', '🦈', '🪸'], collectible: '🐚' } },
      { name: 'Foot de rue', country: 'Sénégal', flag: '🇸🇳', emoji: '⚽', rule: 'Touche le ballon 8 fois en moins de 30 secondes !', props: { ball: '⚽' } },
      { name: 'Course de Chameaux', country: 'Maroc', flag: '🇲🇦', emoji: '🐪', rule: 'Appuie sur la bonne flèche à temps pour garder ton élan !', props: { rival: '🐫' } },
    ],
  },
  {
    id: 'oceanie',
    name: 'Océanie',
    emoji: '🌏',
    accent: '#2fd4e0',
    sports: [
      { name: 'Piste du Bush', country: 'Australie', flag: '🇦🇺', emoji: '🐨', rule: 'Esquive les bêtes sauvages en sautant !', props: { obstacles: ['🐍', '🕷️', '🐊'], collectible: '🍃' } },
      { name: 'Rugby', country: 'Nouvelle-Zélande', flag: '🇳🇿', emoji: '🏉', rule: 'Touche le ballon 8 fois en moins de 30 secondes !', props: { ball: '🏉' } },
      { name: 'Course de Kangourous', country: 'Australie', flag: '🇦🇺', emoji: '🦘', rule: 'Appuie sur la bonne flèche à temps pour garder ton élan !', props: { rival: '🦘' } },
    ],
  },
];
