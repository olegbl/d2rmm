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
import useEnabledMods from './useEnabledMods';
import useMods from './useMods';
import ModSettings from './ModSettings';
import useOrderedMods from './useOrderedMods';
import ModList from './ModList';
import ModManagerSettings from './ModManagerSettings';
import ModManagerLogs from './ModManagerLogs';
import ModInstallButton from './ModInstallButton';
import ToastProvider from './ToastProvider';
import { PreferencesProvider, usePreferences } from './Preferences';
import { LogsProvider } from './Logs';
import RunGameButton from './RunGameButton';

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
  const [mods, onRefreshMods] = useMods();
  const [orderedMods, reorderMods] = useOrderedMods(mods);
  const [enabledMods, setEnabledMods] = useEnabledMods();
  const [selectedModID, setSelectedModID] = useState<string | null>(null);
  const selectedMod = useMemo(
    () => mods.filter((mod) => mod.id === selectedModID).shift(),
    [selectedModID, mods]
  );
  const { isDirectMode } = usePreferences();

  const showLogs = useCallback((): void => setTab('logs'), [setTab]);

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
          <Tab label="Logs" value="logs" />
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
              <RunGameButton />
              <Button onClick={onRefreshMods}>Refresh Mod List</Button>
              {isDirectMode ? (
                <ModInstallButton
                  enabledMods={enabledMods}
                  isUninstall={true}
                  onErrorsEncountered={showLogs}
                  orderedMods={orderedMods}
                  tooltip="Revert any files modified by the enabled mods back to their vanilla state."
                />
              ) : null}
              <ModInstallButton
                orderedMods={orderedMods}
                enabledMods={enabledMods}
                onErrorsEncountered={showLogs}
              />
            </ButtonGroup>
          </Box>
        </TabPanelBox>
        <TabPanelBox value="settings">
          <ModManagerSettings />
        </TabPanelBox>
        <TabPanelBox value="logs">
          <ModManagerLogs />
        </TabPanelBox>
      </Box>
    </TabContext>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <PreferencesProvider>
        <LogsProvider>
          <Router>
            <Routes>
              <Route path="/" element={<D2RMMRootView />} />
            </Routes>
          </Router>
        </LogsProvider>
      </PreferencesProvider>
    </ToastProvider>
  );
}
