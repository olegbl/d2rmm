import { useEventAPIListener } from 'renderer/EventAPI';
import { useAppUpdaterContext } from 'renderer/react/context/AppUpdaterContext';
import {
  useDialog,
  useDialogContext,
} from 'renderer/react/context/DialogContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
} from '@mui/material';

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

function NotificationDialog({
  onIgnore: onIgnoreFromProps,
  onInstall,
  version,
}: {
  onIgnore: () => void;
  onInstall: () => void;
  version: string;
}) {
  const { close: onClose, isOpen } = useDialogContext();

  const onIgnore = useCallback(() => {
    onIgnoreFromProps();
    onClose();
  }, [onClose, onIgnoreFromProps]);

  return (
    <Dialog
      aria-describedby="alert-dialog-description"
      aria-labelledby="alert-dialog-title"
      onClose={onIgnore}
      open={isOpen}
    >
      <DialogTitle id="alert-dialog-title">New Update Available</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Do you want to update to version {version} of D2RMM?
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

function ProgressDialog({
  updaterState,
}: {
  updaterState: UpdaterState | null;
}) {
  const { close: onClose, isOpen } = useDialogContext();

  if (updaterState == null) {
    return null;
  }

  return (
    <Dialog
      aria-describedby="alert-dialog-description"
      aria-labelledby="alert-dialog-title"
      onClose={onClose}
      open={isOpen}
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

export default function AppUpdaterDialog() {
  const {
    isDialogEnabled,
    update,
    ignoredUpdateVersion,
    onIgnoreUpdate,
    onInstallUpdate,
  } = useAppUpdaterContext();
  const updaterState = useUpdaterState();

  const isUpdateIgnored =
    update != null && update.version === ignoredUpdateVersion;

  const [showNotificationDialog] = useDialog(
    useMemo(
      () => (
        <NotificationDialog
          onIgnore={onIgnoreUpdate}
          onInstall={onInstallUpdate}
          version={update?.version ?? ''}
        />
      ),
      [onIgnoreUpdate, onInstallUpdate, update?.version],
    ),
  );

  const [showProgressDialog] = useDialog(
    useMemo(
      () => <ProgressDialog updaterState={updaterState} />,
      [updaterState],
    ),
  );

  useEffect(() => {
    if (update == null) {
      return;
    }

    if (updaterState != null) {
      showProgressDialog();
      return;
    }

    if (isDialogEnabled && !isUpdateIgnored) {
      showNotificationDialog();
    }
  }, [
    isDialogEnabled,
    isUpdateIgnored,
    showNotificationDialog,
    showProgressDialog,
    update,
    updaterState,
  ]);

  return null;
}
