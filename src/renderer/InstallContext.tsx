import React, { useMemo } from 'react';

type SetIsInstalling = React.Dispatch<React.SetStateAction<boolean>>;

export type IInstallContext = {
  isInstalling: boolean;
  setIsInstalling: SetIsInstalling;
};

const InstallContext = React.createContext<IInstallContext | null>(null);

export function InstallContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isInstalling, setIsInstalling] = React.useState<boolean>(false);

  const context = useMemo(
    () => ({ isInstalling, setIsInstalling }),
    [isInstalling, setIsInstalling],
  );

  return (
    <InstallContext.Provider value={context}>
      {children}
    </InstallContext.Provider>
  );
}

export function useIsInstalling(): [boolean, SetIsInstalling] {
  const context = React.useContext(InstallContext);
  if (context == null) {
    throw new Error('useIsInstalling used outside of a InstallContextProvider');
  }
  return [context.isInstalling, context.setIsInstalling];
}
