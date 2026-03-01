import type { MyCollection } from 'bridge/NexusModsAPI';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import ShellAPI from 'renderer/ShellAPI';
import { isOrderedMod } from 'renderer/react/ReorderUtils';
import { useDialogContext } from 'renderer/react/context/DialogContext';
import {
  useEnabledMods,
  useOrdereredItems,
} from 'renderer/react/context/ModsContext';
import useCreateCollection, {
  ModRole,
} from 'renderer/react/context/hooks/useCreateCollection';
import useNexusAuthState from 'renderer/react/context/hooks/useNexusAuthState';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback, useEffect, useState } from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

export default function CreateCollectionDialog(): JSX.Element {
  const { close } = useDialogContext();
  const { nexusAuthState } = useNexusAuthState();
  const [orderedItems] = useOrdereredItems();
  const [enabledMods] = useEnabledMods();
  const showToast = useToast();
  const createCollection = useCreateCollection();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [collectionUrl, setCollectionUrl] = useState('');
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);
  const [myCollections, setMyCollections] = useState<MyCollection[]>([]);
  const [title, setTitle] = useState('');
  const [modRoles, setModRoles] = useState<Record<string, ModRole>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mods = orderedItems.filter(isOrderedMod).map((item) => item.mod);

  useEffect(() => {
    const initialRoles: Record<string, ModRole> = {};
    for (const item of orderedItems) {
      if (!isOrderedMod(item)) continue;
      const mod = item.mod;
      const isNexusMod = getNexusModID(mod) != null;
      const isEnabled = enabledMods[mod.id] ?? false;
      initialRoles[mod.id] = isNexusMod && isEnabled ? 'required' : 'omit';
    }
    setModRoles(initialRoles);

    if (nexusAuthState.apiKey != null) {
      ModUpdaterAPI.getMyCollections(nexusAuthState.apiKey)
        .then(setMyCollections)
        .catch((error: unknown) => {
          showToast({
            severity: 'error',
            title: 'Failed to load your collections',
            description: error instanceof Error ? error.message : String(error),
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectCollection = useCallback((id: number) => {
    setSelectedCollectionId(id);
  }, []);

  const onSubmit = useAsyncCallback(async () => {
    if (mode === 'create' && title.trim() === '') {
      showToast({ severity: 'warning', title: 'Please enter a title.' });
      return;
    }
    if (mode === 'update' && selectedCollectionId == null) {
      showToast({
        severity: 'warning',
        title: 'Please select a collection to update.',
      });
      return;
    }

    const collectionTitle =
      mode === 'create'
        ? title.trim()
        : myCollections.find((c) => c.id === selectedCollectionId)?.name ?? '';

    setIsSubmitting(true);
    try {
      const url = await createCollection({
        authState: nexusAuthState,
        mode,
        selectedCollectionId,
        title: collectionTitle,
        modRoles,
        mods,
      });
      setCollectionUrl(url);
      setStep('success');
    } catch (error) {
      showToast({
        severity: 'error',
        title: `Failed to ${mode === 'create' ? 'create' : 'update'} collection`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    close,
    createCollection,
    mode,
    modRoles,
    mods,
    myCollections,
    nexusAuthState,
    selectedCollectionId,
    showToast,
    title,
  ]);

  if (step === 'success') {
    return (
      <Dialog fullWidth={true} maxWidth="sm" onClose={close} open={true}>
        <DialogTitle>
          {mode === 'create' ? 'Collection Created!' : 'Collection Updated!'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your collection has been {mode === 'create' ? 'created' : 'updated'}
            . You can manage it on Nexus Mods.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <Button
            endIcon={<OpenInNewIcon />}
            onClick={() => {
              ShellAPI.openExternal(collectionUrl).catch(console.error);
            }}
            variant="contained"
          >
            View on Nexus Mods
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog fullWidth={true} maxWidth="md" onClose={close} open={true}>
      <DialogTitle>
        {mode === 'create'
          ? 'Create Nexus Mods Collection'
          : 'Update Nexus Mods Collection'}
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Mode selector */}
        <RadioGroup
          onChange={(e) => setMode(e.target.value as 'create' | 'update')}
          row={true}
          value={mode}
        >
          <FormControlLabel
            control={<Radio />}
            label="Create new collection"
            value="create"
          />
          <FormControlLabel
            control={<Radio />}
            label="Update existing collection"
            value="update"
          />
        </RadioGroup>

        {/* Existing collection selector */}
        {mode === 'update' && (
          <Select
            displayEmpty={true}
            onChange={(e) => {
              const val = e.target.value;
              if (val !== '') onSelectCollection(Number(val));
            }}
            value={selectedCollectionId ?? ''}
          >
            <MenuItem value="">
              <em>Select a collection…</em>
            </MenuItem>
            {myCollections.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        )}

        {/* Title — only shown when creating */}
        {mode === 'create' && (
          <TextField
            fullWidth={true}
            label="Title"
            onChange={(e) => setTitle(e.target.value)}
            required={true}
            value={title}
          />
        )}

        {/* Mod list */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Mod</TableCell>
              <TableCell align="right">Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mods.map((mod) => {
              const isNexusMod = getNexusModID(mod) != null;
              return (
                <TableRow key={mod.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {mod.info.name ?? mod.id}
                      </Typography>
                      {!isNexusMod && (
                        <Chip
                          color="warning"
                          label="Not on Nexus"
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <ToggleButtonGroup
                      disabled={!isNexusMod}
                      exclusive={true}
                      onChange={(_e, value: ModRole | null) => {
                        if (value != null) {
                          setModRoles((prev) => ({
                            ...prev,
                            [mod.id]: value,
                          }));
                        }
                      }}
                      size="small"
                      value={modRoles[mod.id] ?? 'omit'}
                    >
                      <ToggleButton value="required">Required</ToggleButton>
                      <ToggleButton value="optional">Optional</ToggleButton>
                      <ToggleButton value="omit">Omit</ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={onSubmit}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
          variant="contained"
        >
          {mode === 'create' ? 'Create Collection' : 'Update Collection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
