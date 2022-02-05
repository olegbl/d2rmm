import {
  Box,
  Button,
  ButtonGroup,
  Drawer,
  SxProps,
  Tab,
  Theme,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { LoadingButton } from '@mui/lab';
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import useEnabledMods from './useEnabledMods';
import useMods from './useMods';
import ModSettings from './ModSettings';
import usePaths from './usePaths';
import useOrderedMods from './useOrderedMods';
import ModList from './ModList';
import useToast from './useToast';
import ModManagerSettings from './ModManagerSettings';

const API = window.electron.API;

function TabPanelBox({
  children,
  sx,
  value,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  value: string;
}): JSX.Element {
  return (
    <TabPanel value={value} sx={{ height: '100%', position: 'relative' }}>
      <Box
        sx={{
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
          ...sx,
        }}
      >
        {children}
      </Box>
    </TabPanel>
  );
}

function D2RMMRootView() {
  const [tab, setTab] = useState('mods');
  const [paths, gamePath, setGamePath] = usePaths();
  const [mods, refreshMods] = useMods();
  const [orderedMods, reorderMods] = useOrderedMods(mods);
  const [enabledMods, setEnabledMods] = useEnabledMods();
  const [selectedModID, setSelectedModID] = useState<string | null>(null);
  const selectedMod = useMemo(
    () => mods.filter((mod) => mod.id === selectedModID).shift(),
    [selectedModID, mods]
  );
  const [toast, showToast] = useToast();

  const modsToInstall = useMemo(
    () => orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
    [orderedMods, enabledMods]
  );
  const [installingMod, setInstallingMod] = useState(0);
  const onInstallMods = useCallback((): void => {
    setInstallingMod(0);

    try {
      API.deleteFile(paths.mergedPath);
      API.createDirectory(paths.mergedPath);
      API.writeJson(`${paths.mergedPath}\\..\\modinfo.json`, {
        name: 'D2RMM',
        savepath: 'D2RMM/',
      });

      API.openStorage(paths.gamePath);

      for (let i = 0; i < modsToInstall.length; i += 1) {
        setInstallingMod(i + 1);
        const mod = modsToInstall[i];
        const code = API.readModCode(mod.id);
        const api = getModAPI(mod, paths, showToast);
        const installMod = sandbox(code);
        installMod({ D2RMM: api, config: mod.config });
      }

      API.closeStorage();

      showToast({ severity: 'success', title: 'Mods Installed' });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'Error When Installing Mods',
        description: String(error),
      });
    }

    setInstallingMod(0);
  }, [paths, modsToInstall, showToast]);

  return (
    <TabContext value={tab}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        <TabList onChange={(_event, value) => setTab(value)}>
          <Tab label="Mods" value="mods" />
          <Tab label="Settings" value="settings" />
        </TabList>
        <TabPanelBox value="mods">
          <ModList
            mods={orderedMods}
            enabledMods={enabledMods}
            onToggleMod={(mod) =>
              setEnabledMods((prev) => ({
                ...prev,
                [mod.id]: !prev[mod.id],
              }))
            }
            onConfigureMod={(mod) => setSelectedModID(mod.id)}
            onReorderMod={(from, to) => reorderMods(from, to)}
          />
          <Drawer
            anchor="right"
            open={selectedMod != null}
            onClose={() => setSelectedModID(null)}
          >
            {selectedMod == null ? null : (
              <ModSettings
                mod={selectedMod}
                onClose={() => setSelectedModID(null)}
              />
            )}
          </Drawer>
          <Box
            sx={{
              alignItems: 'flex-end',
              display: 'flex',
              flexDirection: 'column',
              padding: 1,
            }}
          >
            <ButtonGroup variant="outlined">
              <Button onClick={refreshMods}>Refresh Mod List</Button>
              <LoadingButton
                loading={installingMod > 0}
                loadingIndicator={`Installing mod ${installingMod}/${modsToInstall.length}...`}
                onClick={onInstallMods}
                variant="outlined"
              >
                Install Mods
              </LoadingButton>
            </ButtonGroup>
          </Box>
        </TabPanelBox>
        <TabPanelBox value="settings" sx={{ padding: 2 }}>
          <ModManagerSettings
            paths={paths}
            gamePath={gamePath}
            onChangeGamePath={setGamePath}
          />
        </TabPanelBox>
      </Box>
      {toast}
    </TabContext>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<D2RMMRootView />} />
      </Routes>
    </Router>
  );
}
