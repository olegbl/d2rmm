import { useMemo } from 'react';
import PathsContext from './PathsContext';
import useSavedState from './useSavedState';

type Props = {
  children: React.ReactNode;
};

export default function PathsProvider({ children }: Props): JSX.Element {
  const [rawGamePath, setRawGamePath] = useSavedState(
    'paths',
    'C:\\Battle.net\\Games\\Diablo II Resurrected'
  );

  const [isDirectData, setIsDirectData] = useSavedState(
    'direct-data',
    false,
    (bool) => String(bool),
    (str) => str === 'true'
  );

  const gamePath = rawGamePath.replace(/\\$/, '');
  const mergedPath = `${gamePath}\\mods\\D2RMM\\D2RMM.mpq\\data`;
  const dataPath = `${gamePath}\\data`;

  const context = useMemo(
    () => ({
      dataPath,
      gamePath,
      isDirectData,
      mergedPath,
      rawGamePath,
      setIsDirectData,
      setRawGamePath,
    }),
    [
      dataPath,
      gamePath,
      isDirectData,
      mergedPath,
      rawGamePath,
      setIsDirectData,
      setRawGamePath,
    ]
  );

  return (
    <PathsContext.Provider value={context}>{children}</PathsContext.Provider>
  );
}
