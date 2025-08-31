import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import React, { useContext, useMemo } from 'react';
import resolvePath from 'renderer/utils/resolvePath';

type IPath = string;

type IOutputPathContext = {
  path: IPath;
};

export const Context = React.createContext<IOutputPathContext | null>(null);

export function useOutputPath(): IPath {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useOutputPath must be used within a OutputPathContextProvider',
    );
  }
  return context.path;
}

type Props = {
  children: React.ReactNode;
};

export function OutputPathContextProvider({ children }: Props): JSX.Element {
  const gamePath = useSanitizedGamePath();
  const [outputModName] = useOutputModName();
  const path = resolvePath(gamePath, 'mods', outputModName, `${outputModName}.mpq`, 'data');

  const context = useMemo(
    (): IOutputPathContext => ({
      path,
    }),
    [path],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
