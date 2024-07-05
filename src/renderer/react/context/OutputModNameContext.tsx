import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useContext, useMemo } from 'react';

type IName = string;
type ISetName = React.Dispatch<React.SetStateAction<IName>>;

type IOutputModNameContext = {
  name: IName;
  setName: ISetName;
};

export const Context = React.createContext<IOutputModNameContext | null>(null);

export function useOutputModName(): [IName, ISetName] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useOutputModName must be used within a OutputModNameContextProvider',
    );
  }
  return [context.name, context.setName];
}

type Props = {
  children: React.ReactNode;
};

export function OutputModNameContextProvider({ children }: Props): JSX.Element {
  const [name, setName] = useSavedState<IName>('output-mod-name', 'D2RMM');

  const context = useMemo(
    (): IOutputModNameContext => ({
      name,
      setName,
    }),
    [name, setName],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
