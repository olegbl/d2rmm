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
    isDirectMode,
    isDryRun,
    isPreExtractedData,
    rawGamePath,
    setIsDirectMode,
    setIsDryRun,
    setIsPreExtractedData,
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
        <Tooltip title="Use data directly from the game's data directory, instead of extracting it from the game's CASC archive. You will need to manually extract game data to /data/ using CascView in order to use this option.">
          <ListItemButton
            onClick={() => {
              setIsPreExtractedData(!isPreExtractedData);
              // these two options are incompatible since we can't use the same
              // data that we're writing as also the source of truth
              if (!isPreExtractedData) {
                setIsDirectMode(false);
                setIsDryRun(false);
              }
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={isPreExtractedData}
                tabIndex={-1}
                disableRipple={true}
                inputProps={{
                  'aria-labelledby': 'use-pre-extracted-data',
                }}
              />
            </ListItemIcon>
            <ListItemText
              id="use-pre-extracted-data"
              primary="Use Pre-Extracted Data"
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
      <ListItem disablePadding={true}>
        <Tooltip title="Instead of extracting files to /mods/D2RMM/, extract them to /data/ so that you can use -direct -txt when running the game. You will need to manually extract game data to /data/ using CascView in order to use this option.">
          <ListItemButton
            onClick={() => {
              setIsDirectMode(!isDirectMode);
              // these two options are incompatible since we can't use the same
              // data that we're writing as also the source of truth
              if (!isDirectMode) {
                setIsPreExtractedData(false);
              }
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={isDirectMode}
                tabIndex={-1}
                disableRipple={true}
                inputProps={{
                  'aria-labelledby': 'use-direct-mode',
                }}
              />
            </ListItemIcon>
            <ListItemText id="use-direct-mode" primary="Use Direct Mode" />
          </ListItemButton>
        </Tooltip>
      </ListItem>
      <ListItem disablePadding={true}>
        <Tooltip title="Extract game files and let mods process them, but don't save changes, so the files won't actually be modified. This can let you easily revert any changes to your /data/ directory if you were using direct mode.">
          <ListItemButton
            onClick={() => {
              setIsDryRun(!isDryRun);
              // these two options are incompatible since we can't use the same
              // data that we're writing as also the source of truth
              if (!isDirectMode) {
                setIsPreExtractedData(false);
              }
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={isDryRun}
                tabIndex={-1}
                disableRipple={true}
                inputProps={{
                  'aria-labelledby': 'use-dry-run',
                }}
              />
            </ListItemIcon>
            <ListItemText id="use-dry-run" primary="Dry Run" />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    </>
  );
}
