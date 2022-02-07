import { FormControlLabel, Switch } from '@mui/material';
import { useCallback } from 'react';

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
    [field, onChangeFromProps]
  );

  return (
    <FormControlLabel
      control={<Switch checked={value} onChange={onChange} name={field.name} />}
      label={value ? 'On' : 'Off'}
    />
  );
}
