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

  // we don't add BOM since it's not part of the JSON spec
  // and D2R doesn't actually care if it's there or not

  // we add a newline at the end of the file
  return `${textData}\n`;
}
