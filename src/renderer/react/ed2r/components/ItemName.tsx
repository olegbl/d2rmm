import type { IItem } from 'bridge/third-party/d2s/d2/types';
import { Quality } from 'renderer/react/ed2r/ED2RConstants';
import {
  type GameData,
  useGameData,
} from 'renderer/react/ed2r/ED2RGameDataContext';
import {
  type GameFiles,
  useGameFiles,
} from 'renderer/react/ed2r/ED2RGameFilesContext';
import {
  COLOR_MAP,
  getColor,
  type ProfileHD,
} from 'renderer/react/ed2r/components/Color';
import React from 'react';

export function ItemName({ item }: { item: IItem }): React.ReactNode {
  const { gameData } = useGameData();
  const { gameFiles } = useGameFiles();
  const name = getItemName(item, gameData);
  const color = getItemColor(item, gameData, gameFiles);

  const lines = name
    // remove localization feminine/masculine indicators
    .replace(/(\[fs\]|\[ms\])/gm, '')
    // split into lines
    .split('\n')
    // split into tokens
    .map((line, lineIndex) =>
      (line.match(/(^|(?:ÿc.))(.+?)(?:(?=ÿc.)|$)/gm) ?? [])
        // separate color from text
        .map((token, tokenIndex) =>
          token.startsWith('ÿc')
            ? [COLOR_MAP[token.substring(0, 3)], token.substring(3)]
            : [lineIndex === 0 && tokenIndex === 0 ? color : undefined, token],
        ),
    );

  return lines.map((line, lineIndex) => (
    <span key={lineIndex} style={{ display: 'inline-block' }}>
      {line.map(([color, token], tokenIndex) => (
        <span key={tokenIndex} style={{ color }}>
          {token}
        </span>
      ))}
    </span>
  ));
}

export function getItemName(item: IItem, gameData?: GameData): string {
  let typeName = item.type_name;
  if (gameData != null) {
    const row = gameData.itemCodeToItem[item.type];
    if (row != null) {
      typeName = gameData.strings[row.namestr] ?? row.namestr;
    }
  }

  if (item.personalized) {
    return `${item.personalized_name}'s ${getItemName({ ...item, personalized: 0 }, gameData)}`;
  }

  // TODO: item.runeword_id ("Runeword" + id*) runes.txt (Name -> Key) item-runes.json
  //       * id > 75 -> +25
  //         id <= 75 -> +25
  //         etc...?
  //         2718 -> 48 (delirium)
  //         2786 -> 173 (mosaic)
  if (item.runeword_name != null) {
    // TODO: add recipe line
    return `${item.runeword_name}\n${typeName}`;
  }

  switch (item.quality) {
    case Quality.LOW:
      return `Low Quality ${typeName}`;
    case Quality.NORMAL:
      return typeName;
    case Quality.SUPERIOR:
      return `Superior ${typeName}`;
    case Quality.MAGIC:
      return [item.magic_prefix_name, typeName, item.magic_suffix_name]
        .filter((value) => value != null)
        .join(' ');
    case Quality.CRAFTED:
    case Quality.RARE:
      return [item.rare_name, item.rare_name2]
        .filter((value) => value != null)
        .join(' ')
        .concat(`\n${typeName}`);
    case Quality.SET:
      return `${item.set_name}\n${typeName}`;
    case Quality.UNIQUE:
      return `${item.unique_name}\n${typeName}`;
  }

  return typeName;
}

export function getItemColor(
  item: IItem,
  gameData: GameData,
  gameFiles: GameFiles,
): string {
  const categories = gameData.itemCodeToCategories[item.type] ?? [];
  const profileHD = gameFiles['global/ui/layouts/_profilehd.json'] as ProfileHD;

  if (item.runeword_name != null) {
    return getColor(profileHD.TooltipStyle.UniqueColor, profileHD);
  }

  if (categories.includes('Rune')) {
    return getColor(profileHD.TooltipStyle.RuneColor, profileHD);
  }

  if (categories.includes('Rejuv Potion')) {
    return getColor(profileHD.TooltipStyle.RejuvPotionColor, profileHD);
  }

  if (categories.includes('Healing Potion')) {
    return getColor(profileHD.TooltipStyle.HealthPotionColor, profileHD);
  }

  if (categories.includes('Mana Potion')) {
    return getColor(profileHD.TooltipStyle.ManaPotionColor, profileHD);
  }

  if (categories.includes('Quest')) {
    return getColor(profileHD.TooltipStyle.QuestColor, profileHD);
  }

  if (categories.includes('Event')) {
    return getColor(profileHD.TooltipStyle.EventItemsColor, profileHD);
  }

  switch (item.quality) {
    case Quality.LOW:
    case Quality.NORMAL:
    case Quality.SUPERIOR:
      if (item.ethereal) {
        return getColor(profileHD.TooltipStyle.EtherealColor, profileHD);
      }
      if (item.socketed) {
        return getColor(profileHD.TooltipStyle.SocketedColor, profileHD);
      }
      return getColor(profileHD.TooltipStyle.DefaultColor, profileHD);
    case Quality.MAGIC:
      return getColor(profileHD.TooltipStyle.MagicColor, profileHD);
    case Quality.CRAFTED:
      return getColor(profileHD.TooltipStyle.CraftedColor, profileHD);
    case Quality.RARE:
      return getColor(profileHD.TooltipStyle.RareColor, profileHD);
    case Quality.SET:
      return getColor(profileHD.TooltipStyle.SetColor, profileHD);
    case Quality.UNIQUE:
      return getColor(profileHD.TooltipStyle.UniqueColor, profileHD);
  }

  return '#FFFFFF';
}
