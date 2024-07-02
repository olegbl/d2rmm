import React, { useCallback, useContext, useMemo, useState } from 'react';
import type { Mod } from 'bridge/BridgeAPI';
import type { IModUpdaterAPI, ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import { consumeAPI } from 'renderer/IPC';
import { compareVersions } from 'renderer/utils/version';
import { INexusAuthState } from './NexusModsContext';
import getNexusModID from './utils/getNexusModID';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');

function getUpdatesFromDownloads(
  currentVersion: string,
  downloads: ModUpdaterDownload[],
): ModUpdaterDownload[] {
  return downloads.filter(
    (download) => compareVersions(download.version, currentVersion) < 0,
  );
}

type IUpdateState = {
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  nexusUpdates: ModUpdaterDownload[];
  nexusDownloads: ModUpdaterDownload[];
};
type ISetUpdateState = React.Dispatch<
  React.SetStateAction<IUpdateState | null>
>;

type IUpdates = Map<string, IUpdateState>;
type ISetUpdates = React.Dispatch<React.SetStateAction<IUpdates>>;

const DEFAULT_UPDATE_STATE = {
  isUpdateChecked: false,
  isUpdateAvailable: false,
  nexusUpdates: [],
  nexusDownloads: [],
};

export type IUpdatesContext = {
  updates: IUpdates;
  setUpdates: ISetUpdates;
};

export const Context = React.createContext<IUpdatesContext | null>(null);

export function UpdatesContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [updates, setUpdates] = useState<IUpdates>(new Map());

  const context = useMemo(
    (): IUpdatesContext => ({
      updates,
      setUpdates,
    }),
    [updates, setUpdates],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useModUpdates(): [IUpdates, ISetUpdates] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No updates context available.');
  }
  return [context.updates, context.setUpdates];
}

export function useModUpdate(modID: string): [IUpdateState, ISetUpdateState] {
  const [updates, setUpdates] = useModUpdates();
  const updateState = updates.get(modID) ?? DEFAULT_UPDATE_STATE;
  const setUpdateState = useCallback(
    (arg: React.SetStateAction<IUpdateState | null>) =>
      setUpdates((oldUpdates) => {
        const newUpdates = new Map(oldUpdates);
        const oldState = oldUpdates.get(modID) ?? DEFAULT_UPDATE_STATE;
        const newState = typeof arg === 'function' ? arg(oldState) : arg;
        if (newState == null) {
          newUpdates.delete(modID);
        } else {
          newUpdates.set(modID, newState);
        }
        return newUpdates;
      }),
    [modID, setUpdates],
  );
  return [updateState, setUpdateState];
}

export function useUpdateModVersion(): (
  modID: string,
  version: string,
) => Promise<boolean> {
  const [, setUpdates] = useModUpdates();

  return useCallback(
    async (modID: string, newVersion: string): Promise<boolean> => {
      let isUpdated = false;
      setUpdates((oldUpdates) => {
        const oldUpdateState = oldUpdates.get(modID);
        if (oldUpdateState == null) {
          isUpdated = false;
          return oldUpdates;
        }

        const nexusUpdates = getUpdatesFromDownloads(
          newVersion,
          oldUpdateState.nexusDownloads,
        );

        const newUpdates = new Map(oldUpdates);
        newUpdates.set(modID, {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads: oldUpdateState.nexusDownloads,
        });
        isUpdated = true;
        return newUpdates;
      });
      return isUpdated;
    },
    [setUpdates],
  );
}

export function useCheckModForUpdates(
  nexusAuthState: INexusAuthState,
  modOuter?: Mod,
): (modInner?: Mod) => Promise<void> {
  const [, setUpdates] = useModUpdates();

  return useCallback(
    async (modInner?: Mod): Promise<void> => {
      const mod = modOuter ?? modInner;
      const nexusModID = getNexusModID(mod);
      if (nexusAuthState.apiKey == null || nexusModID == null || mod == null) {
        return;
      }

      const currentVersion = mod.info.version ?? '0';

      const nexusDownloads = (
        await ModUpdaterAPI.getDownloadsViaNexus(
          nexusAuthState.apiKey,
          nexusModID,
        )
      ).sort((a, b) => compareVersions(a.version, b.version));

      const nexusUpdates = getUpdatesFromDownloads(
        currentVersion,
        nexusDownloads,
      );

      setUpdates((oldUpdates) => {
        const newUpdates = new Map(oldUpdates);
        newUpdates.set(mod.id, {
          isUpdateChecked: true,
          isUpdateAvailable: nexusUpdates.length > 0,
          nexusUpdates,
          nexusDownloads,
        });
        return newUpdates;
      });
    },
    [modOuter, nexusAuthState.apiKey, setUpdates],
  );
}
