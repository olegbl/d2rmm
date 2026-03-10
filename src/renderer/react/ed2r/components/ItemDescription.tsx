import type { IItem, IMagicProperty } from 'bridge/third-party/d2s/d2/types';
import {
  allAttributes,
  enhanceAttributeDescription,
  groupAttributes,
  useGameData,
} from 'renderer/react/ed2r/ED2RGameDataContext';
import { COLOR_MAP } from 'renderer/react/ed2r/components/Color';
import React, { useMemo } from 'react';

function useItemAttributes(item: IItem): IMagicProperty[] {
  const { gameData } = useGameData();
  return useMemo(
    () =>
      // TODO: this doesn't quite work correctly when there are color codes inside
      enhanceAttributeDescription(
        groupAttributes(allAttributes(item), gameData),
        gameData,
      ),
    [item, gameData],
  );
}

export function ItemDescription({ item }: { item: IItem }): React.ReactNode {
  const attributes = useItemAttributes(item);

  const lines = attributes
    .filter((attr) => attr.visible !== false && Boolean(attr.description))
    .map((attr) => attr.description)
    // split into tokens
    .map((line, _lineIndex) =>
      (line.match(/(^|(?:ÿc.))(.+?)(?:(?=ÿc.)|$)/gm) ?? [])
        // separate color from text
        .map((token, _tokenIndex) =>
          token.startsWith('ÿc')
            ? [COLOR_MAP[token.substring(0, 3)], token.substring(3)]
            : [undefined, token],
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
