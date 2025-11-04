import BridgeAPI from 'renderer/BridgeAPI';
import { useAsyncMemo } from 'renderer/react/hooks/useAsyncMemo';
import useSavedState from 'renderer/react/hooks/useSavedState';
import resolvePath from 'renderer/utils/resolvePath';
import React, { useCallback, useContext, useMemo } from 'react';

type ISanitizedPath = string;
type IPath = string;
type ISavedPath = IPath | null;
type ISetSavedPath = React.Dispatch<React.SetStateAction<ISavedPath>>;

export type IGamePathContext = {
  sanitizedPath: ISanitizedPath;
  path: IPath;
  setPath: ISetSavedPath;
};

export const Context = React.createContext<IGamePathContext | null>(null);

export function useGamePath(): [IPath, ISetSavedPath] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.path, context.setPath];
}

export function useSanitizedGamePath(): IPath {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return context.sanitizedPath;
}

type Props = {
  children: React.ReactNode;
};

export function GamePathContextProvider({ children }: Props): JSX.Element {
  const [savedPath, setPath] = useSavedState<ISavedPath>('paths', null);

  const registryGamePath = useAsyncMemo(
    useCallback(() => BridgeAPI.getGamePath(), []),
  );

  const path =
    savedPath ??
    registryGamePath ??
    resolvePath(
      'C:',
      'Program Files',
      'Battle.net',
      'Games',
      'Diablo II Resurrected',
    );

  const sanitizedPath = path.replace(/\\$/, '');

  const context = useMemo(
    (): IGamePathContext => ({
      sanitizedPath,
      path,
      setPath,
    }),
    [sanitizedPath, path, setPath],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
