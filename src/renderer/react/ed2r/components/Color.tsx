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
