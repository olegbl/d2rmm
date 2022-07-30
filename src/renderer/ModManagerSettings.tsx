import {
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
} from '@mui/material';
import { useCallback, useMemo } from 'react';
import { usePreferences } from './Preferences';

const API = window.electron.API;

function getIsValidGamePath(path: string): boolean {
  const files = API.readDirectory(path);
  return files.find(({ name }) => name === 'D2R.exe') != null;
}

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const {
    gamePath,
    isDirectData,
    rawGamePath,
    setIsDirectData,
    setRawGamePath,
  } = usePreferences();

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
      <ListItem disablePadding={true}>
        <Tooltip title="Use data from the /data directory instead of extracting it from the game.">
          <ListItemButton onClick={() => setIsDirectData(!isDirectData)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={isDirectData}
                tabIndex={-1}
                disableRipple={true}
                inputProps={{
                  'aria-labelledby': 'use-direct-data',
                }}
              />
            </ListItemIcon>
            <ListItemText id="use-direct-data" primary="Use Direct Data" />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    </>
  );
}
