import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useContext, useMemo } from 'react';

type IIsEnabled = boolean;
type ISetIsEnabled = React.Dispatch<React.SetStateAction<IIsEnabled>>;

type IIsPreExtractedDataContext = {
  isEnabled: IIsEnabled;
  setIsEnabled: ISetIsEnabled;
};

export const Context = React.createContext<IIsPreExtractedDataContext | null>(
  null,
);

export function useIsPreExtractedData(): [IIsEnabled, ISetIsEnabled] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useIsPreExtractedData must be used within a IsPreExtractedDataContextProvider',
    );
  }
  return [context.isEnabled, context.setIsEnabled];
}

type Props = {
  children: React.ReactNode;
};

export function IsPreExtractedDataContextProvider({
  children,
}: Props): JSX.Element {
  const [isEnabled, setIsEnabled] = useSavedState<IIsEnabled>(
    'pre-extracted-data',
    false,
    (bool) => String(bool),
    (str) => str === 'true',
  );

  const context = useMemo(
    (): IIsPreExtractedDataContext => ({
      isEnabled,
      setIsEnabled,
    }),
    [isEnabled, setIsEnabled],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
