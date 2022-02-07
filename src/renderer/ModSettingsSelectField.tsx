import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useCallback } from 'react';

type Props = {
  field: ModConfigFieldSelect;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsCheckboxField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = mod.config[field.id] as string;

  const onChange = useCallback(
    (event: SelectChangeEvent<string | undefined>): void => {
      const newValue = event.target.value;
      if (newValue != null) {
        onChangeFromProps(field.id, newValue);
      }
    },
    [field, onChangeFromProps]
  );

  return (
    <Select value={value} onChange={onChange}>
      {field.options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
          {option === field.defaultValue ? ' (Default)' : ''}
        </MenuItem>
      ))}
    </Select>
  );
}
