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
    isPreExtractedData,
    extraArgs,
    rawGamePath,
    setIsDirectMode,
    setIsPreExtractedData,
    setExtraArgs,
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

  const onChangeExtraArgs = useCallback(
    (event): void => {
      setExtraArgs(event.target.value.split(' '));
    },
    [setExtraArgs]
  );

  const isExtraArgIncluded = useCallback(
    (extraArg: string): boolean => {
      return extraArgs.map((arg) => arg.trim()).includes(extraArg);
    },
    [extraArgs]
  );

  const onToggleExtraArg = useCallback(
    (newArg: string): void => {
      if (extraArgs.map((arg) => arg.trim()).includes(newArg)) {
        setExtraArgs(extraArgs.filter((arg) => arg.trim() !== newArg));
      } else {
        setExtraArgs([...extraArgs, newArg]);
      }
    },
    [extraArgs, setExtraArgs]
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
      <Accordion
        defaultExpanded={isDirectMode}
        disableGutters={true}
        square={true}
      >
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
          <Alert severity="warning">
            Do <strong>not</strong> turn this on if you do not know what you are
            doing.
          </Alert>
        </AccordionDetails>
      </Accordion>
      <Accordion defaultExpanded={false} disableGutters={true} square={true}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="launcher-content"
          id="launcher-header"
        >
          <Typography>Game Launcher</Typography>
        </AccordionSummary>
        <AccordionDetails id="launcher-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the extra arguments you&apos;d like to pass to Diablo II:
            Resurrected when starting it via D2RMM.
          </Typography>
          <TextField
            fullWidth={true}
            variant="filled"
            label="Extra Game Args"
            value={extraArgs.join(' ')}
            onChange={onChangeExtraArgs}
          />
          {['-enablerespec', '-resetofflinemaps', '-w'].map((arg) => (
            <ListItemButton
              onClick={() => {
                onToggleExtraArg(arg);
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={isExtraArgIncluded(arg)}
                  tabIndex={-1}
                  disableRipple={true}
                  inputProps={{
                    'aria-labelledby': 'enable-respec',
                  }}
                />
              </ListItemIcon>
              <ListItemText id="enable-respec" primary={`Include "${arg}"`} />
            </ListItemButton>
          ))}
        </AccordionDetails>
      </Accordion>
    </List>
  );
}
