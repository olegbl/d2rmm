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
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import useEnabledMods from './useEnabledMods';
import useMods from './useMods';
import ModSettings from './ModSettings';
import usePaths from './usePaths';
import useOrderedMods from './useOrderedMods';
import ModList from './ModList';
import useToast, { Toast } from './useToast';
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
          overflowY: 'auto',
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

async function installMods(
  paths: D2RMMPaths,
  mods: Mod[],
  showToast: (toast: Toast) => unknown
): Promise<void> {
  API.deleteFile(paths.mergedPath);

  API.createDirectory(paths.mergedPath);

  API.writeJson(`${paths.mergedPath}\\..\\modinfo.json`, {
    name: 'D2RMM',
    savepath: 'D2RMM/',
  });

  for (let i = 0; i < mods.length; i += 1) {
    const mod = mods[i];
    const code = API.readModCode(mod.id);
    const api = getModAPI(mod, paths, showToast);
    const fn = sandbox(code);
    // eslint-disable-next-line no-await-in-loop
    await fn({ D2RMM: api, config: mod.config });
  }
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

  const onInstallMods = useCallback((): void => {
    installMods(
      paths,
      orderedMods.filter((mod) => enabledMods[mod.id] ?? false),
      showToast
    )
      .then((): null => {
        showToast({ severity: 'success', title: 'Mods Installed' });
        return null;
      })
      .catch((error: Error): void => {
        showToast({
          severity: 'error',
          title: 'Error When Installing Mods',
          description: error.toString(),
        });
      });
  }, [paths, orderedMods, enabledMods, showToast]);

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
              <Button onClick={onInstallMods}>Install Mods</Button>
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
