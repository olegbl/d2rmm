import { useSanitizedGamePath } from 'renderer/react/context/GamePathContext';
import useSavedState from 'renderer/react/hooks/useSavedState';
import resolvePath from 'renderer/utils/resolvePath';
import React, { useContext, useMemo } from 'react';

type IPath = string;
type ISetPath = React.Dispatch<React.SetStateAction<IPath>>;

type IPreExtractedDataPathContext = {
  path: IPath;
  setPath: ISetPath;
};

export const Context = React.createContext<IPreExtractedDataPathContext | null>(
  null,
);

export function usePreExtractedDataPath(): [IPath, ISetPath] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'usePreExtractedDataPath must be used within a PreExtractedDataPathContextProvider',
    );
  }
  return [context.path, context.setPath];
}

type Props = {
  children: React.ReactNode;
};

export function PreExtractedDataPathContextProvider({
  children,
}: Props): JSX.Element {
  const gamePath = useSanitizedGamePath();

  const [path, setPath] = useSavedState<IPath>(
    'pre-extracted-data-path',
    resolvePath(gamePath, 'data'),
  );

  const context = useMemo(
    (): IPreExtractedDataPathContext => ({
      path,
      setPath,
    }),
    [path, setPath],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
