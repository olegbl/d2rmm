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
  const fieldID = field.id;
  const checked = Boolean(mod.config[fieldID]);

  const onChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, newValue: boolean): void => {
      onChangeFromProps(fieldID, newValue);
    },
    [fieldID, onChangeFromProps]
  );

  return (
    <FormControlLabel
      control={
        <Switch checked={checked} onChange={onChange} name={field.name} />
      }
      label={checked ? 'On' : 'Off'}
    />
  );
}
