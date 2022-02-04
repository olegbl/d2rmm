import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
} from '@mui/material';
import { useCallback, useState } from 'react';

const API = window.electron.API;

function setConfig(mod: Mod, field: string, value: ModConfigSingleValue): void {
  mod.config[field] = value;
  API.writeModConfig(mod.id, mod.config);
}

function ModSettingsField({
  field,
  mod,
}: {
  field: ModConfigField;
  mod: Mod;
}): JSX.Element | null {
  const [, setCacheBreaker] = useState(0);
  const refresh = useCallback(() => setCacheBreaker((value) => value + 1), []);

  let control = null;

  if (field.type === 'checkbox') {
    control = (
      <Checkbox
        checked={Boolean(mod.config[field.id])}
        onChange={(event) => {
          setConfig(mod, field.id, event.target.checked);
          refresh();
        }}
      />
    );
  }

  if (control != null) {
    let result = <FormControlLabel control={control} label={field.name} />;
    if (field.description != null) {
      result = <Tooltip title={field.description}>{result}</Tooltip>;
    }
    return result;
  }

  return null;
}

export default function ModSettings({
  mod,
  onClose,
}: {
  mod: Mod;
  onClose: () => unknown;
}): JSX.Element | null {
  // this should never happen as there should be no settings
  // button available on mods without a config
  if (mod.info.config == null) {
    return null;
  }

  return (
    <>
      <FormGroup sx={{ padding: 1, minWidth: 240 }}>
        {mod.info.config.map((field) => (
          <ModSettingsField key={field.name} field={field} mod={mod} />
        ))}
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </FormGroup>
    </>
  );
}
