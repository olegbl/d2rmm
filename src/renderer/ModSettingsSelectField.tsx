import { Box, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useCallback } from 'react';
import { ModConfigFieldSelect } from 'bridge/ModConfig';
import { ModConfigSingleValue } from 'bridge/ModConfigValue';

type Props = {
  field: ModConfigFieldSelect;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsSelectField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = mod.config[field.id] as string;

  const onChange = useCallback(
    (event: SelectChangeEvent<void | ModConfigSingleValue>): void => {
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
        <MenuItem
          key={option.label}
          value={
            // this is not a string, but the types for this component are wrong
            option.value as string
          }
        >
          <Box>
            {option.label}
            {option.description == null ? null : (
              <Box
                sx={{ color: 'text.secondary', fontSize: 'subtitle2.fontSize' }}
              >
                {option.description}
              </Box>
            )}
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
