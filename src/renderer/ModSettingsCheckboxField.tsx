import { Checkbox } from '@mui/material';

type Props = {
  field: ModConfigFieldCheckbox;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsCheckboxField({
  field,
  mod,
  onChange,
}: Props): JSX.Element {
  return (
    <Checkbox
      checked={Boolean(mod.config[field.id])}
      onChange={(event) => {
        onChange(field.id, event.target.checked);
      }}
    />
  );
}
