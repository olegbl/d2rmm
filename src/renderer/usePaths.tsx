import { useEffect, useMemo, useState } from 'react';

const PATHS_KEY = 'paths';

export default function usePaths(): [
  D2RMMPaths,
  string,
  React.Dispatch<React.SetStateAction<string>>
] {
  const [rawGamePath, setGamePath] = useState(
    localStorage.getItem(PATHS_KEY) ??
      'C:\\Battle.net\\Games\\Diablo II Resurrected'
  );

  const gamePath = rawGamePath.replace(/\\$/, '');

  const paths = useMemo(
    () => ({
      gamePath,
      mergedPath: `${gamePath}\\mods\\D2RMM\\D2RMM.mpq\\data`,
      modPath: `${gamePath}\\mods\\D2RMM\\mods`,
    }),
    [gamePath]
  );

  useEffect(() => {
    localStorage.setItem(PATHS_KEY, rawGamePath);
  }, [rawGamePath]);

  return [paths, rawGamePath, setGamePath];
}
