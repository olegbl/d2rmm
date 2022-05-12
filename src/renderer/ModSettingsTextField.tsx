import { TextField } from '@mui/material';
import { ChangeEvent, useCallback } from 'react';

type Props = {
  field: ModConfigFieldNumber;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsTextField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const value = mod.config[field.id] as number;

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChangeFromProps(field.id, event.target.value);
    },
    [field, onChangeFromProps]
  );

  return <TextField value={value} variant="outlined" onChange={onChange} />;
}
