import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldNumber } from 'bridge/ModConfig';
import { parseBinding } from 'renderer/react/BindingsParser';
import { useIsFocused } from 'renderer/react/hooks/useIsFocused';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { TextField } from '@mui/material';

const PATTERN = '^[0-9]*(.[0-9]*)?$';

type Props = {
  field: ModConfigFieldNumber;
  mod: Mod;
  onChange: (fieldID: string, value: number) => unknown;
};

export default function ModSettingsNumberField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const overrideValue =
    field.overrideValue == null
      ? null
      : parseBinding<number | null>(field.overrideValue, mod.config) ?? null;

  const value = mod.config[field.id] as number;

  const [valueString, setValueString] = useState(String(value));

  const [isFocused, onFocus, onBlur] = useIsFocused();

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      // let the user type freely - we'll revert any invalid input on blur
      setValueString(event.target.value);

      let newValue = parseFloat(event.target.value);

      if (
        // if the input is not a valid float and the input is not empty
        (Number.isNaN(newValue) && event.target.value !== '') ||
        // if the input is not a complete float and does not match the float pattern
        (String(newValue) !== event.target.value &&
          event.target.value.match(new RegExp(PATTERN)) == null)
      ) {
        // ignore the event
        return;
      }

      if (Number.isNaN(newValue)) {
        newValue = field.defaultValue;
      }

      if (field.minValue != null) {
        newValue = Math.max(newValue, field.minValue);
      }

      if (field.maxValue != null) {
        newValue = Math.min(newValue, field.maxValue);
      }

      onChangeFromProps(field.id, newValue);
    },
    [
      field.defaultValue,
      field.id,
      field.maxValue,
      field.minValue,
      onChangeFromProps,
    ],
  );

  useEffect(() => {
    if (!isFocused) {
      setValueString(String(value));
    }
  }, [value, isFocused]);

  return (
    <TextField
      disabled={overrideValue != null}
      inputProps={{
        inputMode: 'numeric',
        pattern: PATTERN,
      }}
      onBlur={onBlur}
      onChange={onChange}
      onFocus={onFocus}
      value={overrideValue != null ? String(overrideValue) : valueString}
      variant="outlined"
    />
  );
}
