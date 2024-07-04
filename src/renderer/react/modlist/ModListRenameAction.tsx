import type { Mod } from 'bridge/BridgeAPI';
import {
  useDialog,
  useDialogContext,
} from 'renderer/react/context/DialogContext';
import useModConfigOverride from 'renderer/react/context/hooks/useModConfigOverride';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import { useCallback, useState } from 'react';
import { Edit } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
} from '@mui/material';

function RenameDialog({
  initialName,
  isClearable,
  onClear: onClearFromProps,
  onSubmit: onSubmitFromProps,
}: {
  initialName: string;
  isClearable: boolean;
  onClear: () => void;
  onSubmit: (value: string) => void;
}) {
  const { close: onClose, isOpen } = useDialogContext();

  const [name, setName] = useState(initialName);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  }, []);

  const onSubmit = useCallback(() => {
    onSubmitFromProps(name);
    onClose();
  }, [name, onClose, onSubmitFromProps]);

  const onClear = useCallback(() => {
    onClearFromProps();
    onClose();
  }, [onClearFromProps, onClose]);

  return (
    <Dialog fullWidth={true} onClose={onClose} open={isOpen}>
      <DialogContent>
        <TextField
          autoFocus={true}
          fullWidth={true}
          label="Mod Name"
          onChange={onChange}
          sx={{ marginTop: 1 }}
          value={name}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        {isClearable && <Button onClick={onClear}>Clear</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ModListRenameMenuItem({ mod }: { mod: Mod }) {
  const [modConfigOverride, setModConfigOverride] = useModConfigOverride(
    mod.id,
  );

  const onClear = useCallback(() => {
    setModConfigOverride((oldValue) => {
      const newValue = { ...oldValue };
      delete newValue.name;
      return newValue;
    });
  }, [setModConfigOverride]);

  const onSubmit = useCallback(
    (name: string) => {
      setModConfigOverride((oldValue) => ({ ...oldValue, name }));
    },
    [setModConfigOverride],
  );

  const [onOpenDialog] = useDialog(
    <RenameDialog
      initialName={modConfigOverride?.name ?? mod.info.name}
      isClearable={modConfigOverride?.name != null}
      onClear={onClear}
      onSubmit={onSubmit}
    />,
  );

  return (
    <ModListMenuItem icon={<Edit />} label="Rename" onClick={onOpenDialog} />
  );
}
