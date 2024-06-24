import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { IUpdaterAPI, Update } from 'bridge/Updater';
import { consumeAPI } from './IPC';

const UpdaterAPI = consumeAPI<IUpdaterAPI>('UpdaterAPI');

export default function UpdaterDialog() {
  const [isUpdateIgnored, setIsUpdateIgnored] = useState<boolean>(false);
  const [update, setUpdate] = useState<Update | null>(null);

  const onCheckForUpdates = useCallback(() => {
    UpdaterAPI.getLatestUpdate()
      .then((update) => {
        setUpdate(update);
      })
      .catch(console.error);
  }, []);

  const onIgnore = useCallback(() => {
    setIsUpdateIgnored(true);
  }, []);

  const onInstall = useCallback(() => {
    if (update != null) {
      UpdaterAPI.installUpdate(update).catch(console.error);
    }
    setIsUpdateIgnored(true);
  }, [update]);

  useEffect(onCheckForUpdates, [onCheckForUpdates]);

  if (update == null || isUpdateIgnored) {
    return null;
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
