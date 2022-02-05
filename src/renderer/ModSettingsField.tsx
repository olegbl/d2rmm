import { Box, FormLabel, Tooltip } from '@mui/material';
import { useCallback, useState } from 'react';
import { Help } from '@mui/icons-material';
import ModSettingsNumberField from './ModSettingsNumberField';
import ModSettingsCheckboxField from './ModSettingsCheckboxField';

const API = window.electron.API;

function setConfig(mod: Mod, field: string, value: ModConfigSingleValue): void {
  mod.config[field] = value;
  API.writeModConfig(mod.id, mod.config);
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
  }

  if (result == null) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingBottom: 1,
          paddingTop: 1,
        }}
      >
        <FormLabel component="legend">{field.name}</FormLabel>
        {field.description == null ? null : (
          <Tooltip title={field.description}>
            <Help fontSize="small" color="disabled" />
          </Tooltip>
        )}
      </Box>
      {result}
    </>
  );
}
