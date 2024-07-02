import type { IPreferences } from 'bridge/PreferenceTypes';
import BridgeAPI from 'renderer/BridgeAPI';
import { useAsyncMemo } from 'renderer/react/hooks/useAsyncMemo';
import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useCallback, useContext, useMemo } from 'react';

export const Context = React.createContext<IPreferences | null>(null);

export function usePreferences(): IPreferences {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return context;
}

type Props = {
  children: React.ReactNode;
};

export function PreferencesContextProvider({ children }: Props): JSX.Element {
  const [rawGamePathSaved, setRawGamePath] = useSavedState<string | null>(
    'paths',
    null,
  );

  const bridgeGamePath = useAsyncMemo(
    useCallback(() => BridgeAPI.getGamePath(), []),
  );

  const rawGamePath =
    rawGamePathSaved ??
    bridgeGamePath ??
    'C:\\Program Files\\Battle.net\\Games\\Diablo II Resurrected';

  const [preExtractedDataPath, setPreExtractedDataPath] = useSavedState(
    'pre-extracted-data-path',
    `${rawGamePath}\\data`,
  );

  const [outputModName, setOutputModName] = useSavedState(
    'output-mod-name',
    'D2RMM',
  );

  const [isPreExtractedData, setIsPreExtractedData] = useSavedState(
    'pre-extracted-data',
    false,
    (bool) => String(bool),
    (str) => str === 'true',
  );

  const [isDirectMode, setIsDirectMode] = useSavedState(
    'direct-mod',
    false,
    (bool) => String(bool),
    (str) => str === 'true',
  );

  const [extraArgs, setExtraArgs] = useSavedState(
    'extra-args',
    [] as string[],
    (strarr) => strarr.join(' '),
    (str) => str.split(' '),
  );

  const gamePath = rawGamePath.replace(/\\$/, '');
  const mergedPath = `${gamePath}\\mods\\${outputModName}\\${outputModName}.mpq\\data`;
  const dataPath = `${gamePath}\\data`;

  const context = useMemo(
    (): IPreferences => ({
      dataPath,
      extraArgs,
      gamePath,
      isDirectMode,
      isPreExtractedData,
      mergedPath,
      outputModName,
      preExtractedDataPath,
      rawGamePath,
      setExtraArgs,
      setIsDirectMode,
      setIsPreExtractedData,
      setOutputModName,
      setPreExtractedDataPath,
      setRawGamePath,
    }),
    [
      dataPath,
      extraArgs,
      gamePath,
      isDirectMode,
      isPreExtractedData,
      mergedPath,
      outputModName,
      preExtractedDataPath,
      rawGamePath,
      setExtraArgs,
      setIsDirectMode,
      setIsPreExtractedData,
      setOutputModName,
      setPreExtractedDataPath,
      setRawGamePath,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
