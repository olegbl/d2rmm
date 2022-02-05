import { FormControlLabel, Tooltip } from '@mui/material';
import { useCallback, useState } from 'react';
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

  let control = null;

  if (field.type === 'checkbox') {
    control = (
      <ModSettingsCheckboxField
        field={field}
        mod={mod}
        onChange={onChangeConfig}
      />
    );
  }

  if (control != null) {
    let result = <FormControlLabel control={control} label={field.name} />;
    if (field.description != null) {
      result = <Tooltip title={field.description}>{result}</Tooltip>;
    }
    return result;
  }

  return null;
}
