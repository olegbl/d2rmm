import type { MyCollection } from 'bridge/NexusModsAPI';
import BridgeAPI from 'renderer/BridgeAPI';
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
import { useTranslation } from 'react-i18next';
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
  Tooltip,
  Typography,
} from '@mui/material';

export default function CreateCollectionDialog(): JSX.Element {
  const { t } = useTranslation();
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
  const [modHasConfig, setModHasConfig] = useState<Record<string, boolean>>({});
  const [modConfigInclusion, setModConfigInclusion] = useState<
    Record<string, boolean>
  >({});
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

    // Determine which mods have a non-default config so we can enable the
    // "Include Config" toggle only for those.
    Promise.all(
      mods
        .filter((mod) => getNexusModID(mod) != null)
        .map(async (mod) => {
          const config = await BridgeAPI.readModConfig(mod.id).catch(
            () => null,
          );
          const hasConfig =
            config != null && Object.keys(config as object).length > 0;
          return [mod.id, hasConfig] as [string, boolean];
        }),
    )
      .then((results) => {
        const hasConfigMap: Record<string, boolean> = {};
        const inclusionMap: Record<string, boolean> = {};
        for (const [id, hasConfig] of results) {
          hasConfigMap[id] = hasConfig;
          inclusionMap[id] = hasConfig;
        }
        setModHasConfig(hasConfigMap);
        setModConfigInclusion(inclusionMap);
      })
      .catch(console.error);

    if (nexusAuthState.apiKey != null) {
      ModUpdaterAPI.getMyCollections(nexusAuthState.apiKey)
        .then(setMyCollections)
        .catch((error: unknown) => {
          showToast({
            severity: 'error',
            title: t('collection.toast.loadFailed'),
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
      showToast({
        severity: 'warning',
        title: t('collection.toast.pleaseEnterTitle'),
      });
      return;
    }
    if (mode === 'update' && selectedCollectionId == null) {
      showToast({
        severity: 'warning',
        title: t('collection.toast.pleaseSelectCollection'),
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
        modConfigInclusion,
        mods,
      });
      setCollectionUrl(url);
      setStep('success');
    } catch (error) {
      showToast({
        severity: 'error',
        title:
          mode === 'create'
            ? t('collection.toast.createFailed')
            : t('collection.toast.updateFailed'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    close,
    createCollection,
    mode,
    modConfigInclusion,
    modRoles,
    mods,
    myCollections,
    nexusAuthState,
    selectedCollectionId,
    showToast,
    t,
    title,
  ]);

  if (step === 'success') {
    return (
      <Dialog fullWidth={true} maxWidth="sm" onClose={close} open={true}>
        <DialogTitle>
          {mode === 'create'
            ? t('collection.dialog.success.title.create')
            : t('collection.dialog.success.title.update')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {mode === 'create'
              ? t('collection.dialog.success.description.create')
              : t('collection.dialog.success.description.update')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('collection.dialog.close')}</Button>
          <Button
            endIcon={<OpenInNewIcon />}
            onClick={() => {
              ShellAPI.openExternal(collectionUrl).catch(console.error);
            }}
            variant="contained"
          >
            {t('collection.dialog.view')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog fullWidth={true} maxWidth="md" onClose={close} open={true}>
      <DialogTitle>
        {mode === 'create'
          ? t('collection.dialog.title.create')
          : t('collection.dialog.title.update')}
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
            label={t('collection.dialog.mode.create')}
            value="create"
          />
          <FormControlLabel
            control={<Radio />}
            label={t('collection.dialog.mode.update')}
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
              <em>{t('collection.dialog.select_placeholder')}</em>
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
            label={t('collection.dialog.title_label')}
            onChange={(e) => setTitle(e.target.value)}
            required={true}
            value={title}
          />
        )}

        {/* Mod list */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('collection.dialog.table.mod')}</TableCell>
              <TableCell align="right">
                {t('collection.dialog.table.role')}
              </TableCell>
              <TableCell align="right">
                {t('collection.dialog.table.config')}
              </TableCell>
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
                          label={t('collection.dialog.notOnNexus')}
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
                      <ToggleButton value="required">
                        {t('collection.dialog.role.required')}
                      </ToggleButton>
                      <ToggleButton value="optional">
                        {t('collection.dialog.role.optional')}
                      </ToggleButton>
                      <ToggleButton value="omit">
                        {t('collection.dialog.role.omit')}
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const hasConfig = modHasConfig[mod.id] ?? false;
                      const includeConfig =
                        hasConfig && (modConfigInclusion[mod.id] ?? true);
                      return (
                        <Tooltip
                          title={
                            hasConfig
                              ? ''
                              : t('collection.dialog.config.noConfig')
                          }
                        >
                          <span>
                            <ToggleButtonGroup
                              disabled={!hasConfig}
                              exclusive={true}
                              onChange={(_e, value: true | null) => {
                                setModConfigInclusion((prev) => ({
                                  ...prev,
                                  [mod.id]: value === true,
                                }));
                              }}
                              size="small"
                              value={includeConfig ? true : null}
                            >
                              <ToggleButton value={true}>
                                {t('collection.dialog.config.include')}
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </span>
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={close}>
          {t('collection.dialog.cancel')}
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={onSubmit}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
          variant="contained"
        >
          {mode === 'create'
            ? t('collection.dialog.submit.create')
            : t('collection.dialog.submit.update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
