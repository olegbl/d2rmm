import 'renderer/css/App.css';
import ErrorBoundary from 'renderer/react/ErrorBoundary';
import InstallationProgressBar from 'renderer/react/InstallationProgressBar';
import ModManagerLogs from 'renderer/react/ModManagerLogs';
import ModManagerSettings from 'renderer/react/ModManagerSettings';
import UpdaterDialog from 'renderer/react/UpdaterDialog';
import { DialogManagerContextProvider } from 'renderer/react/context/DialogContext';
import { InstallContextProvider } from 'renderer/react/context/InstallContext';
import { LogsProvider } from 'renderer/react/context/LogContext';
import { ModsContextProvider } from 'renderer/react/context/ModsContext';
import { NexusModsContextProvider } from 'renderer/react/context/NexusModsContext';
import { PreferencesContextProvider } from 'renderer/react/context/PreferencesContext';
import {
  TabContextProvider,
  useTabState,
} from 'renderer/react/context/TabContext';
import ThemeContextProvider from 'renderer/react/context/ThemeContext';
import { ToastContextProvider } from 'renderer/react/context/ToastContext';
import { UpdatesContextProvider } from 'renderer/react/context/UpdatesContext';
import ModList from 'renderer/react/modlist/ModList';
import { Suspense } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Box, Divider, Tab } from '@mui/material';

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
          <DialogManagerContextProvider>
            <ToastContextProvider>
              <LogsProvider>
                <PreferencesContextProvider>
                  <ModsContextProvider>
                    <TabContextProvider>
                      <InstallContextProvider>
                        <UpdatesContextProvider>
                          <NexusModsContextProvider>
                            <Router>
                              <Routes>
                                <Route element={<D2RMMRootView />} path="/" />
                              </Routes>
                            </Router>
                            <UpdaterDialog />
                          </NexusModsContextProvider>
                        </UpdatesContextProvider>
                      </InstallContextProvider>
                    </TabContextProvider>
                  </ModsContextProvider>
                </PreferencesContextProvider>
              </LogsProvider>
            </ToastContextProvider>
          </DialogManagerContextProvider>
        </ThemeContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
