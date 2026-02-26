import type { IItem, IMagicProperty } from 'bridge/third-party/d2s/d2/types';
import {
  allAttributes,
  enhanceAttributeDescription,
  groupAttributes,
  useGameData,
} from 'renderer/react/ed2r/ED2RGameDataContext';
import React, { useMemo } from 'react';

function useItemAttributes(item: IItem): IMagicProperty[] {
  const { gameData } = useGameData();
  return useMemo(
    () =>
      enhanceAttributeDescription(
        groupAttributes(allAttributes(item), gameData),
        gameData,
      ),
    [item, gameData],
  );
}

export function ItemDescription({ item }: { item: IItem }): React.ReactNode {
  const attributes = useItemAttributes(item);
  return attributes
    .filter((attr) => attr.visible !== false && Boolean(attr.description))
    .map((attr) => (
      <span key={attr.description} style={{ display: 'inline-block' }}>
        {attr.description}
      </span>
    ));
}
