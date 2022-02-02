import {
  Alert,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  SxProps,
  Tab,
  TextField,
  Theme,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import sandbox from './sandbox';
import getModAPI from './getModAPI';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { AlignVerticalBottom, Settings } from '@mui/icons-material';
import useEnabledMods from './useEnabledMods';
import { extendSxProp } from '@mui/system';
import { useMods } from './useMods';
import { ModSettings } from './ModSettings';
import usePaths from './usePaths';

const API = window.electron.API;

function TabPanelBox({
  children,
  sx,
  value,
}: {
  children: JSX.Element[];
  sx?: SxProps<Theme>;
  value: string;
}): JSX.Element {
  extendSxProp;
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
  addError: (title: string, message: string) => unknown
): Promise<void> {
  API.deleteFile(paths.mergedPath);
  API.createDirectory(paths.mergedPath);
  API.writeJson(paths.mergedPath + '\\..\\modinfo.json', {
    name: 'D2RMM',
    savepath: 'D2RMM/',
  });

  for (let i = 0; i < mods.length; i++) {
    const mod = mods[i];
    const code = API.readModCode(paths.modPath, mod.id);
    const api = getModAPI(mod, paths, addError);
    const fn = sandbox(code);
    await fn({ D2RMM: api, config: mod.config });
  }
}

function D2RMMRootView() {
  const [tab, setTab] = useState('mods');
  const [paths, gamePath, setGamePath] = usePaths();
  const [mods, refreshMods] = useMods(paths);
  const [enabledMods, setEnabledMods] = useEnabledMods();
  const [selectedModID, setSelectedModID] = useState<string | null>(null);
  const selectedMod = useMemo(
    () => mods.filter((mod) => mod.id === selectedModID).shift(),
    [selectedModID, mods]
  );

  const [errors, setErrors] = useState<{ title: string; message: string }[]>(
    []
  );
  const addError = useCallback((title: string, message: string): void => {
    setErrors((prev) => [...prev, { title, message }]);
  }, []);

  function onInstallMods() {
    installMods(
      paths,
      mods.filter((mod) => enabledMods[mod.id] ?? false),
      addError
    ).then(() => {
      console.log('Mods Installed!');
    });
  }

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
          <List sx={{ width: '100%', flex: 1 }}>
            {mods.map((mod) => {
              const labelId = `mod-label-${mod}`;

              return (
                <ListItem
                  key={mod.id}
                  disablePadding
                  secondaryAction={
                    mod.info.config == null ? null : (
                      <IconButton
                        edge="end"
                        aria-label="Settings"
                        onClick={() => setSelectedModID(mod.id)}
                      >
                        <Settings />
                      </IconButton>
                    )
                  }
                >
                  <ListItemButton
                    role={undefined}
                    onClick={() =>
                      setEnabledMods((prev) => ({
                        ...prev,
                        [mod.id]: !prev[mod.id],
                      }))
                    }
                    dense
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={enabledMods[mod.id] ?? false}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      id={labelId}
                      primary={mod.info.name}
                      secondary={
                        mod.info.author == null ? null : `by ${mod.info.author}`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Drawer
            anchor="right"
            open={selectedMod != null}
            onClose={() => setSelectedModID(null)}
          >
            {selectedMod == null ? null : (
              <ModSettings
                mod={selectedMod}
                onClose={() => setSelectedModID(null)}
                paths={paths}
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
          <TextField
            label="Diablo II Resurrected Game Directory"
            value={gamePath}
            onChange={(event) => setGamePath(event.target.value)}
          />
          <br />
          <TextField
            label="Diablo II Resurrected Vanilla Files"
            value={paths.vanillaPath}
            disabled={true}
          />
          <br />
          <TextField
            label="Diablo II Resurrected Mod Files"
            value={paths.mergedPath}
            disabled={true}
          />
          <br />
          <TextField
            label="D2RMM Mod Files"
            value={paths.modPath}
            disabled={true}
          />
        </TabPanelBox>
      </Box>
      <Snackbar
        open={errors.length > 0}
        transitionDuration={0}
        onClose={() => setErrors((prev) => prev.slice(1))}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setErrors((prev) => prev.slice(1))}
        >
          <AlertTitle>{errors[0]?.title}</AlertTitle>
          {errors[0]?.message}
          {errors.length > 1 ? (
            <>
              <br />
              <br />
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => setErrors([])}
              >
                Clear All Errors ({errors.length})
              </Button>
            </>
          ) : null}
        </Alert>
      </Snackbar>
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
