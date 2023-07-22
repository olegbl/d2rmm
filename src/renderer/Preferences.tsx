import React, { useContext, useMemo } from 'react';
import useSavedState from './useSavedState';

export type IPreferences = {
  dataPath: string;
  preExtractedDataPath: string;
  gamePath: string;
  isDirectMode: boolean;
  isDryRun: boolean;
  isPreExtractedData: boolean;
  extraArgs: string[];
  mergedPath: string;
  rawGamePath: string;
  setIsDirectMode: (value: boolean) => void;
  setIsDryRun: (value: boolean) => void;
  setIsPreExtractedData: (value: boolean) => void;
  setExtraArgs: (value: string[]) => void;
  setRawGamePath: (value: string) => void;
  setPreExtractedDataPath: (value: string) => void;
};

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

export function PreferencesProvider({ children }: Props): JSX.Element {
  const [rawGamePath, setRawGamePath] = useSavedState(
    'paths',
    'C:\\Battle.net\\Games\\Diablo II Resurrected'
  );

  const [preExtractedDataPath, setPreExtractedDataPath] = useSavedState(
    'pre-extracted-data-path',
    'C:\\Battle.net\\Games\\Diablo II Resurrected\\data'
  );

  const [isPreExtractedData, setIsPreExtractedData] = useSavedState(
    'pre-extracted-data',
    false,
    (bool) => String(bool),
    (str) => str === 'true'
  );

  const [isDirectMode, setIsDirectMode] = useSavedState(
    'direct-mod',
    false,
    (bool) => String(bool),
    (str) => str === 'true'
  );

  const [isDryRun, setIsDryRun] = useSavedState(
    'dry-run',
    false,
    (bool) => String(bool),
    (str) => str === 'true'
  );

  const [extraArgs, setExtraArgs] = useSavedState(
    'extra-args',
    [] as string[],
    (strarr) => strarr.join(' '),
    (str) => str.split(' ')
  );

  const gamePath = rawGamePath.replace(/\\$/, '');
  const mergedPath = `${gamePath}\\mods\\D2RMM\\D2RMM.mpq\\data`;
  const dataPath = `${gamePath}\\data`;

  const context = useMemo(
    (): IPreferences => ({
      dataPath,
      preExtractedDataPath,
      gamePath,
      isDirectMode,
      isDryRun,
      isPreExtractedData,
      extraArgs,
      mergedPath,
      rawGamePath,
      setIsDirectMode,
      setIsDryRun,
      setIsPreExtractedData,
      setExtraArgs,
      setRawGamePath,
      setPreExtractedDataPath,
    }),
    [
      dataPath,
      preExtractedDataPath,
      gamePath,
      isDirectMode,
      isDryRun,
      isPreExtractedData,
      extraArgs,
      mergedPath,
      rawGamePath,
      setIsDirectMode,
      setIsDryRun,
      setIsPreExtractedData,
      setExtraArgs,
      setRawGamePath,
      setPreExtractedDataPath,
    ]
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
