export const CELL_SIZE = 48;

export const COLOR_MAP: { [key: string]: string } = {
  ['ÿc;']: '#b700ff',
  ['ÿc:']: '#008c00',
  ['ÿc@']: '#ffb200',
  ['ÿc<']: '#00cf00',
  ['ÿc=']: '#ffffff',
  ['ÿc0']: '#ffffff',
  ['ÿc1']: '#ff5b5b',
  ['ÿc2']: '#00ff00',
  ['ÿc3']: '#7b7bff',
  ['ÿc4']: '#cebc84',
  ['ÿc5']: '#777777',
  ['ÿc6']: '#040404',
  ['ÿc7']: '#cebc84',
  ['ÿc8']: '#ffb200',
  ['ÿc9']: '#ffff72',
  ['ÿcA']: '#008c00',
  ['ÿcB']: '#7b7bff',
  ['ÿcC']: '#00ff00',
  ['ÿcD']: '#cebc84',
  ['ÿcE']: '#ffffff',
  ['ÿcF']: '#ffffff',
  ['ÿcG']: '#ffffff',
  ['ÿcH']: '#ffffff',
  ['ÿcI']: '#89e1d2',
  ['ÿcJ']: '#ffb200',
  ['ÿcK']: '#00ffc9',
  ['ÿcL']: '#ffb200',
  ['ÿcM']: '#f0db99',
  ['ÿcN']: '#0bafe1',
  ['ÿcO']: '#ff8cff',
  ['ÿcP']: '#b3b3ff',
  ['ÿcQ']: '#00ff00',
  ['ÿcR']: '#ffff72',
  ['ÿcS']: '#a33a3a',
  ['ÿcT']: '#8eccff',
  ['ÿcU']: '#ff0000',
};

export enum LocationID {
  NONE = 0,
  EQUIPPED = 1,
  BELT = 2,
}

export enum AltPositionID {
  NONE = 0,
  INVENTORY = 1,
  CUBE = 4,
  STASH = 5,
}

export enum EquippedID {
  NONE = 0,
  HEAD = 1,
  NECK = 2,
  TORSO = 3,
  RIGHT_HAND = 4,
  LEFT_HAND = 5,
  RIGHT_FINGER = 6,
  LEFT_FINGER = 7,
  WAIST = 8,
  FEET = 9,
  HANDS = 10,
  ALT_RIGHT_HAND = 11,
  ALT_LEFT_HAND = 12,
}

export enum Quality {
  LOW = 1,
  NORMAL = 2,
  SUPERIOR = 3,
  MAGIC = 4,
  SET = 5,
  RARE = 6,
  UNIQUE = 7,
  CRAFTED = 8,
}
