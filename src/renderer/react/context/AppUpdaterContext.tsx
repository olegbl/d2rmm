import type { IUpdaterAPI, Update } from 'bridge/Updater';
import { consumeAPI } from 'renderer/IPC';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import { useSavedStateJSON } from 'renderer/react/hooks/useSavedState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const UpdaterAPI = consumeAPI<IUpdaterAPI>('UpdaterAPI');

function useUpdate(): [Update | null, () => void] {
  const [update, setUpdate] = useState<Update | null>(null);

  const onCheckForUpdates = useCallback(() => {
    UpdaterAPI.getLatestUpdate()
      .then((update) => {
        setUpdate(update);
      })
      .catch(console.error);
  }, []);

  useEffect(onCheckForUpdates, [onCheckForUpdates]);

  return [update, onCheckForUpdates];
}

export type IAppUpdaterSettings = {
  isDialogEnabled: boolean;
  ignoredUpdateVersion: string;
};

export type ISetAppUpdaterSettings = React.Dispatch<
  React.SetStateAction<IAppUpdaterSettings>
>;

function useSettings(): [IAppUpdaterSettings, ISetAppUpdaterSettings] {
  return useSavedStateJSON<IAppUpdaterSettings>('app-updater-settings', {
    isDialogEnabled: true,
    ignoredUpdateVersion: '',
  });
}

export type IAppUpdaterContext = {
  isDialogEnabled: boolean;
  setIsDialogEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  ignoredUpdateVersion: string;
  setIgnoredUpdateVersion: React.Dispatch<React.SetStateAction<string>>;
  update: Update | null;
  onCheckForUpdates: () => void;
  onIgnoreUpdate: () => void;
  onInstallUpdate: () => void;
};

export const Context = React.createContext<IAppUpdaterContext | null>(null);

export function AppUpdaterContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [{ isDialogEnabled, ignoredUpdateVersion }, setSettings] =
    useSettings();

  const setIsDialogEnabled = useCallback(
    (action: React.SetStateAction<boolean>) => {
      setSettings((settings) => ({
        ...settings,
        isDialogEnabled:
          typeof action === 'function'
            ? action(settings.isDialogEnabled)
            : action,
      }));
    },
    [setSettings],
  );

  const setIgnoredUpdateVersion = useCallback(
    (action: React.SetStateAction<string>) => {
      setSettings((settings) => ({
        ...settings,
        ignoredUpdateVersion:
          typeof action === 'function'
            ? action(settings.ignoredUpdateVersion)
            : action,
      }));
    },
    [setSettings],
  );

  const [update, onCheckForUpdates] = useUpdate();

  const onIgnoreUpdate = useCallback(() => {
    if (update?.version != null) {
      setIgnoredUpdateVersion(update?.version);
    }
  }, [setIgnoredUpdateVersion, update?.version]);

  const onInstallUpdate = useAsyncCallback(async () => {
    if (update != null) {
      await UpdaterAPI.installUpdate(update);
    }
  }, [update]);

  const context = useMemo(
    (): IAppUpdaterContext => ({
      isDialogEnabled,
      setIsDialogEnabled,
      ignoredUpdateVersion,
      setIgnoredUpdateVersion,
      update,
      onCheckForUpdates,
      onIgnoreUpdate,
      onInstallUpdate,
    }),
    [
      isDialogEnabled,
      setIsDialogEnabled,
      ignoredUpdateVersion,
      setIgnoredUpdateVersion,
      update,
      onCheckForUpdates,
      onIgnoreUpdate,
      onInstallUpdate,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useAppUpdaterContext(): IAppUpdaterContext {
  const context = React.useContext(Context);
  if (context == null) {
    throw new Error(
      'useAppUpdater must be used within a UpdatesContextProvider',
    );
  }
  return context;
}
