import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
} from '@mui/material';
import type { IUpdaterAPI, Update } from 'bridge/Updater';
import { useEventAPIListener } from '../EventAPI';
import { consumeAPI } from '../IPC';

const UpdaterAPI = consumeAPI<IUpdaterAPI>('UpdaterAPI');

function useUpdate(): [Update | null, () => void] {
  const [update, setUpdate] = useState<Update | null>(null);
  const onCheckForUpdates = useCallback(() => {
    UpdaterAPI.getLatestUpdate()
      .then((update) => {
        setUpdate(update);
      })
      .catch(console.error);
  }, []);
  useEffect(onCheckForUpdates, [onCheckForUpdates]);
  return [update, onCheckForUpdates];
}

type UpdaterState =
  | { event: 'cleanup' }
  | { event: 'extract' }
  | { event: 'download' }
  | { event: 'download-progress'; bytesDownloaded: number; bytesTotal: number }
  | { event: 'apply' };

function useUpdaterState(): UpdaterState | null {
  const [updaterState, setUpdaterState] = useState<UpdaterState | null>(null);
  useEventAPIListener('updater', setUpdaterState);
  return updaterState;
}

export default function UpdaterDialog() {
  const [isUpdateIgnored, setIsUpdateIgnored] = useState<boolean>(false);
  const [update] = useUpdate();
  const updaterState = useUpdaterState();

  const onIgnore = useCallback(() => {
    setIsUpdateIgnored(true);
  }, []);

  const onInstall = useCallback(() => {
    if (update != null) {
      UpdaterAPI.installUpdate(update).catch(console.error);
    }
  }, [update]);

  if (update == null || isUpdateIgnored) {
    return null;
  }

  if (updaterState != null) {
    // show loading dialog with the current updater state
    return (
      <Dialog
        aria-describedby="alert-dialog-description"
        aria-labelledby="alert-dialog-title"
        onClose={onIgnore}
        open={true}
      >
        <DialogTitle id="alert-dialog-title">Updating</DialogTitle>
        <DialogContent sx={{ width: 400 }}>
          <DialogContentText id="alert-dialog-description">
            {updaterState.event === 'cleanup'
              ? 'Cleaning up...'
              : updaterState.event === 'download'
                ? 'Downloading update...'
                : updaterState.event === 'download-progress'
                  ? `Downloading update... ${Math.round(
                      (updaterState.bytesDownloaded / updaterState.bytesTotal) *
                        100,
                    )}%`
                  : updaterState.event === 'extract'
                    ? 'Extracting update...'
                    : updaterState.event === 'apply'
                      ? 'Applying update...'
                      : 'Please wait...'}
          </DialogContentText>
          {updaterState.event === 'download-progress' && (
            <LinearProgress
              sx={{ marginTop: 2 }}
              value={
                (updaterState.bytesDownloaded / updaterState.bytesTotal) * 100
              }
              variant="determinate"
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      aria-describedby="alert-dialog-description"
      aria-labelledby="alert-dialog-title"
      onClose={onIgnore}
      open={true}
    >
      <DialogTitle id="alert-dialog-title">New Update Available</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Do you want to update to version {update.version} of D2RMM?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onIgnore}>Ignore</Button>
        <Button onClick={onInstall} variant="contained">
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
