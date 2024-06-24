import { ChangeEvent, useCallback } from 'react';
import { TextField } from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldText } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';

type Props = {
  field: ModConfigFieldText;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsTextField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = mod.config[field.id] as string;

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChangeFromProps(field.id, event.target.value);
    },
    [field, onChangeFromProps],
  );

  return <TextField value={value} variant="outlined" onChange={onChange} />;
}
