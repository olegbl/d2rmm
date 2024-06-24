import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { TextField } from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldNumber } from 'bridge/ModConfig';

function useIsFocused(): [
  isFocused: boolean,
  onFocus: () => void,
  onBlur: () => void,
] {
  const [isFocused, setIsFocused] = useState(false);
  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(true), []);
  return [isFocused, onFocus, onBlur];
}

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
  const value = mod.config[field.id] as number;
  const [valueString, setValueString] = useState(String(value));
  const [isFocused, onFocus, onBlur] = useIsFocused();

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
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

      console.log('set value', event.target.value, newValue);

      setValueString(event.target.value);
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
      inputProps={{
        inputMode: 'numeric',
        pattern: PATTERN,
      }}
      value={valueString}
      variant="outlined"
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
