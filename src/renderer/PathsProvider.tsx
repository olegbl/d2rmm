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

  const gamePath = rawGamePath.replace(/\\$/, '');
  const mergedPath = `${gamePath}\\mods\\D2RMM\\D2RMM.mpq\\data`;
  const dataPath = `${gamePath}\\data`;

  const context = useMemo(
    () => ({
      gamePath,
      rawGamePath,
      mergedPath,
      setRawGamePath,
      dataPath,
    }),
    [dataPath, gamePath, mergedPath, rawGamePath, setRawGamePath]
  );

  return (
    <PathsContext.Provider value={context}>{children}</PathsContext.Provider>
  );
}
