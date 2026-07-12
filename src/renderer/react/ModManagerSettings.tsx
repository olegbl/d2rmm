import type {
  LinuxBinaryInstallStatus,
  LinuxShortcutStatus,
} from 'bridge/BridgeAPI';
import { getBaseSavesPath, getHomePath } from 'renderer/AppInfoAPI';
import BridgeAPI from 'renderer/BridgeAPI';
import { LocaleAPI } from 'renderer/LocaleAPI';
import ShellAPI from 'renderer/ShellAPI';
import { LOCALE_DISPLAY_NAMES } from 'renderer/i18n';
import { useAppUpdaterContext } from 'renderer/react/context/AppUpdaterContext';
import { useDataPath } from 'renderer/react/context/DataPathContext';
import { useExtraGameLaunchArgs } from 'renderer/react/context/ExtraGameLaunchArgsContext';
import {
  useGamePath,
  useSanitizedGamePath,
} from 'renderer/react/context/GamePathContext';
import { useIsDirectMode } from 'renderer/react/context/IsDirectModeContext';
import { useIsPreExtractedData } from 'renderer/react/context/IsPreExtractedDataContext';
import { useLinuxLaunchCommand } from 'renderer/react/context/LinuxLaunchCommandContext';
import { useLutrisGames } from 'renderer/react/context/LutrisGamesContext';
import { useOutputModName } from 'renderer/react/context/OutputModNameContext';
import { useOutputPath } from 'renderer/react/context/OutputPathContext';
import { usePreExtractedDataPath } from 'renderer/react/context/PreExtractedDataPathContext';
import {
  useDefaultSavesPath,
  useFinalSavesPath,
  useSavesPath,
} from 'renderer/react/context/SavesPathContext';
import { useSteamGames } from 'renderer/react/context/SteamGamesContext';
import { IThemeMode, useThemeMode } from 'renderer/react/context/ThemeContext';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import { useAsyncMemo } from 'renderer/react/hooks/useAsyncMemo';
import useGameLaunchArgs from 'renderer/react/hooks/useGameLaunchArgs';
import { useIsFocused } from 'renderer/react/hooks/useIsFocused';
import InstallBeforeRunSettings from 'renderer/react/mmsettings/InstallBeforeRunSettings';
import i18next from 'i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Apps from '@mui/icons-material/Apps';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InstallDesktop from '@mui/icons-material/InstallDesktop';
import Terminal from '@mui/icons-material/Terminal';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  ButtonGroup,
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

