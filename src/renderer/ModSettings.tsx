import { Button, FormGroup } from '@mui/material';
import ModSettingsField from './ModSettingsField';

type Props = {
  mod: Mod;
  onClose: () => unknown;
};

export default function ModSettings({
  mod,
  onClose,
}: Props): JSX.Element | null {
  // this should never happen as there should be no settings
  // button available on mods without a config
  if (mod.info.config == null) {
    return null;
  }

  return (
    <FormGroup sx={{ padding: 1, minWidth: 240 }}>
      {mod.info.config.map((field) => (
        <ModSettingsField key={field.name} field={field} mod={mod} />
      ))}
      <Button variant="outlined" onClick={onClose}>
        Close
      </Button>
    </FormGroup>
  );
}
