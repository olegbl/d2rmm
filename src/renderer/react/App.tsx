import 'renderer/css/App.css';
import AppUpdaterDialog from 'renderer/react/AppUpdaterDialog';
import ErrorBoundary from 'renderer/react/ErrorBoundary';
import InstallationProgressBar from 'renderer/react/InstallationProgressBar';
import ModManagerLogs from 'renderer/react/ModManagerLogs';
import ModManagerSettings from 'renderer/react/ModManagerSettings';
import { AppUpdaterContextProvider } from 'renderer/react/context/AppUpdaterContext';
import { DataPathContextProvider } from 'renderer/react/context/DataPathContext';
import { DialogManagerContextProvider } from 'renderer/react/context/DialogContext';
import { ExtraGameLaunchArgsContextProvider } from 'renderer/react/context/ExtraGameLaunchArgsContext';
import { GamePathContextProvider } from 'renderer/react/context/GamePathContext';
import { InstallBeforeRunContextProvider } from 'renderer/react/context/InstallBeforeRunContext';
import { InstallContextProvider } from 'renderer/react/context/InstallContext';
import { IsDirectModeContextProvider } from 'renderer/react/context/IsDirectModeContext';
import { IsPreExtractedDataContextProvider } from 'renderer/react/context/IsPreExtractedDataContext';
import { LogsProvider } from 'renderer/react/context/LogContext';
import { ModsContextProvider } from 'renderer/react/context/ModsContext';
import { NexusModsContextProvider } from 'renderer/react/context/NexusModsContext';
import { OutputModNameContextProvider } from 'renderer/react/context/OutputModNameContext';
import { OutputPathContextProvider } from 'renderer/react/context/OutputPathContext';
import { PreExtractedDataPathContextProvider } from 'renderer/react/context/PreExtractedDataPathContext';
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

function RootRoute() {
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

function Content() {
  return (
    <>
      <Router>
        <Routes>
          <Route element={<RootRoute />} path="/" />
        </Routes>
      </Router>
      <AppUpdaterDialog />
    </>
  );
}

// from inner to outer
const CONTEXT_PROVIDERS = [
  // installation & updates
  AppUpdaterContextProvider,
  NexusModsContextProvider,
  UpdatesContextProvider,
  InstallContextProvider,
  // ui
  TabContextProvider,
  // mod data
  ModsContextProvider,
  // preferences
  InstallBeforeRunContextProvider,
  OutputPathContextProvider,
  DataPathContextProvider,
  ExtraGameLaunchArgsContextProvider,
  IsDirectModeContextProvider,
  OutputModNameContextProvider,
  IsPreExtractedDataContextProvider,
  PreExtractedDataPathContextProvider,
  GamePathContextProvider,
  // modals
  ToastContextProvider,
  DialogManagerContextProvider,
  // infrastructure
  LogsProvider,
  ThemeContextProvider,
];

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {CONTEXT_PROVIDERS.reduce(
          (children, Provider) => (
            <Provider>{children}</Provider>
          ),
          <Content />,
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
