import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useMemo } from 'react';

type IIsEnabled = boolean;
type ISetIsEnabled = React.Dispatch<React.SetStateAction<boolean>>;

export type IInstallBeforeRunContext = {
  isEnabled: IIsEnabled;
  setIsEnabled: ISetIsEnabled;
};

const InstallBeforeRunContext =
  React.createContext<IInstallBeforeRunContext | null>(null);

export default InstallBeforeRunContext;

type Props = {
  children: React.ReactNode;
};

export function InstallBeforeRunContextProvider({
  children,
}: Props): JSX.Element {
  const [isEnabled, setIsEnabled] = useSavedState<IIsEnabled>(
    'install-before-run',
    false,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const context = useMemo(
    () => ({ isEnabled, setIsEnabled }),
    [isEnabled, setIsEnabled],
  );

  return (
    <InstallBeforeRunContext.Provider value={context}>
      {children}
    </InstallBeforeRunContext.Provider>
  );
}

export function useInstallBeforeRun(): [IIsEnabled, ISetIsEnabled] {
  const context = React.useContext(InstallBeforeRunContext);
  if (context == null) {
    throw new Error(
      'useInstallBeforeRun must be used within a InstallBeforeRunContextProvider',
    );
  }
  return [context.isEnabled, context.setIsEnabled];
}
