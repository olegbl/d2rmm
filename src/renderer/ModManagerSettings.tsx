import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Checkbox,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
    preExtractedDataPath,
    isDirectMode,
    isDryRun,
    isPreExtractedData,
    rawGamePath,
    setIsDirectMode,
    setIsDryRun,
    setIsPreExtractedData,
    setRawGamePath,
    setPreExtractedDataPath,
  } = usePreferences();

  const dataSource = isPreExtractedData ? 'directory' : 'casc';

  const onChangeGamePath = useCallback(
    (event): void => {
      setRawGamePath(event.target.value);
    },
    [setRawGamePath]
  );

  const onChangeDataSource = useCallback(
    (event): void => {
      setIsPreExtractedData(event.target.value === 'directory');
    },
    [setIsPreExtractedData]
  );

  const onChangePreExtractedDataPath = useCallback(
    (event): void => {
      setPreExtractedDataPath(event.target.value);
    },
    [setPreExtractedDataPath]
  );

  const isValidGamePath = useMemo(
    () => getIsValidGamePath(gamePath),
    [gamePath]
  );

  return (
    <List
      sx={{ width: '100%', flex: 1, overflow: 'auto' }}
      disablePadding={true}
    >
      <Accordion defaultExpanded={true} disableGutters={true} square={true}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="general-content"
          id="general-header"
        >
          <Typography>General</Typography>
        </AccordionSummary>
        <AccordionDetails id="general-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the directory where Diablo II: Resurrected is installed.
            &quot;D2R.exe&quot; should in in this directory.
          </Typography>
          <TextField
            fullWidth={true}
            variant="filled"
            label="Game Directory"
            value={rawGamePath}
            onChange={onChangeGamePath}
            error={!isValidGamePath}
            helperText={
              isValidGamePath
                ? null
                : "This doesn't look like a valid D2R game directory. Could not find D2R.exe inside."
            }
          />
          <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
          <Typography color="text.secondary" variant="subtitle2">
            Specify where D2RMM should pull the game&apos;s data from when
            installing mods.
          </Typography>
          <TextField
            select={true}
            fullWidth={true}
            variant="filled"
            label="Game Data Source"
            value={dataSource}
            onChange={onChangeDataSource}
          >
            <MenuItem value="casc">Casc Archive</MenuItem>
            <MenuItem value="directory">Pre-Extracted Data</MenuItem>
          </TextField>
          {dataSource === 'directory' ? (
            <>
              <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
              <Typography color="text.secondary" variant="subtitle2">
                Specify the location of the directory that contains
                pre-extracted data from Diablo II: Resurrected.
              </Typography>
              <TextField
                fullWidth={true}
                variant="filled"
                label="Data Directory"
                value={preExtractedDataPath}
                onChange={onChangePreExtractedDataPath}
                disabled={
                  true
                  // TODO: add support for this feature, for now it'll always use /data
                }
              />

              {isDirectMode &&
              preExtractedDataPath === `${rawGamePath}\\data` ? (
                <Alert severity="warning">
                  It looks like you are using direct mode and are setting the
                  source Data Directory to the &quot;data&quot; folder in the
                  game&apos;s installation directory. Are you{' '}
                  <strong>sure</strong> you want to do this? You will be reading
                  the vanilla state of the game&apos;s files from the same
                  directory that D2RMM will install mods to.
                </Alert>
              ) : null}
            </>
          ) : null}
        </AccordionDetails>
      </Accordion>
      <Accordion defaultExpanded={false} disableGutters={true} square={true}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="direct-mode-content"
          id="direct-mode-header"
        >
          <Typography>Direct Mode</Typography>
        </AccordionSummary>
        <AccordionDetails id="direct-mode-content">
          <Typography color="text.secondary" variant="subtitle2">
            Instead of extracting files to /mods/D2RMM/, extract them to /data/
            so that you can use -direct -txt when running the game. You will
            still need to manually extract game data to /data/ using CascView in
            order to use &quot;-direct&quot; in Diablo II: Resurrected.
          </Typography>
          <ListItemButton
            onClick={() => {
              setIsDirectMode(!isDirectMode);
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={isDirectMode}
                tabIndex={-1}
                disableRipple={true}
                inputProps={{
                  'aria-labelledby': 'enable-direct-mode',
                }}
              />
            </ListItemIcon>
            <ListItemText
              id="enable-direct-mode"
              primary="Enable Direct Mode"
            />
          </ListItemButton>
          <Tooltip title="Extract game files needed by the enabled mods but don't save the changes made by the mods. This will revert any files used by the enabled mods to their vanilla state, allowing you to uninstall mods without re-extracting the entire game archive.">
            <ListItemButton
              disabled={!isDirectMode}
              onClick={() => {
                setIsDryRun(!isDryRun);
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={isDryRun}
                  tabIndex={-1}
                  disabled={!isDirectMode}
                  disableRipple={true}
                  inputProps={{
                    'aria-labelledby': 'use-dry-run',
                  }}
                />
              </ListItemIcon>
              <ListItemText
                id="use-dry-run"
                primary="Enable Uninstall / Clean Mode"
              />
            </ListItemButton>
          </Tooltip>
          <Alert severity="warning">
            Do <strong>not</strong> turn this on if you do not know what you are
            doing.
          </Alert>
        </AccordionDetails>
      </Accordion>
    </List>
  );
}
