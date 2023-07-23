import { Box, Divider, Tab } from '@mui/material';
import { useCallback, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import ModList from './ModList';
import ModManagerSettings from './ModManagerSettings';
import ModManagerLogs from './ModManagerLogs';
import ToastProvider from './ToastProvider';
import { PreferencesProvider } from './Preferences';
import { LogsProvider } from './Logs';
import { ModsContextProvider } from './ModsContext';
import ThemeContextProvider from './ThemeContext';

function TabPanelBox({
  children,
  value,
}: {
  children: React.ReactNode;
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
        }}
      >
        {children}
      </Box>
    </TabPanel>
  );
}

function D2RMMRootView() {
  const [tab, setTab] = useState('mods');
  const onShowLogsTab = useCallback((): void => setTab('logs'), [setTab]);

  return (
    <TabContext value={tab}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <TabList onChange={(_event, value) => setTab(value)}>
          <Tab label="Mods" value="mods" />
          <Tab label="Settings" value="settings" />
          <Tab label="Logs" value="logs" />
        </TabList>
        <Divider />
        <TabPanelBox value="mods">
          <ModList onShowLogsTab={onShowLogsTab} />
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
    <ThemeContextProvider>
      <ToastProvider>
        <PreferencesProvider>
          <ModsContextProvider>
            <LogsProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<D2RMMRootView />} />
                </Routes>
              </Router>
            </LogsProvider>
          </ModsContextProvider>
        </PreferencesProvider>
      </ToastProvider>
    </ThemeContextProvider>
  );
}
