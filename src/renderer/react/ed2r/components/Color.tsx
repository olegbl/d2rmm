export const COLOR_MAP: { [key: string]: string } = {
  ['ÿc;']: '#74199c',
  ['ÿc:']: '#216319',
  ['ÿc?']: '#abaf5d',
  ['ÿc@']: '#a07527',
  ['ÿc<']: '#358c25',
  ['ÿc=']: '#a2bd9f',
  ['ÿc>']: '#9b8d64',
  ['ÿc0']: '#ffffff',
  ['ÿc1']: '#ac4041',
  ['ÿc2']: '#4bb034',
  ['ÿc3']: '#5653a8',
  ['ÿc4']: '#99926d',
  ['ÿc5']: '#5e5e5e',
  ['ÿc6']: '#000000',
  ['ÿc7']: '#9e9b6f',
  ['ÿc8']: '#a77b2a',
  ['ÿc9']: '#afb05d',
  ['ÿcA']: '#216218',
  ['ÿcB']: '#4e509d',
  ['ÿcC']: '#48a431',
  ['ÿcD']: '#999166',
  ['ÿcE']: '#ffffff',
  ['ÿcF']: '#ffffff',
  ['ÿcG']: '#ffffff',
  ['ÿcH']: '#ffffff',
  ['ÿcI']: '#71a69a',
  ['ÿcJ']: '#a57928',
  ['ÿcK']: '#b7a293',
  ['ÿcL']: '#a57826',
  ['ÿcM']: '#69379c',
  ['ÿcN']: '#ada47a',
  ['ÿcO']: '#2f7795',
  ['ÿcP']: '#ab64a7',
  ['ÿcQ']: '#8a86b8',
  ['ÿcR']: '#48a832',
  ['ÿcS']: '#adb169',
  ['ÿcT']: '#8b3133',
  ['ÿcU']: '#6d8fad',
  ['ÿcV']: '#9e1e13',
};

export type ColorVar = { r: number; g: number; b: number; a: number };
export type ColorConst = [number, number, number, number];

export type ProfileHD = {
  [name: `FontColor${string}`]: string | ColorVar;
  TooltipStyle: {
    DefaultColor: string | ColorConst;
    QuestColor: string | ColorConst;
    RareColor: string | ColorConst;
    CraftedColor: string | ColorConst;
    TemperedColor: string | ColorConst;
    MagicColor: string | ColorConst;
    SetColor: string | ColorConst;
    UniqueColor: string | ColorConst;
    SocketedColor: string | ColorConst;
    EtherealColor: string | ColorConst;
    HealthPotionColor: string | ColorConst;
    ManaPotionColor: string | ColorConst;
    RejuvPotionColor: string | ColorConst;
    GoldColor: string | ColorConst;
    RuneColor: string | ColorConst;
    EventItemsColor: string | ColorConst;
  };
};

export function getColor(
  color: string | ColorConst,
  profileHD: ProfileHD,
): string {
  if (Array.isArray(color)) {
    const [r1, g1, b1, a] = color;
    const r = Math.round(r1 * 255);
    const g = Math.round(g1 * 255);
    const b = Math.round(b1 * 255);
    return `rgba(${r},${g},${b},${a})`;
  }

  let colorVar: string | ColorConst | ColorVar = color;
  while (typeof colorVar === 'string' && colorVar.startsWith('$FontColor')) {
    colorVar = profileHD[`FontColor${colorVar.slice('$FontColor'.length)}`];
  }

  if (typeof colorVar === 'object') {
    const { r, g, b, a } = colorVar;
    const a1 = a / 255;
    return `rgba(${r},${g},${b},${a1})`;
  }

  return colorVar;
}
