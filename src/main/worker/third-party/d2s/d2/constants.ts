import type * as types from 'bridge/third-party/d2s/d2/types.d';

const versionedConstants: Map<number, types.IConstantData> = new Map<
  number,
  types.IConstantData
>();

function getConstantData(version: number): types.IConstantData {
  if (!versionedConstants.has(version)) {
    throw new Error(`No constant data found for this version ${version}`);
  }
  return versionedConstants.get(version)!;
}

function setConstantData(version: number, data: types.IConstantData) {
  versionedConstants.set(version, data);
}

export { getConstantData, setConstantData };
