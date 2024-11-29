import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldText } from 'bridge/ModConfig';
import { parseBinding } from 'renderer/react/BindingsParser';
import { ChangeEvent, useCallback } from 'react';
import { TextField } from '@mui/material';

type Props = {
  field: ModConfigFieldText;
  mod: Mod;
  onChange: (fieldID: string, value: string) => unknown;
};

export default function ModSettingsTextField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const overrideValue =
    field.overrideValue == null
      ? null
      : parseBinding<string | null>(field.overrideValue, mod.config) ?? null;

  const value = mod.config[field.id] as string;

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChangeFromProps(field.id, event.target.value);
    },
    [field, onChangeFromProps],
  );

  return (
    <TextField
      disabled={overrideValue != null}
      onChange={onChange}
      value={overrideValue ?? value}
      variant="outlined"
    />
  );
}
