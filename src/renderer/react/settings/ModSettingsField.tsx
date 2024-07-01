import { useCallback } from 'react';
import { Help, Refresh } from '@mui/icons-material';
import { Box, FormLabel, IconButton, Tooltip } from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigField } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';
import { parseBinding } from '../BindingsParser';
import { useSetModConfig } from '../context/ModsContext';
import ModSettingsCheckboxField from './ModSettingsCheckboxField';
import ModSettingsColorSelectorField from './ModSettingsColorSelectorField';
import ModSettingsNumberField from './ModSettingsNumberField';
import ModSettingsSelectField from './ModSettingsSelectField';
import ModSettingsTextField from './ModSettingsTextField';

type Props = {
  field: ModConfigField;
  mod: Mod;
};

export default function ModSettingsField({
  field,
  mod,
}: Props): JSX.Element | null {
  const setModConfig = useSetModConfig();

  const onChangeConfig = useCallback(
    (fieldID: string, value: ModConfigSingleValue): void => {
      setModConfig(mod.id, { ...mod.config, [fieldID]: value });
    },
    [mod, setModConfig],
  );

  const onReset = useCallback((): void => {
    onChangeConfig(field.id, field.defaultValue);
  }, [field, onChangeConfig]);

  const isShown =
    field.visible == null || parseBinding<boolean>(field.visible, mod.config);

  let result = null;

  if (field.type === 'checkbox') {
    result = (
      <ModSettingsCheckboxField
        field={field}
        mod={mod}
        onChange={onChangeConfig}
      />
    );
  } else if (field.type === 'number') {
    result = (
      <ModSettingsNumberField
        field={field}
        mod={mod}
        onChange={onChangeConfig}
      />
    );
  } else if (field.type === 'text') {
    result = (
      <ModSettingsTextField field={field} mod={mod} onChange={onChangeConfig} />
    );
  } else if (field.type === 'select') {
    result = (
      <ModSettingsSelectField
        field={field}
        mod={mod}
        onChange={onChangeConfig}
      />
    );
  } else if (field.type === 'color') {
    result = (
      <ModSettingsColorSelectorField
        field={field}
        mod={mod}
        onChange={onChangeConfig}
      />
    );
  }

  if (result == null || !isShown) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          paddingBottom: 1,
          paddingTop: 1,
        }}
      >
        <FormLabel component="legend">{field.name}</FormLabel>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            marginTop: -1,
            marginBottom: -1,
          }}
        >
          {JSON.stringify(mod.config[field.id]) ===
          JSON.stringify(field.defaultValue) ? null : (
            <Tooltip title="Revert to Default">
              <IconButton onClick={onReset} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
          {field.description == null ? null : (
            <Tooltip title={field.description}>
              <Help color="disabled" fontSize="small" />
            </Tooltip>
          )}
        </Box>
      </Box>
      {result}
    </>
  );
}