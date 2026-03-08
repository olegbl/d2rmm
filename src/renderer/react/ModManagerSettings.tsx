import { getBaseSavesPath } from 'renderer/AppInfoAPI';
import BridgeAPI from 'renderer/BridgeAPI';
import ShellAPI from 'renderer/ShellAPI';
import i18n, {
  LOCALE_DISPLAY_NAMES,
  SUPPORTED_LOCALES,
  type Locale,
} from 'renderer/i18n';
import { useAppUpdaterContext } from 'renderer/react/context/AppUpdaterContext';
import { useDataPath } from 'renderer/react/context/DataPathContext';
import { useExtraGameLaunchArgs } from 'renderer/react/context/ExtraGameLaunchArgsContext';
import {
  useGamePath,
  useSanitizedGamePath,
} from 'renderer/react/context/GamePathContext';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useIsPreExtractedData } from 'renderer/react/context/IsPreExtractedDataContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import { useOutputPath } from 'renderer/react/context/OutputPathContext';
import { usePreExtractedDataPath } from 'renderer/react/context/PreExtractedDataPathContext';
import {
  useDefaultSavesPath,
  useFinalSavesPath,
  useSavesPath,
} from 'renderer/react/context/SavesPathContext';
import { IThemeMode, useThemeMode } from 'renderer/react/context/ThemeContext';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import { useAsyncMemo } from 'renderer/react/hooks/useAsyncMemo';
import { useIsFocused } from 'renderer/react/hooks/useIsFocused';
import useSavedState from 'renderer/react/hooks/useSavedState';
import InstallBeforeRunSettings from 'renderer/react/mmsettings/InstallBeforeRunSettings';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  Link,
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
  const { t } = useTranslation();
  const [extraArgs, setExtraArgs] = useExtraGameLaunchArgs();
  const [rawGamePath, setRawGamePath] = useGamePath();
  const gamePath = useSanitizedGamePath();
  const [isDirectMode, setIsDirectMode] = useIsDirectMode();
  const [isPreExtractedData, setIsPreExtractedData] = useIsPreExtractedData();
  const [preExtractedDataPath, setPreExtractedDataPath] =
    usePreExtractedDataPath();
  const [outputModName, setOutputModName] = useOutputModName();
  const mergedPath = useOutputPath();
  const dataPath = useDataPath();
  const outputPath = isDirectMode ? dataPath : mergedPath;
  const [savesPath, setSavesPath] = useSavesPath();
  const baseSavesPath = getBaseSavesPath();
  const defaultSavesPath = useDefaultSavesPath();
  const finalSavesPath = useFinalSavesPath();
  const [isSavesPathFocused, onSavesPathFocus, onSavesPathBlur] =
    useIsFocused();

  const [themeMode, setThemeMode] = useThemeMode();

  const [locale, setLocale] = useSavedState<Locale>('locale', 'en-US');

  const onLocaleChange = useCallback(
    async (newLocale: Locale): Promise<void> => {
      setLocale(newLocale);
      await i18n.changeLanguage(newLocale);
      try {
        const LocaleAPI = (await import('renderer/BridgeAPI')).default;
        await (
          LocaleAPI as unknown as { setLocale: (l: string) => Promise<void> }
        ).setLocale(newLocale);
      } catch {
        // LocaleAPI may not be available in all environments
      }
    },
    [setLocale],
  );

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

  const isIdenticalInputAndOutput =
    preExtractedDataPath.toLowerCase() === outputPath.toLowerCase();

  const {
    nexusApiState,
    nexusAuthState,
    nexusSignIn,
    nexusSignOut,
    isRegisteredAsNxmProtocolHandler,
    registerAsNxmProtocolHandler,
    unregisterAsNxmProtocolHandler,
  } = useNexusAuthState();

  const {
    update,
    onInstallUpdate,
    isDialogEnabled: isAppUpdaterDialogEnabled,
    setIsDialogEnabled: setIsAppUpdaterDialogEnabled,
  } = useAppUpdaterContext();

  return (
    <List
      disablePadding={true}
      sx={{ width: '100%', flex: 1, overflow: 'auto', border: 'none' }}
    >
      <StyledAccordion
        defaultExpanded={
          useRef(
            !isValidGamePath ||
              !isValidPreExtractedDataPath ||
              isIdenticalInputAndOutput,
          ).current
        }
        disableGutters={true}
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="general-content"
          expandIcon={<ExpandMore />}
          id="general-header"
        >
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.general.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="general-content">
          <Typography color="text.secondary" variant="subtitle2">
            {t('settings.general.gameDir.description')}
          </Typography>
          <TextField
            error={!isValidGamePath}
            fullWidth={true}
            helperText={
              isValidGamePath ? null : t('settings.general.gameDir.error')
            }
            label={t('settings.general.gameDir.label')}
            onChange={(event) => setRawGamePath(event.target.value)}
            value={rawGamePath}
            variant="filled"
          />
          <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
          <Typography color="text.secondary" variant="subtitle2">
            {t('settings.general.dataSource.description')}
          </Typography>
          <TextField
            fullWidth={true}
            label={t('settings.general.dataSource.label')}
            onChange={(event) =>
              setIsPreExtractedData(event.target.value === 'directory')
            }
            select={true}
            value={dataSource}
            variant="filled"
          >
            <MenuItem value="casc">
              {t('settings.general.dataSource.casc')}
            </MenuItem>
            <MenuItem value="directory">
              {t('settings.general.dataSource.directory')}
            </MenuItem>
          </TextField>
          {dataSource === 'directory' ? (
            <>
              <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
              <Typography color="text.secondary" variant="subtitle2">
                {t('settings.general.dataDir.description')}
              </Typography>
              <TextField
                error={!isValidPreExtractedDataPath}
                fullWidth={true}
                helperText={
                  isValidPreExtractedDataPath
                    ? null
                    : t('settings.general.dataDir.error')
                }
                label={t('settings.general.dataDir.label')}
                onChange={(event) =>
                  setPreExtractedDataPath(event.target.value)
                }
                value={preExtractedDataPath}
                variant="filled"
              />
              {isIdenticalInputAndOutput ? (
                <Alert severity="error">
                  {t('settings.general.dataDir.sameAsOutput', {
                    path: outputPath,
                  })}
                </Alert>
              ) : null}
            </>
          ) : null}
          {!isDirectMode ? (
            <>
              <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
              <Typography color="text.secondary" variant="subtitle2">
                {t('settings.general.outputModName.description')}
              </Typography>
              <TextField
                fullWidth={true}
                label={t('settings.general.outputModName.label')}
                onChange={(event) =>
                  setOutputModName(
                    event.target.value.replace(/[^a-zA-Z0-9-_]/g, ''),
                  )
                }
                value={outputModName}
                variant="filled"
              />
            </>
          ) : null}
          {!isDirectMode && outputModName.trim() === '' ? (
            <Alert severity="warning">
              <Typography>
                {t('settings.general.outputModName.empty')}
              </Typography>
            </Alert>
          ) : null}
          <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
          <Typography color="text.secondary" variant="subtitle2">
            {t('settings.general.savesPath.description')}
          </Typography>
          <TextField
            fullWidth={true}
            label={t('settings.general.savesPath.label')}
            onBlur={onSavesPathBlur}
            onChange={(event) => setSavesPath(event.target.value)}
            onFocus={onSavesPathFocus}
            placeholder={defaultSavesPath}
            value={isSavesPathFocused ? savesPath : finalSavesPath}
            variant="filled"
          />
          {!finalSavesPath.startsWith(baseSavesPath) ? (
            <Alert severity="warning">
              <Typography>
                {t('settings.general.savesPath.outsideBase', {
                  path: baseSavesPath,
                })}{' '}
                <Link
                  href="#"
                  onClick={() => {
                    ShellAPI.showItemInFolder(baseSavesPath).catch(
                      console.error,
                    );
                  }}
                >
                  {baseSavesPath}\
                </Link>
                &rdquo;. Are you sure this is right?
              </Typography>
            </Alert>
          ) : null}
          <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
          <Alert severity="info" sx={{ marginTop: 2 }}>
            <Typography color="text.secondary" variant="subtitle2">
              {
                t('settings.general.outputPath.info', { path: '\x00' }).split(
                  '\x00',
                )[0]
              }
              <Link
                href="#"
                onClick={() => {
                  ShellAPI.showItemInFolder(outputPath).catch(console.error);
                }}
              >
                {outputPath}
              </Link>
              {
                t('settings.general.outputPath.info', { path: '\x00' }).split(
                  '\x00',
                )[1]
              }
            </Typography>
          </Alert>
          <Alert severity="info" sx={{ marginTop: 1 }}>
            <Typography color="text.secondary" variant="subtitle2">
              {
                t('settings.general.savesLocation.info', {
                  path: '\x00',
                }).split('\x00')[0]
              }
              <Link
                href="#"
                onClick={() => {
                  ShellAPI.showItemInFolder(finalSavesPath).catch(
                    console.error,
                  );
                }}
              >
                {finalSavesPath}
              </Link>
              {
                t('settings.general.savesLocation.info', {
                  path: '\x00',
                }).split('\x00')[1]
              }
            </Typography>
          </Alert>
          <InstallBeforeRunSettings />
        </StyledAccordionDetails>
      </StyledAccordion>
      <StyledAccordion
        defaultExpanded={useRef(isDirectMode).current}
        disableGutters={true}
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="direct-mode-content"
          expandIcon={<ExpandMore />}
          id="direct-mode-header"
        >
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.directMode.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="direct-mode-content">
          <Typography color="text.secondary" variant="subtitle2">
            {t('settings.directMode.description')}
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
              primary={t('settings.directMode.enable')}
            />
          </ListItemButton>
          {!isDirectMode ? null : (
            <Typography color="text.secondary" variant="subtitle2">
              {t('settings.directMode.outputPath', { path: outputPath })}
            </Typography>
          )}
          <Alert severity="warning">{t('settings.directMode.warning')}</Alert>
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
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.launcher.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="launcher-content">
          <Typography color="text.secondary" variant="subtitle2">
            {t('settings.launcher.description')}
          </Typography>
          <TextField
            fullWidth={true}
            label={t('settings.launcher.extraArgs.label')}
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
              <ListItemText
                id="enable-respec"
                primary={t('settings.launcher.arg.include', { arg })}
              />
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
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.display.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="display-content">
          <TextField
            fullWidth={true}
            label={t('settings.display.theme.label')}
            onChange={(event) => setThemeMode(event.target.value as IThemeMode)}
            select={true}
            value={themeMode}
            variant="filled"
          >
            <MenuItem value="system">
              {t('settings.display.theme.system')}
            </MenuItem>
            <MenuItem value="light">
              {t('settings.display.theme.light')}
            </MenuItem>
            <MenuItem value="dark">{t('settings.display.theme.dark')}</MenuItem>
          </TextField>
          <TextField
            fullWidth={true}
            label={t('settings.display.language.label')}
            onChange={(event) =>
              onLocaleChange(event.target.value as Locale).catch(console.error)
            }
            select={true}
            sx={{ marginTop: 2 }}
            value={locale}
            variant="filled"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <MenuItem key={l} value={l}>
                {LOCALE_DISPLAY_NAMES[l]}
              </MenuItem>
            ))}
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
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.nexus.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="nexus-content">
          <Stack spacing={2} sx={{ marginTop: 1 }}>
            {nexusAuthState.apiKey == null ? (
              <Alert severity="warning">
                <Typography>{t('settings.nexus.signedOut')}</Typography>
                <Button
                  color="warning"
                  onClick={nexusSignIn}
                  sx={{ marginTop: 1 }}
                  variant="contained"
                >
                  {t('settings.nexus.signIn')}
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
                      {t('settings.nexus.loggedIn', {
                        name: nexusAuthState.name,
                        email: nexusAuthState.email,
                      })}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip
                      title={
                        nexusAuthState.isPremium
                          ? undefined
                          : t('settings.nexus.free.tooltip')
                      }
                    >
                      <Chip
                        color={nexusAuthState.isPremium ? 'success' : 'warning'}
                        label={
                          nexusAuthState.isPremium
                            ? t('settings.nexus.premium')
                            : t('settings.nexus.free')
                        }
                        size="small"
                      />
                    </Tooltip>
                  </Box>
                ) : (
                  <Typography>{t('settings.nexus.loggingIn')}</Typography>
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
                  {t('settings.nexus.signOut')}
                </Button>
              </Alert>
            )}
            {isRegisteredAsNxmProtocolHandler ? (
              <Alert severity="info">
                <Typography>{t('settings.nexus.nxm.registered')}</Typography>
                <Button
                  onClick={unregisterAsNxmProtocolHandler}
                  sx={{ marginTop: 1 }}
                  variant="outlined"
                >
                  {t('settings.nexus.nxm.unregister')}
                </Button>
              </Alert>
            ) : (
              <Alert severity="warning">
                <Typography>{t('settings.nexus.nxm.notRegistered')}</Typography>
                <Button
                  color="warning"
                  onClick={registerAsNxmProtocolHandler}
                  sx={{ marginTop: 1 }}
                  variant="outlined"
                >
                  {t('settings.nexus.nxm.register')}
                </Button>
              </Alert>
            )}
          </Stack>
        </StyledAccordionDetails>
      </StyledAccordion>
      <StyledAccordion
        defaultExpanded={false}
        disableGutters={true}
        elevation={0}
        square={true}
      >
        <StyledAccordionSummary
          aria-controls="updates-content"
          expandIcon={<ExpandMore />}
          id="updates-header"
        >
          <Typography sx={{ marginLeft: 1 }}>
            {t('settings.updates.title')}
          </Typography>
        </StyledAccordionSummary>
        <StyledAccordionDetails id="updates-content">
          <ListItemButton
            onClick={() => {
              setIsAppUpdaterDialogEnabled(!isAppUpdaterDialogEnabled);
            }}
          >
            <ListItemIcon>
              <Checkbox
                checked={isAppUpdaterDialogEnabled}
                disableRipple={true}
                edge="start"
                inputProps={{
                  'aria-labelledby': 'enable-app-updater-dialog',
                }}
                tabIndex={-1}
              />
            </ListItemIcon>
            <ListItemText
              id="enable-app-updater-dialog"
              primary={t('settings.updates.enableNotifications')}
            />
          </ListItemButton>
          {update == null ? null : (
            <Alert severity="warning">
              <Typography>
                {t('settings.updates.available', { version: update.version })}
              </Typography>
              <Button
                color="warning"
                onClick={onInstallUpdate}
                sx={{ marginTop: 1 }}
                variant="contained"
              >
                {t('settings.updates.update')}
              </Button>
            </Alert>
          )}
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
  const { t } = useTranslation();
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
        <Box>{t('settings.nexus.requests', { remaining, limit, type })}</Box>
        <Box sx={{ flex: 1 }} />
        <Box>
          {t('settings.nexus.requests.reset', {
            time: resetStringForCurrentLocale,
          })}
        </Box>
      </Box>
    </Box>
  );
}
