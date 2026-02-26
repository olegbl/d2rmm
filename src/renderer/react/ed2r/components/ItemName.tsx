import type { IItem } from 'bridge/third-party/d2s/d2/types';
import { Quality } from 'renderer/react/ed2r/ED2RConstants';
import { COLOR_MAP, useItemColor } from 'renderer/react/ed2r/components/Color';
import React from 'react';

export function ItemName({ item }: { item: IItem }): React.ReactNode {
  const name = getItemName(item);
  const color = useItemColor(item);

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

export function getItemName(item: IItem): string {
  if (item.personalized) {
    return `${item.personalized_name}'s ${getItemName({ ...item, personalized: 0 })}`;
  }

  // TODO: item.runeword_id ("Runeword" + id*) runes.txt (Name -> Key) item-runes.json
  //       * id > 75 -> +25
  //         id <= 75 -> +25
  //         etc...?
  //         2718 -> 48 (delirium)
  //         2786 -> 173 (mosaic)
  if (item.runeword_name != null) {
    // TODO: add recipe line
    return `${item.runeword_name}\n${item.type_name}`;
  }

  switch (item.quality) {
    case Quality.LOW:
      return `Low Quality ${item.type_name}`;
    case Quality.NORMAL:
      return item.type_name;
    case Quality.SUPERIOR:
      return `Superior ${item.type_name}`;
    case Quality.MAGIC:
      return [item.magic_prefix_name, item.type_name, item.magic_suffix_name]
        .filter((value) => value != null)
        .join(' ');
    case Quality.CRAFTED:
    case Quality.RARE:
      return [item.rare_name, item.rare_name2]
        .filter((value) => value != null)
        .join(' ')
        .concat(`\n${item.type_name}`);
    case Quality.SET:
      return `${item.set_name}\n${item.type_name}`;
    case Quality.UNIQUE:
      return `${item.unique_name}\n${item.type_name}`;
  }

  return item.type_name;
}
