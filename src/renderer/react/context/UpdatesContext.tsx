import React, { useCallback, useContext, useMemo, useState } from 'react';
import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';

type IUpdateState = {
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  nexusUpdates: ModUpdaterDownload[];
  nexusDownloads: ModUpdaterDownload[];
};
type ISetUpdateState = React.Dispatch<React.SetStateAction<IUpdateState>>;

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
    (arg: React.SetStateAction<IUpdateState>) => {
      setUpdates((oldUpdates) => {
        const newUpdates = new Map(oldUpdates);
        const oldState = oldUpdates.get(modID) ?? DEFAULT_UPDATE_STATE;
        const newState = typeof arg === 'function' ? arg(oldState) : arg;
        newUpdates.set(modID, newState);
        return newUpdates;
      });
    },
    [modID, setUpdates],
  );
  return [updateState, setUpdateState];
}
