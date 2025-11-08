import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldCheckbox } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';
import { parseBinding } from 'renderer/react/BindingsParser';
import { useModSettingsContext } from 'renderer/react/settings/ModSettingsContext';
import { useCallback } from 'react';
import { FormControlLabel, Switch } from '@mui/material';

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
  const { expandedSections } = useModSettingsContext();

  const overrideValue =
    field.overrideValue == null
      ? null
      : parseBinding<boolean | null>(
          field.overrideValue,
          mod.config,
          expandedSections,
        ) ?? null;

  const value = Boolean(mod.config[field.id]);

  const onChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, newValue: boolean): void => {
      onChangeFromProps(field.id, newValue);
    },
    [field, onChangeFromProps],
  );

  return (
    <FormControlLabel
      control={
        <Switch
          checked={overrideValue ?? value}
          name={field.name}
          onChange={onChange}
        />
      }
      disabled={overrideValue != null}
      label={overrideValue ?? value ? 'On' : 'Off'}
    />
  );
}
