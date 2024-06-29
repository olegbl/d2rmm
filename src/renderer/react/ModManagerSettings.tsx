import { useCallback } from 'react';
import ExpandMore from '@mui/icons-material/ExpandMore';
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
import BridgeAPI from '../BridgeAPI';
import { usePreferences } from './context/PreferencesContext';
import { IThemeMode, useThemeMode } from './context/ThemeContext';
import { useAsyncMemo } from './hooks/useAsyncMemo';

async function getIsValidGamePath(path: string): Promise<boolean> {
  const files = await BridgeAPI.readDirectory(path);
  return files.find(({ name }) => name === 'D2R.exe') != null;
}

async function getIsValidPreExtractedDataPath(path: string): Promise<boolean> {
  const files = await BridgeAPI.readDirectory(path);
  // search for the "global" folder
  return files.find(({ name }) => name === 'global') != null;
}

const StyledAccordion = styled(Accordion)(() => ({
  '&:before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  flexDirection: 'row-reverse',
  backgroundColor: theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledAccordionDetails = styled(AccordionDetails)(() => ({}));

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
      disablePadding={true}
      sx={{ width: '100%', flex: 1, overflow: 'auto', border: 'none' }}
    >
      <StyledAccordion
        defaultExpanded={!isValidGamePath || !isValidPreExtractedDataPath}
        disableGutters={true}
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="general-content"
          expandIcon={<ExpandMore />}
          id="general-header"
        >
          <Typography sx={{ marginLeft: 1 }}>General</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="general-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the directory where Diablo II: Resurrected is installed.
            &quot;D2R.exe&quot; should in in this directory.
          </Typography>
          <TextField
            error={!isValidGamePath}
            fullWidth={true}
            helperText={
              isValidGamePath
                ? null
                : "This doesn't look like a valid D2R game directory. Could not find D2R.exe inside."
            }
            label="Game Directory"
            onChange={(event) => setRawGamePath(event.target.value)}
            value={rawGamePath}
            variant="filled"
          />
          <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
          <Typography color="text.secondary" variant="subtitle2">
            Specify where D2RMM should pull the game&apos;s data from when
            installing mods.
          </Typography>
          <TextField
            fullWidth={true}
            label="Game Data Source"
            onChange={(event) =>
              setIsPreExtractedData(event.target.value === 'directory')
            }
            select={true}
            value={dataSource}
            variant="filled"
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
                error={!isValidPreExtractedDataPath}
                fullWidth={true}
                helperText={
                  isValidPreExtractedDataPath
                    ? null
                    : "This doesn't look like a valid D2R game data directory. Could not find the global directory inside. Are you sure you extracted the game data to this directory using CascView?"
                }
                label="Data Directory"
                onChange={(event) =>
                  setPreExtractedDataPath(event.target.value)
                }
                value={preExtractedDataPath}
                variant="filled"
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
                label="Output Mod Name"
                onChange={(event) =>
                  setOutputModName(
                    event.target.value.replace(/[^a-zA-Z0-9-_]/g, ''),
                  )
                }
                value={outputModName}
                variant="filled"
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
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="direct-mode-content"
          expandIcon={<ExpandMore />}
          id="direct-mode-header"
        >
          <Typography sx={{ marginLeft: 1 }}>Direct Mode</Typography>
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
                checked={isDirectMode}
                disableRipple={true}
                edge="start"
                inputProps={{
                  'aria-labelledby': 'enable-direct-mode',
                }}
                tabIndex={-1}
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
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="launcher-content"
          expandIcon={<ExpandMore />}
          id="launcher-header"
        >
          <Typography sx={{ marginLeft: 1 }}>Game Launcher</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="launcher-content">
          <Typography color="text.secondary" variant="subtitle2">
            Specify the extra arguments you&apos;d like to pass to Diablo II:
            Resurrected when starting it via D2RMM.
          </Typography>
          <TextField
            fullWidth={true}
            label="Extra Game Args"
            onChange={(event) => setExtraArgs(event.target.value.split(' '))}
            value={extraArgs.join(' ')}
            variant="filled"
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
                  checked={extraArgs.map((a) => a.trim()).includes(arg)}
                  disableRipple={true}
                  edge="start"
                  inputProps={{
                    'aria-labelledby': 'enable-respec',
                  }}
                  tabIndex={-1}
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
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="display-content"
          expandIcon={<ExpandMore />}
          id="display-header"
        >
          <Typography sx={{ marginLeft: 1 }}>Display</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="display-content">
          <TextField
            fullWidth={true}
            label="Theme"
            onChange={(event) => setThemeMode(event.target.value as IThemeMode)}
            select={true}
            value={themeMode}
            variant="filled"
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
