import type { Mod } from 'bridge/BridgeAPI';
import BridgeAPI from 'renderer/BridgeAPI';
import {
  useDialog,
  useDialogContext,
} from 'renderer/react/context/DialogContext';
import { useMods } from 'renderer/react/context/ModsContext';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import { useCallback } from 'react';
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
  const { close: onClose, isOpen } = useDialogContext();

  const onDelete = useCallback(() => {
    onDeleteFromProps();
    onClose();
  }, [onClose, onDeleteFromProps]);

  return (
    <Dialog fullWidth={true} onClose={onClose} open={isOpen}>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete <strong>{mod.info.name}</strong>?
        </DialogContentText>
        <br />
        <DialogContentText>
          This will permanently remove the mod's files from your disk drive.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" onClick={onDelete} variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ModListDeleteMenuItem({ mod }: { mod: Mod }) {
  const [, refreshMods] = useMods();

  const onDelete = useCallback(async () => {
    await BridgeAPI.deleteFile(`mods/${mod.info.name}`, 'App');
    await refreshMods([mod.id]);
  }, [mod.id, mod.info.name, refreshMods]);

  const [onOpenDialog] = useDialog(
    <DeleteDialog mod={mod} onDelete={onDelete} />,
  );

  return (
    <ModListMenuItem icon={<Delete />} label="Delete" onClick={onOpenDialog} />
  );
}
