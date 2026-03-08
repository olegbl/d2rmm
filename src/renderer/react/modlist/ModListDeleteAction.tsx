import type { Mod } from 'bridge/BridgeAPI';
import BridgeAPI from 'renderer/BridgeAPI';
import {
  useDialog,
  useDialogContext,
} from 'renderer/react/context/DialogContext';
import { useMods } from 'renderer/react/context/ModsContext';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import resolvePath from 'renderer/utils/resolvePath';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Delete } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from '@mui/material';

function DeleteDialog({
  mod,
  onDelete: onDeleteFromProps,
}: {
  mod: Mod;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { close: onClose, isOpen } = useDialogContext();

  const onDelete = useCallback(() => {
    onDeleteFromProps();
    onClose();
  }, [onClose, onDeleteFromProps]);

  return (
    <Dialog fullWidth={true} onClose={onClose} open={isOpen}>
      <DialogContent>
        <DialogContentText>
          {t('modlist.delete.dialog.question', { name: mod.info.name })}
        </DialogContentText>
        <br />
        <DialogContentText>
          {t('modlist.delete.dialog.warning')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('modlist.delete.dialog.cancel')}</Button>
        <Button color="error" onClick={onDelete} variant="contained">
          {t('modlist.delete.dialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ModListDeleteMenuItem({ mod }: { mod: Mod }) {
  const { t } = useTranslation();
  const [, refreshMods] = useMods();

  const onDelete = useAsyncCallback(async () => {
    await BridgeAPI.deleteFile(resolvePath('mods', mod.id), 'App');
    await refreshMods([mod.id]);
  }, [mod.id, refreshMods]);

  const [onOpenDialog] = useDialog(
    <DeleteDialog mod={mod} onDelete={onDelete} />,
  );

  return (
    <ModListMenuItem
      icon={<Delete />}
      label={t('modlist.action.delete')}
      onClick={onOpenDialog}
    />
  );
}
