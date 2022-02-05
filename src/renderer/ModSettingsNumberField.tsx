import { TextField } from '@mui/material';

type Props = {
  field: ModConfigFieldNumber;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsCheckboxField({
  field,
  mod,
  onChange,
}: Props): JSX.Element {
  return (
    <TextField
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      value={mod.config[field.id]}
      variant="outlined"
      onChange={(event) => {
        let newValue = parseInt(event.target.value, 10);
        if (field.minValue != null) {
          newValue = Math.max(newValue, field.minValue);
        }
        if (field.maxValue != null) {
          newValue = Math.min(newValue, field.maxValue);
        }
        onChange(field.id, newValue);
      }}
    />
  );
}
