import { useCallback } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  styled,
} from '@mui/material';
import BridgeAPI from './BridgeAPI';
import { usePreferences } from './Preferences';
import { IThemeMode, useThemeMode } from './ThemeContext';
import { useAsyncMemo } from './useAsyncMemo';

async function getIsValidGamePath(path: string): Promise<boolean> {
  const files = await BridgeAPI.readDirectory(path);
  return files.find(({ name }) => name === 'D2R.exe') != null;
}

async function getIsValidPreExtractedDataPath(path: string): Promise<boolean> {
  const files = await BridgeAPI.readDirectory(path);
  // search for the "global" folder
  return files.find(({ name }) => name === 'global') != null;
}

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
}));

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const {
    extraArgs,
    gamePath,
    isDirectMode,
    isPreExtractedData,
    mergedPath,
    outputModName,
    preExtractedDataPath,
    rawGamePath,
    setExtraArgs,
    setIsDirectMode,
    setIsPreExtractedData,
    setOutputModName,
    setPreExtractedDataPath,
    setRawGamePath,
  } = usePreferences();

  const [themeMode, setThemeMode] = useThemeMode();

  const dataSource = isPreExtractedData ? 'directory' : 'casc';

  const isValidGamePath =
    useAsyncMemo(useCallback(() => getIsValidGamePath(gamePath), [gamePath])) ??
    true;

  const isValidPreExtractedDataPath =
    useAsyncMemo(
      useCallback(
        () =>
          dataSource === 'directory'
            ? getIsValidPreExtractedDataPath(preExtractedDataPath)
            : Promise.resolve(true),
        [dataSource, preExtractedDataPath],
      ),
    ) ?? true;

  return (
    <List
      sx={{ width: '100%', flex: 1, overflow: 'auto', border: 'none' }}
      disablePadding={true}
    >
      <StyledAccordion
        defaultExpanded={!isValidGamePath || !isValidPreExtractedDataPath}
        disableGutters={true}
        square={true}
        elevation={0}
      >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="general-content"
          id="general-header"
        >
          <Typography>General</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="general-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the directory where Diablo II: Resurrected is installed.
            &quot;D2R.exe&quot; should in in this directory.
          </Typography>
          <TextField
            fullWidth={true}
            variant="filled"
            label="Game Directory"
            value={rawGamePath}
            onChange={(event) => setRawGamePath(event.target.value)}
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
            onChange={(event) =>
              setIsPreExtractedData(event.target.value === 'directory')
            }
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
                onChange={(event) =>
                  setPreExtractedDataPath(event.target.value)
                }
                error={!isValidPreExtractedDataPath}
                helperText={
                  isValidPreExtractedDataPath
                    ? null
                    : "This doesn't look like a valid D2R game data directory. Could not find the global directory inside. Are you sure you extracted the game data to this directory using CascView?"
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
          {!isDirectMode ? (
            <>
              <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
              <Typography color="text.secondary" variant="subtitle2">
                Specify the name of the Diablo II: Resurrected MPQ data mod that
                D2RMM will generate when mods are installed.
              </Typography>
              <TextField
                fullWidth={true}
                variant="filled"
                label="Output Mod Name"
                value={outputModName}
                onChange={(event) =>
                  setOutputModName(
                    event.target.value.replace(/[^a-zA-Z0-9-_]/g, ''),
                  )
                }
              />
              <Typography color="text.secondary" variant="subtitle2">
                Generated files will be located in &ldquo;{mergedPath}\&rdquo;.
              </Typography>
              <Typography color="text.secondary" variant="subtitle2">
                Save game files will be located in &ldquo;%UserProfile%\Saved
                Games\Diablo II Resurrected\mods\{outputModName}\&rdquo;.
              </Typography>
            </>
          ) : null}
        </StyledAccordionDetails>
      </StyledAccordion>
      <StyledAccordion
        defaultExpanded={isDirectMode}
        disableGutters={true}
        square={true}
        elevation={0}
      >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="direct-mode-content"
          id="direct-mode-header"
        >
          <Typography>Direct Mode</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="direct-mode-content">
          <Typography color="text.secondary" variant="subtitle2">
            Instead of generating files in &lt;D2R&gt;/mods/, generate them in
            &lt;D2R&gt;/data/ so that you can use -direct -txt when running the
            game. You will still need to manually extract game data to
            &lt;D2R&gt;/data/ using CascView in order to use &quot;-direct&quot;
            with Diablo II: Resurrected.
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
          {!isDirectMode ? null : (
            <Typography color="text.secondary" variant="subtitle2">
              Generated files will be located in &ldquo;{gamePath}\data\&rdquo;.
            </Typography>
          )}
          <Alert severity="warning">
            Do <strong>not</strong> turn this on if you do not know what you are
            doing.
          </Alert>
        </StyledAccordionDetails>
      </StyledAccordion>
      <StyledAccordion
        defaultExpanded={false}
        disableGutters={true}
        square={true}
        elevation={0}
      >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="launcher-content"
          id="launcher-header"
        >
          <Typography>Game Launcher</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="launcher-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the extra arguments you&apos;d like to pass to Diablo II:
            Resurrected when starting it via D2RMM.
          </Typography>
          <TextField
            fullWidth={true}
            variant="filled"
            label="Extra Game Args"
            value={extraArgs.join(' ')}
            onChange={(event) => setExtraArgs(event.target.value.split(' '))}
          />
          {['-enablerespec', '-resetofflinemaps', '-w'].map((arg) => (
            <ListItemButton
              key={arg}
              onClick={() => {
                if (extraArgs.map((a) => a.trim()).includes(arg)) {
                  setExtraArgs(extraArgs.filter((a) => a.trim() !== arg));
                } else {
                  setExtraArgs([...extraArgs, arg]);
                }
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={extraArgs.map((a) => a.trim()).includes(arg)}
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
        </StyledAccordionDetails>
      </StyledAccordion>

      <StyledAccordion
        defaultExpanded={false}
        disableGutters={true}
        square={true}
        elevation={0}
      >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="display-content"
          id="display-header"
        >
          <Typography>Display</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="display-content">
          <TextField
            select={true}
            fullWidth={true}
            variant="filled"
            label="Theme"
            value={themeMode}
            onChange={(event) => setThemeMode(event.target.value as IThemeMode)}
          >
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </TextField>
        </StyledAccordionDetails>
      </StyledAccordion>
    </List>
  );
}
