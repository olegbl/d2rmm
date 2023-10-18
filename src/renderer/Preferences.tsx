import React, { useContext, useMemo } from 'react';
import useSavedState from './useSavedState';

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

  const [outputModName, setOutputModName] = useSavedState(
    'output-mod-name',
    'D2RMM'
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

  const [extraArgs, setExtraArgs] = useSavedState(
    'extra-args',
    [] as string[],
    (strarr) => strarr.join(' '),
    (str) => str.split(' ')
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
    ]
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
