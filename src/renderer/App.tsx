import { Suspense } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Box, Divider, Tab } from '@mui/material';
import './App.css';
import ErrorBoundary from './ErrorBoundary';
import { InstallContextProvider } from './InstallContext';
import InstallationProgressBar from './InstallationProgressBar';
import { LogsProvider } from './Logs';
import ModList from './ModList';
import ModManagerLogs from './ModManagerLogs';
import ModManagerSettings from './ModManagerSettings';
import { ModsContextProvider } from './ModsContext';
import { PreferencesProvider } from './Preferences';
import { TabContextProvider, useTabState } from './TabContext';
import ThemeContextProvider from './ThemeContext';
import ToastProvider from './ToastProvider';
import UpdaterDialog from './UpdaterDialog';

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
  const [tab, setTab] = useTabState();

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
        <Box
          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <TabList onChange={(_event, value) => setTab(value)}>
            <Tab label="Mods" value="mods" />
            <Tab label="Settings" value="settings" />
            <Tab label="Logs" value="logs" />
          </TabList>
          <Box sx={{ flex: 1 }} />
          <InstallationProgressBar />
        </Box>
        <Divider />
        <TabPanelBox value="mods">
          <ModList />
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
    <ErrorBoundary>
      <Suspense fallback={null}>
        <ThemeContextProvider>
          <ToastProvider>
            <LogsProvider>
              <PreferencesProvider>
                <ModsContextProvider>
                  <TabContextProvider>
                    <InstallContextProvider>
                      <Router>
                        <Routes>
                          <Route path="/" element={<D2RMMRootView />} />
                        </Routes>
                      </Router>
                      <UpdaterDialog />
                    </InstallContextProvider>
                  </TabContextProvider>
                </ModsContextProvider>
              </PreferencesProvider>
            </LogsProvider>
          </ToastProvider>
        </ThemeContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
