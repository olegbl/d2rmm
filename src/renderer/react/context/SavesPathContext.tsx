import { getBaseSavesPath } from 'renderer/AppInfoAPI';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import useSavedState from 'renderer/react/hooks/useSavedState';
import resolvePath from 'renderer/utils/resolvePath';
import React, { useContext, useMemo } from 'react';

type IPath = string;
type ISetPath = React.Dispatch<React.SetStateAction<IPath>>;

type ISavesPathContext = {
  savesPath: IPath;
  setSavesPath: ISetPath;
  defaultSavesPath: IPath;
  finalSavesPath: IPath;
};

export const Context = React.createContext<ISavesPathContext | null>(null);

export function useSavesPath(): [IPath, ISetPath] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useSavesPath must be used within a SavesPathContextProvider',
    );
  }
  return [context.savesPath, context.setSavesPath];
}

export function useDefaultSavesPath(): IPath {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useDefaultSavesPath must be used within a SavesPathContextProvider',
    );
  }
  return context.defaultSavesPath;
}

export function useFinalSavesPath(): IPath {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useFinalSavesPath must be used within a SavesPathContextProvider',
    );
  }
  return context.finalSavesPath;
}

type Props = {
  children: React.ReactNode;
};

export function SavesPathContextProvider({ children }: Props): JSX.Element {
  const [savesPath, setSavesPath] = useSavedState<IPath>('saves-path', '');

  const [isDirectMode] = useIsDirectMode();
  const [outputModName] = useOutputModName();
  const defaultSavesPath = resolvePath(
    getBaseSavesPath(),
    ...(isDirectMode ? [] : ['mods', outputModName]),
  );
  const finalSavesPath =
    savesPath == null || savesPath === '' ? defaultSavesPath : savesPath;

  const context = useMemo(
    (): ISavesPathContext => ({
      savesPath,
      setSavesPath,
      defaultSavesPath,
      finalSavesPath,
    }),
    [savesPath, setSavesPath, defaultSavesPath, finalSavesPath],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
