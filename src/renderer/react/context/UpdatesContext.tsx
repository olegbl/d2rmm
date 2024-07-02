import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import React, { useMemo, useState } from 'react';

export type IUpdateState = {
  isUpdateChecked: boolean;
  isUpdateAvailable: boolean;
  nexusUpdates: ModUpdaterDownload[];
  nexusDownloads: ModUpdaterDownload[];
};

export type ISetUpdateState = React.Dispatch<
  React.SetStateAction<IUpdateState | null>
>;

export type IUpdates = Map<string, IUpdateState>;

export type ISetUpdates = React.Dispatch<React.SetStateAction<IUpdates>>;

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