function stripBackslashOnLinux(text: string): string {
  return window.env.platform === 'linux' ? text.replace(/^\\/, '') : text;
}

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const { t } = useTranslation();
  const [extraArgs, setExtraArgs] = useExtraGameLaunchArgs();
  const [linuxLaunchCommand, setLinuxLaunchCommand] = useLinuxLaunchCommand();
  const gameLaunchArgs = useGameLaunchArgs();
  const isLinux = window.env.platform === 'linux';
  const [lutrisGames, setLutrisGames] = useLutrisGames();
  const [isDetectingLutris, setIsDetectingLutris] = useState(false);
  const [lutrisError, setLutrisError] = useState<string | null>(null);
  const onDetectLutrisGames = useCallback(async (): Promise<void> => {
    setIsDetectingLutris(true);
    setLutrisError(null);
    try {
      setLutrisGames(await BridgeAPI.listLutrisGames());
    } catch (error) {
      setLutrisGames(null);
      setLutrisError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDetectingLutris(false);
    }
  }, [setLutrisGames]);
  const [lutrisInstalled, setLutrisInstalled] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isLinux) {
      return;
    }
    BridgeAPI.isLutrisInstalled()
      .then(setLutrisInstalled)
      .catch((error) => {
        console.error(error);
        setLutrisInstalled(false);
      });
  }, [isLinux]);
  const [steamDetection, setSteamDetection] = useSteamGames();
  useEffect(() => {
    if (!isLinux || steamDetection != null) {
      return;
    }
    BridgeAPI.detectSteamD2RInstall()
      .then(setSteamDetection)
      .catch((error) => {
        console.error(error);
        setSteamDetection({ isSteamInstalled: false, installs: [] });
      });
  }, [isLinux, steamDetection, setSteamDetection]);
  const [binaryInstall, setBinaryInstall] =
    useState<LinuxBinaryInstallStatus | null>(null);
  const [isTogglingBinary, setIsTogglingBinary] = useState(false);
  const [binaryInstallError, setBinaryInstallError] = useState<string | null>(
    null,
  );
  const [shortcutStatus, setShortcutStatus] =
    useState<LinuxShortcutStatus | null>(null);
  const [isTogglingDesktop, setIsTogglingDesktop] = useState(false);
  const [isTogglingApplications, setIsTogglingApplications] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  useEffect(() => {
    if (!isLinux) {
      return;
    }
    BridgeAPI.getLinuxBinaryInstallStatus()
      .then(setBinaryInstall)
      .catch(console.error);
    BridgeAPI.getLinuxShortcutStatus()
      .then(setShortcutStatus)
      .catch(console.error);
  }, [isLinux]);
  const onToggleBinary = useCallback(async (): Promise<void> => {
    setIsTogglingBinary(true);
    setBinaryInstallError(null);
    try {
      setBinaryInstall(await BridgeAPI.toggleLinuxBinary());
    } catch (error) {
      setBinaryInstallError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsTogglingBinary(false);
    }
  }, []);
  const onToggleDesktopShortcut = useCallback(async (): Promise<void> => {
    setIsTogglingDesktop(true);
    setShortcutError(null);
    try {
      setShortcutStatus(await BridgeAPI.toggleLinuxDesktopShortcut());
    } catch (error) {
      setShortcutError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTogglingDesktop(false);
    }
  }, []);
  const onToggleApplicationsShortcut = useCallback(async (): Promise<void> => {
    setIsTogglingApplications(true);
    setShortcutError(null);
    try {
      setShortcutStatus(await BridgeAPI.toggleLinuxApplicationsShortcut());
    } catch (error) {
      setShortcutError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTogglingApplications(false);
    }
  }, []);
  const isBinaryToggleDisabled =
    isTogglingBinary ||
    binaryInstall == null ||
    (!binaryInstall.isInstalled && !binaryInstall.isInPath);
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
  const baseSavesPath = isLinux ? gamePath : getBaseSavesPath();
  const defaultSavesPath = useDefaultSavesPath();
  const finalSavesPath = useFinalSavesPath();
  const [isSavesPathFocused, onSavesPathFocus, onSavesPathBlur] =
    useIsFocused();

  const [themeMode, setThemeMode] = useThemeMode();

  const [locale, setLocale] = useState(LocaleAPI.getLocale());
  const onLocaleChange = useCallback(
    async (newLocale: string): Promise<void> => {
      setLocale(newLocale);
      // set locale in renderer thread
      await i18next.changeLanguage(newLocale);
      // set locale in main/worker threads
      await LocaleAPI.setLocale(newLocale);
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
          {!isLinux && !finalSavesPath.startsWith(baseSavesPath) ? (
            <Alert severity="warning">
              <Typography>
                {
                  t('settings.general.savesPath.outsideBase', {
                    path: '\x00',
                  }).split('\x00')[0]
                }
                <Link
                  href="#"
                  onClick={() => {
                    ShellAPI.showItemInFolder(baseSavesPath).catch(
                      console.error,
                    );
                  }}
                >
                  {baseSavesPath}
                </Link>
                {stripBackslashOnLinux(
                  t('settings.general.savesPath.outsideBase', {
                    path: '\x00',
                  }).split('\x00')[1],
                )}
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
              {stripBackslashOnLinux(
                t('settings.general.outputPath.info', { path: '\x00' }).split(
                  '\x00',
                )[1],
              )}
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
              {stripBackslashOnLinux(
                t('settings.general.savesLocation.info', {
                  path: '\x00',
                }).split('\x00')[1],
              )}
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
      {isLinux ? (
        <StyledAccordion
          defaultExpanded={false}
          disableGutters={true}
          elevation={0}
          square={true}
        >
          <StyledAccordionSummary
            aria-controls="linux-content"
            expandIcon={<ExpandMore />}
            id="linux-header"
          >
            <Typography sx={{ marginLeft: 1 }}>
              {t('settings.linux.title')}
            </Typography>
          </StyledAccordionSummary>
          <StyledAccordionDetails id="linux-content">
            <Typography color="text.secondary" variant="subtitle2">
              {t('settings.linux.launchCommand.description')}
            </Typography>
            <TextField
              fullWidth={true}
              label={t('settings.linux.launchCommand.label')}
              onChange={(event) => setLinuxLaunchCommand(event.target.value)}
              value={linuxLaunchCommand}
              variant="filled"
            />
            <Alert severity="info" sx={{ marginTop: 1 }}>
              <Typography color="text.secondary" variant="subtitle2">
                {t('settings.linux.launchCommand.helper', {
                  args: gameLaunchArgs.join(' '),
                })}
              </Typography>
            </Alert>
            <Divider sx={{ marginY: 2 }} />
            <Typography color="text.secondary" variant="subtitle2">
              {t('settings.linux.helpers.title')}
            </Typography>
            {lutrisGames != null && lutrisGames.length > 0 ? null : (
              <Tooltip
                title={
                  lutrisInstalled === false
                    ? t('settings.linux.lutris.notInstalled')
                    : ''
                }
              >
                {/* span keeps the tooltip working while the button is disabled */}
                <span>
                  <Button
                    color={lutrisInstalled === false ? 'warning' : undefined}
                    disabled={isDetectingLutris || lutrisInstalled !== true}
                    onClick={() => {
                      onDetectLutrisGames().catch(console.error);
                    }}
                    sx={{
                      marginTop: 1,
                      ...(lutrisInstalled === false
                        ? {
                            '&.Mui-disabled': {
                              opacity: 0.6,
                              color: 'warning.main',
                              borderColor: 'warning.main',
                            },
                          }
                        : {}),
                    }}
                    variant="outlined"
                  >
                    {isDetectingLutris
                      ? t('settings.linux.lutris.detecting')
                      : t('settings.linux.lutris.detect')}
                  </Button>
                </span>
              </Tooltip>
            )}
            {lutrisError != null ? (
              <Alert severity="error" sx={{ marginTop: 1 }}>
                {lutrisError}
              </Alert>
            ) : null}
            {lutrisGames != null && lutrisGames.length === 0 ? (
              <Alert severity="info" sx={{ marginTop: 1 }}>
                {t('settings.linux.lutris.noGames')}
              </Alert>
            ) : null}
            {lutrisGames != null && lutrisGames.length > 0 ? (
              <TextField
                fullWidth={true}
                label={t('settings.linux.lutris.pick')}
                onChange={(event) => {
                  setLinuxLaunchCommand(
                    `env LUTRIS_SKIP_INIT=1 lutris lutris:rungameid/${event.target.value}`,
                  );
                  const game = lutrisGames?.find(
                    (g) => g.id === Number(event.target.value),
                  );
                  if (game?.exe != null) {
                    setRawGamePath(game.exe.replace(/\/[^/]*$/, ''));
                  }
                  if (game?.prefix != null) {
                    const homeUserName =
                      getHomePath().split('/').filter(Boolean).pop() ?? '';
                    const prefix = game.prefix.replace(/\/+$/, '');
                    setSavesPath(
                      `${prefix}/drive_c/users/${homeUserName}/Saved Games/Diablo II Resurrected/mods/${outputModName}`,
                    );
                  }
                }}
                select={true}
                sx={{ marginTop: 1 }}
                value=""
                variant="filled"
              >
                {lutrisGames.map((game) => (
                  <MenuItem key={game.id} value={game.id}>
                    {game.name}
                    {game.runner != null ? ` (${game.runner})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Tooltip
              title={
                steamDetection == null
                  ? t('settings.linux.steam.checking')
                  : !steamDetection.isSteamInstalled
                    ? t('settings.linux.steam.noSteam')
                    : steamDetection.installs.length === 0
                      ? t('settings.linux.steam.notFound')
                      : t('settings.linux.steam.autofillInfo')
              }
            >
              <span>
                <Button
                  color={
                    steamDetection != null &&
                    steamDetection.installs.length === 0
                      ? 'warning'
                      : undefined
                  }
                  disabled={
                    steamDetection == null ||
                    steamDetection.installs.length === 0
                  }
                  onClick={() => {
                    const game = steamDetection?.installs[0];
                    if (game == null) {
                      return;
                    }
                    setLinuxLaunchCommand('steam steam://rungameid/2536520');
                    setRawGamePath(game.gamePath);
                    const prefix = game.prefixPath.replace(/\/+$/, '');
                    setSavesPath(
                      `${prefix}/drive_c/users/steamuser/Saved Games/Diablo II Resurrected/mods/${outputModName}`,
                    );
                  }}
                  sx={{
                    marginLeft: 1,
                    marginTop: 1,
                    ...(steamDetection != null &&
                    steamDetection.installs.length === 0
                      ? {
                          '&.Mui-disabled': {
                            opacity: 0.6,
                            color: 'warning.main',
                            borderColor: 'warning.main',
                          },
                        }
                      : {}),
                  }}
                  variant="outlined"
                >
                  {t('settings.linux.steam.button')}
                </Button>
              </span>
            </Tooltip>
            <Alert severity="info" sx={{ marginTop: 1 }}>
              <Typography color="text.secondary" variant="subtitle2">
                {t('settings.linux.helpers.lutrisInfo')}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ marginTop: 1 }}
                variant="subtitle2"
              >
                {t('settings.linux.helpers.steamInfo')}
              </Typography>
            </Alert>
            {steamDetection != null && steamDetection.installs.length > 0 ? (
              <Alert severity="success" sx={{ marginTop: 1 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  {t('settings.linux.helpers.steamPathLabel')}{' '}
                  <Link
                    href="#"
                    onClick={() => {
                      ShellAPI.showItemInFolder(
                        steamDetection.installs[0].gamePath,
                      ).catch(console.error);
                    }}
                  >
                    {steamDetection.installs[0].gamePath}
                  </Link>
                </Typography>
              </Alert>
            ) : null}
            <Divider sx={{ marginY: 2 }} />
            <Stack
              direction="row"
              sx={{ flexWrap: 'wrap', gap: 1, marginTop: 1 }}
            >
              <ButtonGroup sx={{ flexWrap: 'wrap' }} variant="outlined">
                <Button
                  disabled={isTogglingDesktop || shortcutStatus == null}
                  onClick={() => {
                    onToggleDesktopShortcut().catch(console.error);
                  }}
                  startIcon={
                    shortcutStatus?.isDesktopInstalled ? (
                      <CheckCircle color="success" />
                    ) : (
                      <InstallDesktop />
                    )
                  }
                >
                  {shortcutStatus?.isDesktopInstalled
                    ? t('settings.linux.shortcut.desktop.remove')
                    : t('settings.linux.shortcut.desktop.create')}
                </Button>
                <Button
                  disabled={isTogglingApplications || shortcutStatus == null}
                  onClick={() => {
                    onToggleApplicationsShortcut().catch(console.error);
                  }}
                  startIcon={
                    shortcutStatus?.isApplicationsInstalled ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Apps />
                    )
                  }
                >
                  {shortcutStatus?.isApplicationsInstalled
                    ? t('settings.linux.shortcut.applications.remove')
                    : t('settings.linux.shortcut.applications.create')}
                </Button>
              </ButtonGroup>
              <Tooltip title={t('settings.linux.install.description')}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    disabled={isBinaryToggleDisabled}
                    onClick={() => {
                      onToggleBinary().catch(console.error);
                    }}
                    startIcon={
                      binaryInstall?.isInstalled ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Terminal />
                      )
                    }
                    variant="outlined"
                  >
                    {binaryInstall?.isInstalled
                      ? t('settings.linux.install.remove')
                      : t('settings.linux.install.install')}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            {binaryInstallError != null ? (
              <Alert severity="error" sx={{ marginTop: 1 }}>
                {binaryInstallError}
              </Alert>
            ) : null}
            {shortcutError != null ? (
              <Alert severity="error" sx={{ marginTop: 1 }}>
                {shortcutError}
              </Alert>
            ) : null}
            {binaryInstall != null && !binaryInstall.isInPath ? (
              <Alert severity="warning" sx={{ marginTop: 1 }}>
                {t('settings.linux.install.notInPath')}
              </Alert>
            ) : null}
          </StyledAccordionDetails>
        </StyledAccordion>
      ) : null}
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
              onLocaleChange(event.target.value).catch(console.error)
            }
            select={true}
            sx={{ marginTop: 2 }}
            value={locale}
            variant="filled"
          >
            {Object.entries(LOCALE_DISPLAY_NAMES).map(([locale, label]) => (
              <MenuItem key={locale} value={locale}>
                {label}
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
