import { useEffect, useMemo, useState } from 'react';
import PathsContext from './PathsContext';

const PATHS_KEY = 'paths';

type Props = {
  children: React.ReactNode;
};

export default function PathsProvider({ children }: Props): JSX.Element {
  const [rawGamePath, setRawGamePath] = useState(
    localStorage.getItem(PATHS_KEY) ??
      'C:\\Battle.net\\Games\\Diablo II Resurrected'
  );

  const gamePath = rawGamePath.replace(/\\$/, '');

  const context = useMemo(
    () => ({
      gamePath,
      rawGamePath,
      mergedPath: `${gamePath}\\mods\\D2RMM\\D2RMM.mpq\\data`,
      setRawGamePath,
    }),
    [gamePath, rawGamePath]
  );

  useEffect(() => {
    localStorage.setItem(PATHS_KEY, rawGamePath);
  }, [rawGamePath]);

  return (
    <PathsContext.Provider value={context}>{children}</PathsContext.Provider>
  );
}
