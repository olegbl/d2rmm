import { TextField } from '@mui/material';
import { useCallback, useMemo } from 'react';

const API = window.electron.API;

function getIsValidGamePath(paths: D2RMMPaths): boolean {
  const files = API.readDirectory(paths.gamePath, { filesOnly: true });
  return files.indexOf('D2R.exe') !== -1;
}

type Props = {
  paths: D2RMMPaths;
  gamePath: string;
  onChangeGamePath: (newPath: string) => unknown;
};

export default function ModManagerSettings({
  paths,
  gamePath,
  onChangeGamePath: onChangeGamePathFromProps,
}: Props): JSX.Element {
  const isValidGamePath = useMemo(() => getIsValidGamePath(paths), [paths]);

  const onChangeGamePath = useCallback(
    (event): void => {
      onChangeGamePathFromProps(event.target.value);
    },
    [onChangeGamePathFromProps]
  );

  return (
    <>
      <TextField
        label="Diablo II Resurrected Game Directory"
        value={gamePath}
        onChange={onChangeGamePath}
        error={!isValidGamePath}
        helperText={
          isValidGamePath
            ? null
            : "Doesn't look like a valid D2R game directory."
        }
      />
    </>
  );
}
