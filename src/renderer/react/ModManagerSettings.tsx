import { useCallback } from 'react';
import ExpandMore from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
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

  const {
    nexusApiState,
    nexusAuthState,
    nexusSignIn,
    nexusSignOut,
    isRegisteredAsNxmProtocolHandler,
    registerAsNxmProtocolHandler,
    unregisterAsNxmProtocolHandler,
  } = useNexusAuthState();

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
      <StyledAccordion
        defaultExpanded={false}
        disableGutters={true}
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="nexus-content"
          expandIcon={<ExpandMore />}
          id="nexus-header"
        >
          <Typography sx={{ marginLeft: 1 }}>Nexus Mods</Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="nexus-content">
          <Stack spacing={2} sx={{ marginTop: 1 }}>
            {nexusAuthState.apiKey == null ? (
              <Alert severity="warning">
                <Typography>
                  You are not signed in to Nexus Mods. You will not be able to
                  check for mod updates or download mod updates directly via
                  D2RMM (for premium Nexus Mods users).
                </Typography>
                <Button
                  color="warning"
                  onClick={nexusSignIn}
                  sx={{ marginTop: 1 }}
                  variant="contained"
                >
                  Sign In
                </Button>
              </Alert>
            ) : (
              <Alert
                classes={{
                  root: 'MuiAlert-fullwidth',
                }}
                severity="info"
              >
                {nexusAuthState.name ? (
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Typography>
                      Logged in as {nexusAuthState.name} ({nexusAuthState.email}
                      )
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip
                      title={
                        nexusAuthState.isPremium
                          ? undefined
                          : 'Free users cannot initiate mod downloads from within D2RMM. You must go to Nexus Mods website in order to download or update mods.'
                      }
                    >
                      <Chip
                        color={nexusAuthState.isPremium ? 'success' : 'warning'}
                        label={
                          nexusAuthState.isPremium
                            ? 'Premium User'
                            : 'Free User'
                        }
                        size="small"
                      />
                    </Tooltip>
                  </Box>
                ) : (
                  <Typography>Logged in. Loading details...</Typography>
                )}
                {nexusApiState != null && (
                  <>
                    <NexusRequestLimit
                      limit={nexusApiState.dailyLimit}
                      remaining={nexusApiState.dailyRemaining}
                      reset={nexusApiState.dailyReset}
                      type="daily"
                    />
                    <NexusRequestLimit
                      limit={nexusApiState.hourlyLimit}
                      remaining={nexusApiState.hourlyRemaining}
                      reset={nexusApiState.hourlyReset}
                      type="hourly"
                    />
                  </>
                )}
                <Button
                  onClick={nexusSignOut}
                  sx={{ marginTop: 1 }}
                  variant="outlined"
                >
                  Sign Out
                </Button>
              </Alert>
            )}
            {isRegisteredAsNxmProtocolHandler ? (
              <Alert severity="info">
                <Typography>
                  D2RMM is registered as the handler for nxm:// URLs.
                </Typography>
                <Button
                  onClick={unregisterAsNxmProtocolHandler}
                  sx={{ marginTop: 1 }}
                  variant="outlined"
                >
                  Unregister as Handler
                </Button>
              </Alert>
            ) : (
              <Alert severity="warning">
                <Typography>
                  D2RMM is not registered as the handler for nxm:// URLs. You
                  will not be able to download mods directly via D2RMM when
                  using Mod Manager links on Nexus Mods.
                </Typography>
                <Button
                  color="warning"
                  onClick={registerAsNxmProtocolHandler}
                  sx={{ marginTop: 1 }}
                  variant="outlined"
                >
                  Register as Handler
                </Button>
              </Alert>
            )}
          </Stack>
        </StyledAccordionDetails>
      </StyledAccordion>
    </List>
  );
}

function NexusRequestLimit({
  remaining,
  limit,
  reset,
  type,
}: {
  remaining: string;
  limit: string;
  reset: string;
  type: string;
}): JSX.Element {
  const remainingInt = parseInt(remaining, 10);
  const limitInt = parseInt(limit, 10);
  const usedPercent = (remainingInt / limitInt) * 100;
  const resetStringForCurrentLocale = new Date(reset).toLocaleString();
  return (
    <Box sx={{ marginTop: 1 }}>
      <LinearProgress
        style={{ height: 10 }}
        value={usedPercent}
        variant="determinate"
      />
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
        <Box>
          {remaining} / {limit} {type} requests remaining
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box>resets at {resetStringForCurrentLocale}</Box>
      </Box>
    </Box>
  );
}
