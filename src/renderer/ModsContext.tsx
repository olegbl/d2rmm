import React, { useCallback, useContext, useMemo } from 'react';
import useSavedState from './useSavedState';

type IEnabledMods = { [id: string]: boolean };

type ISetEnabledMods = React.Dispatch<React.SetStateAction<IEnabledMods>>;

export type IModsContext = {
  enabledMods: IEnabledMods;
  setEnabledMods: ISetEnabledMods;
};

export const Context = React.createContext<IModsContext | null>(null);

export function ModsContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [enabledMods, setEnabledMods] = useSavedState(
    'enabled-mods',
    {} as IEnabledMods,
    (mods) => JSON.stringify(mods),
    (modsstr) => JSON.parse(modsstr)
  );

  const context = useMemo(
    (): IModsContext => ({
      enabledMods,
      setEnabledMods,
    }),
    [enabledMods, setEnabledMods]
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useEnabledMods(): [IEnabledMods, ISetEnabledMods] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.enabledMods, context.setEnabledMods];
}

export function useToggleMod(): (mod: Mod) => void {
  const [, setEnabledMods] = useEnabledMods();
  return useCallback(
    (mod: Mod): void =>
      setEnabledMods((prev) => ({
        ...prev,
        [mod.id]: !prev[mod.id],
      })),
    [setEnabledMods]
  );
}
