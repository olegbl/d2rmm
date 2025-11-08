import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldSelect } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';
import { parseBinding } from 'renderer/react/BindingsParser';
import { useModSettingsContext } from 'renderer/react/settings/ModSettingsContext';
import { useCallback } from 'react';
import { Box, MenuItem, Select, SelectChangeEvent } from '@mui/material';

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
  const { expandedSections } = useModSettingsContext();

  const overrideValue =
    field.overrideValue == null
      ? null
      : parseBinding<ModConfigSingleValue | null>(
          field.overrideValue,
          mod.config,
          expandedSections,
        ) ?? null;

  const value = mod.config[field.id] as string;

  const onChange = useCallback(
    (event: SelectChangeEvent<void | ModConfigSingleValue>): void => {
      const newValue = event.target.value;
      if (newValue != null) {
        onChangeFromProps(field.id, newValue);
      }
    },
    [field, onChangeFromProps],
  );

  return (
    <Select
      disabled={overrideValue != null}
      onChange={onChange}
      value={overrideValue ?? value}
    >
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
