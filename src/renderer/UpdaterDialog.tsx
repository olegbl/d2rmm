import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export default function UpdaterDialog() {
  const [isUpdateIgnored, setIsUpdateIgnored] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    const listener = (_event: unknown, version: string) => {
      console.log('update available:', version);
      setUpdateVersion(version);
    };

    window.electron.RendererAPI.addUpdateListener(listener);
    return () => window.electron.RendererAPI.removeUpdateListener(listener);
  }, []);

  const onIgnore = useCallback(() => {
    setIsUpdateIgnored(true);
  }, []);

  const onInstall = useCallback(() => {
    window.electron.RendererAPI.installUpdate();
    setIsUpdateIgnored(true);
  }, []);

  if (updateVersion == null || isUpdateIgnored) {
    return null;
  }

  return (
    <Dialog
      open={true}
      onClose={onIgnore}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">New Update Available</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Do you want to update to version {updateVersion} of D2RMM?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onIgnore}>Ignore</Button>
        <Button variant="contained" onClick={onInstall}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
