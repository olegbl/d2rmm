import { TextField } from '@mui/material';
import { ChangeEvent, useCallback } from 'react';

type Props = {
  field: ModConfigFieldNumber;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsCheckboxField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = mod.config[field.id] as number;

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      let newValue = parseInt(event.target.value, 10);

      if (field.minValue != null) {
        newValue = Math.max(newValue, field.minValue);
      }

      if (field.maxValue != null) {
        newValue = Math.min(newValue, field.maxValue);
      }

      onChangeFromProps(field.id, newValue);
    },
    [field, onChangeFromProps]
  );

  return (
    <TextField
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      value={value}
      variant="outlined"
      onChange={onChange}
    />
  );
}
