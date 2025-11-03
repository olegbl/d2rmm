import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import resolvePath from 'renderer/utils/resolvePath';
import React, { useContext, useMemo } from 'react';

type IPath = string;

type IDataPathContext = {
  path: IPath;
};

export const Context = React.createContext<IDataPathContext | null>(null);

export function useDataPath(): IPath {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useDataPath must be used within a DataPathContextProvider',
    );
  }
  return context.path;
}

type Props = {
  children: React.ReactNode;
};

export function DataPathContextProvider({ children }: Props): JSX.Element {
  const gamePath = useSanitizedGamePath();
  const path = resolvePath(gamePath, 'data');

  const context = useMemo(
    (): IDataPathContext => ({
      path,
    }),
    [path],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
