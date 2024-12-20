import { EventAPI } from 'renderer/EventAPI';
import React, { useContext, useEffect, useMemo, useState } from 'react';

type SetIsInstalling = React.Dispatch<React.SetStateAction<boolean>>;
type SetProgress = React.Dispatch<React.SetStateAction<number>>;

export type IInstallContext = {
  isInstalling: boolean;
  setIsInstalling: SetIsInstalling;
  progress: number;
  setProgress: SetProgress;
};

const InstallContext = React.createContext<IInstallContext | null>(null);

export function InstallContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const context = useMemo(
    () => ({ isInstalling, setIsInstalling, progress, setProgress }),
    [isInstalling, setIsInstalling, progress, setProgress],
  );

  useEffect(() => {
    const listener = EventAPI.addListener(
      'installationProgress',
      async (installedModsCount: number, totalModsCount: number) =>
        setProgress((installedModsCount / totalModsCount) * 100),
    );
    return () => EventAPI.removeListener('installationProgress', listener);
  }, [setProgress]);

  return (
    <InstallContext.Provider value={context}>
      {children}
    </InstallContext.Provider>
  );
}

export function useIsInstalling(): [boolean, SetIsInstalling] {
  const context = useContext(InstallContext);
  if (context == null) {
    throw new Error('useIsInstalling used outside of a InstallContextProvider');
  }
  return [context.isInstalling, context.setIsInstalling];
}

export function useInstallationProgress(): [number, SetProgress] {
  const context = useContext(InstallContext);
  if (context == null) {
    throw new Error(
      'useInstallationProgress used outside of a InstallContextProvider',
    );
  }
  return [context.progress, context.setProgress];
}
