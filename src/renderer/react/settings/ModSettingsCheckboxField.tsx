import { useCallback } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldCheckbox } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';

type Props = {
  field: ModConfigFieldCheckbox;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsCheckboxField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = Boolean(mod.config[field.id]);

  const onChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, newValue: boolean): void => {
      onChangeFromProps(field.id, newValue);
    },
    [field, onChangeFromProps],
  );

  return (
    <FormControlLabel
      control={<Switch checked={value} name={field.name} onChange={onChange} />}
      label={value ? 'On' : 'Off'}
    />
  );
}
