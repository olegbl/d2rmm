import { Box, FormLabel, IconButton, Tooltip } from '@mui/material';
import { useCallback, useState } from 'react';
import { Help, Refresh } from '@mui/icons-material';
import ModSettingsNumberField from './ModSettingsNumberField';
import ModSettingsTextField from './ModSettingsTextField';
import ModSettingsSelectField from './ModSettingsSelectField';
import ModSettingsCheckboxField from './ModSettingsCheckboxField';
import { ModConfigField, ModConfigSingleValue } from './ModConfigTypes';

const BridgeAPI = window.electron.BridgeAPI;

function setConfig(mod: Mod, field: string, value: ModConfigSingleValue): void {
  mod.config[field] = value;
  BridgeAPI.writeModConfig(mod.id, mod.config);
}

type Props = {
  field: ModConfigField;
  mod: Mod;
};

export default function ModSettingsField({
  field,
  mod,
}: Props): JSX.Element | null {
  // this should technically run some sort of "updateMod" that modifies the original "mods" variable in useMod instead
  const [, setCacheBreaker] = useState(0);
  const refresh = useCallback(() => setCacheBreaker((value) => value + 1), []);

  const onChangeConfig = useCallback(
    (fieldID: string, value: ModConfigSingleValue): void => {
      setConfig(mod, fieldID, value);
      refresh();
    },
    [mod, refresh]
  );

  const onReset = useCallback((): void => {
    onChangeConfig(field.id, field.defaultValue);
  }, [field, onChangeConfig]);

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
  }

  if (result == null) {
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
              <IconButton size="small" onClick={onReset}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
          {field.description == null ? null : (
            <Tooltip title={field.description}>
              <Help fontSize="small" color="disabled" />
            </Tooltip>
          )}
        </Box>
      </Box>
      {result}
    </>
  );
}
