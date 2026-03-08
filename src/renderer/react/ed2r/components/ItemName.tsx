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
export function getItemName(item: IItem, gameData: GameData): string {
  const row = gameData.itemCodeToItem[item.type];
  const typeName =
    row != null ? gameData.strings[row.namestr] ?? row.namestr : item.type_name;

  if (item.personalized) {
    return `${item.personalized_name}'s ${getItemName({ ...item, personalized: 0 }, gameData)}`;
  }

  if (item.given_runeword) {
    return processLocalization([
      gameData.strings[gameData.runewordNames[item.runeword_id]] ??
        '<Unknown Runeword>',
      typeName,
    ]).join('\n');
  }

  switch (item.quality) {
    case Quality.LOW:
      return processLocalization([
        gameData.strings['Low Quality'] ?? 'Low Quality',
        typeName,
      ]).join(' ');
    case Quality.NORMAL:
      return processLocalization([typeName]).join(' ');
    case Quality.SUPERIOR:
      return processLocalization([
        gameData.strings['Hiquality'] ?? 'Superior',
        typeName,
      ]).join(' ');
    case Quality.MAGIC: {
      const prefix = item.magic_prefix
        ? gameData.strings[gameData.magicPrefixNames[item.magic_prefix]] ??
          '<Unknown Magic Prefix>'
        : null;
      const suffix = item.magic_suffix
        ? gameData.strings[gameData.magicSuffixNames[item.magic_suffix]] ??
          '<Unknown Magic Suffix>'
        : null;
      return processLocalization([prefix, typeName, suffix]).join(' ');
    }
    case Quality.CRAFTED:
    case Quality.RARE: {
      const rareName =
        gameData.strings[gameData.rareNames[item.rare_name_id]] ??
        '<Unknown Rare 1>';
      const rareName2 =
        gameData.strings[gameData.rareNames[item.rare_name_id2]] ??
        '<Unknown Rare 2>';
      return processLocalization([rareName, rareName2, typeName]).reduce(
        (agg, val, idx) => agg + (idx === 2 ? '\n' : ' ') + val,
        '',
      );
    }
    case Quality.SET:
      return processLocalization([
        gameData.strings[gameData.setItemNames[item.set_id]] ?? '<Unknown Set>',
        typeName,
      ]).join('\n');
    case Quality.UNIQUE:
      return processLocalization([
        gameData.strings[gameData.uniqueItemNames[item.unique_id]] ??
          '<Unknown Unique>',
        typeName,
      ]).join('\n');
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

  if (item.given_runeword) {
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

function processLocalization(arr: (string | null)[]): string[] {
  // 1. Parse strings into objects
  const parsed = (arr.filter((str) => str != null) as string[]).map((str) => {
    const regex = /\[([a-z]+)\]([^[]+)/g;
    const matches = [...str.matchAll(regex)];

    // If no tags found, treat it as a "universal" string
    if (matches.length === 0) {
      return { value: str.trim() };
    }

    // Convert matches to a dictionary: { ms: "некачественный", fs: "некачественная", ... }
    return Object.fromEntries(matches.map((m) => [m[1], m[2].trim()]));
  });

  // 2. Determine the "Anchor" (the most restrictive element)
  // We ignore "universal" strings and find the one with the fewest keys
  const taggedElements = parsed.filter((obj) => !obj.isUniversal);

  if (taggedElements.length === 0) {
    // All strings were plain text
    return arr.filter((val) => val != null) as string[];
  }

  const anchor = taggedElements.reduce((prev, curr) =>
    Object.keys(curr).length < Object.keys(prev).length ? curr : prev,
  );

  // 3. Choose the target key (e.g., 'ms')
  const targetKey = Object.keys(anchor)[0];

  // 4. Assemble the final string
  return parsed.map(
    (obj) => obj.value || obj[targetKey] || Object.values(obj)[0],
  );
}
