import { useCallback, useEffect, useMemo, useState } from 'react';

const MODS_ORDER_KEY = 'mods-order';

type ModByID = { [id: string]: Mod };

export default function useOrderedMods(
  mods: Mod[]
): [Mod[], (from: number, to: number) => unknown] {
  const [modsOrder, setModsOrder] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(MODS_ORDER_KEY) ?? '[]');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(MODS_ORDER_KEY, JSON.stringify(modsOrder));
  }, [modsOrder]);

  // update modsOrder to match current mods state
  useEffect(() => {
    const modIDs = mods.map((mod) => mod.id);
    const addMods = modIDs.filter((mod) => modsOrder.indexOf(mod) === -1);
    const remMods = modsOrder.filter((mod) => modIDs.indexOf(mod) === -1);
    if (addMods.length > 0 || remMods.length > 0) {
      setModsOrder((prevOrder) => [
        ...prevOrder.filter((mod) => modIDs.indexOf(mod) !== -1),
        ...addMods,
      ]);
    }
  }, [mods, modsOrder]);

  // reorder mods by dragging
  const move = useCallback((from: number, to: number): void => {
    setModsOrder((prevOrder) => {
      const newOrder = prevOrder.slice();
      const [removed] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, removed);
      return newOrder;
    });
  }, []);

  const modByID = useMemo(
    () => mods.reduce((agg, mod) => ({ ...agg, [mod.id]: mod }), {} as ModByID),
    [mods]
  );

  const orderedMods = useMemo(
    () => modsOrder.map((mod) => modByID[mod]).filter(Boolean),
    [modByID, modsOrder]
  );

  return [orderedMods, move];
}
