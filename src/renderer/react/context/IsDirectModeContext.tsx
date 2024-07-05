import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useContext, useMemo } from 'react';

type IIsEnabled = boolean;
type ISetIsEnabled = React.Dispatch<React.SetStateAction<IIsEnabled>>;

type IIsDirectModeContext = {
  isEnabled: IIsEnabled;
  setIsEnabled: ISetIsEnabled;
};

export const Context = React.createContext<IIsDirectModeContext | null>(null);

export function useIsDirectMode(): [IIsEnabled, ISetIsEnabled] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useIsDirectMode must be used within a IsDirectModeContextProvider',
    );
  }
  return [context.isEnabled, context.setIsEnabled];
}

type Props = {
  children: React.ReactNode;
};

export function IsDirectModeContextProvider({ children }: Props): JSX.Element {
  const [isEnabled, setIsEnabled] = useSavedState<IIsEnabled>(
    'direct-mod', // yes, this is a typo
    false,
    (bool) => String(bool),
    (str) => str === 'true',
  );

  const context = useMemo(
    (): IIsDirectModeContext => ({
      isEnabled,
      setIsEnabled,
    }),
    [isEnabled, setIsEnabled],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
