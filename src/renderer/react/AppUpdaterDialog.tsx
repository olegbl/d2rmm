import { useEventAPIListener } from 'renderer/EventAPI';
import { useAppUpdaterContext } from 'renderer/react/context/AppUpdaterContext';
import {
  useDialog,
  useDialogContext,
} from 'renderer/react/context/DialogContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  | { event: 'apply' }
  | { event: 'error'; message: string };

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
  const { t } = useTranslation();
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
      <DialogTitle id="alert-dialog-title">
        {t('updater.notification.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t('updater.notification.description', { version })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onIgnore}>{t('updater.notification.ignore')}</Button>
        <Button onClick={onInstall} variant="contained">
          {t('updater.notification.update')}
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
  const { t } = useTranslation();
  const { close: onClose, isOpen } = useDialogContext();

  if (updaterState == null) {
    return null;
  }

  const progressText =
    updaterState.event === 'error'
      ? t('updater.progress.error', { message: updaterState.message })
      : updaterState.event === 'cleanup'
        ? t('updater.progress.cleanup')
        : updaterState.event === 'download'
          ? t('updater.progress.download')
          : updaterState.event === 'download-progress'
            ? t('updater.progress.downloadProgress', {
                percent: Math.round(
                  (updaterState.bytesDownloaded / updaterState.bytesTotal) *
                    100,
                ),
              })
            : updaterState.event === 'extract'
              ? t('updater.progress.extract')
              : updaterState.event === 'apply'
                ? t('updater.progress.apply')
                : t('updater.progress.wait');

  return (
    <Dialog
      aria-describedby="alert-dialog-description"
      aria-labelledby="alert-dialog-title"
      onClose={onClose}
      open={isOpen}
    >
      <DialogTitle id="alert-dialog-title">
        {t('updater.progress.title')}
      </DialogTitle>
      <DialogContent sx={{ width: 400 }}>
        <DialogContentText id="alert-dialog-description">
          {progressText}
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
