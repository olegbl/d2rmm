import { TextField } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { usePathsContext } from './PathsContext';

const API = window.electron.API;

function getIsValidGamePath(path: string): boolean {
  const files = API.readDirectory(path);
  return files.find(({ name }) => name === 'D2R.exe') != null;
}

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const { gamePath, rawGamePath, setRawGamePath } = usePathsContext();

  const onChange = useCallback(
    (event): void => {
      setRawGamePath(event.target.value);
    },
    [setRawGamePath]
  );

  const isValidGamePath = useMemo(
    () => getIsValidGamePath(gamePath),
    [gamePath]
  );

  return (
    <>
      <TextField
        label="Diablo II Resurrected Game Directory"
        value={rawGamePath}
        onChange={onChange}
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
