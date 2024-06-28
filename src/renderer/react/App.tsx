import { Suspense } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Box, Divider, Tab } from '@mui/material';
import '../css/App.css';
import ErrorBoundary from './ErrorBoundary';
import InstallationProgressBar from './InstallationProgressBar';
import ModManagerLogs from './ModManagerLogs';
import ModManagerSettings from './ModManagerSettings';
import UpdaterDialog from './UpdaterDialog';
import { InstallContextProvider } from './context/InstallContext';
import { LogsProvider } from './context/LogContext';
import { ModsContextProvider } from './context/ModsContext';
import { PreferencesContextProvider } from './context/PreferencesContext';
import { TabContextProvider, useTabState } from './context/TabContext';
import ThemeContextProvider from './context/ThemeContext';
import { ToastContextProvider } from './context/ToastContext';
import ModList from './modlist/ModList';

function TabPanelBox({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}): JSX.Element {
  return (
    <TabPanel sx={{ height: '100%', position: 'relative' }} value={value}>
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
          <ToastContextProvider>
            <LogsProvider>
              <PreferencesContextProvider>
                <ModsContextProvider>
                  <TabContextProvider>
                    <InstallContextProvider>
                      <Router>
                        <Routes>
                          <Route element={<D2RMMRootView />} path="/" />
                        </Routes>
                      </Router>
                      <UpdaterDialog />
                    </InstallContextProvider>
                  </TabContextProvider>
                </ModsContextProvider>
              </PreferencesContextProvider>
            </LogsProvider>
          </ToastContextProvider>
        </ThemeContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
