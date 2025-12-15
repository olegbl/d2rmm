import json5 from 'json5';

export function parseJson(data: null | string): JSONData {
  if (data == null) {
    return {};
  }

  const dataWithoutBOM = data
    // remove byte order mark (BOM)
    .replace(/^\uFEFF/, '');

  // NOTE: this can throw if this is not valid JSON
  return json5.parse<JSONData>(dataWithoutBOM);
}

export function encodeJson(data: JSONData): string {
  // we don't use json5 here so that keys are still wrapped in quotes
  const textData = JSON.stringify(data);
  // add byte order mark (BOM)
  // not every vanilla file has one but D2R doesn't seem to mind when it's added
  const dataWithBOM = `\uFEFF${textData}`;
  return dataWithBOM;
}
