import type { Mod } from 'bridge/BridgeAPI';
import type {
  ICollectionManifestMod,
  ICollectionPayload,
} from 'bridge/NexusModsAPI';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { INexusAuthState } from 'renderer/react/context/NexusModsContext';
import getNexusModID from 'renderer/react/context/utils/getNexusModID';
import { useCallback } from 'react';

export type ModRole = 'required' | 'optional' | 'omit';

type Args = {
  authState: INexusAuthState;
  mode: 'create' | 'update';
  selectedCollectionId: number | null;
  title: string;
  modRoles: Record<string, ModRole>;
  mods: Mod[];
};

export default function useCreateCollection() {
  return useCallback(
    async ({
      authState,
      mode,
      selectedCollectionId,
      title,
      modRoles,
      mods,
    }: Args): Promise<string> => {
      const nexusApiKey = authState.apiKey;
      if (nexusApiKey == null) {
        throw new Error('Not authenticated with Nexus Mods.');
      }

      // Build the list of mods for the manifest, looking up fileId for each
      const manifestMods: ICollectionManifestMod[] = [];
      for (const mod of mods) {
        const role = modRoles[mod.id] ?? 'omit';
        if (role === 'omit') continue;
        const nexusModIdStr = getNexusModID(mod);
        if (nexusModIdStr == null) continue;

        const modVersion = mod.info.version ?? '1.0.0';
        const files = await ModUpdaterAPI.getModFiles(
          nexusApiKey,
          nexusModIdStr,
        );
        // Find the file matching this mod's version; fall back to the most recent
        const matchedFile =
          files.find((f) => f.version === modVersion) ??
          files.reduce<(typeof files)[0] | null>(
            (best, f) =>
              best == null || f.uploadedTimestamp > best.uploadedTimestamp
                ? f
                : best,
            null,
          );
        if (matchedFile == null) {
          throw new Error(
            `No files found on Nexus for mod "${mod.info.name ?? mod.id}" (mod ID ${nexusModIdStr}).`,
          );
        }

        manifestMods.push({
          name: mod.info.name ?? mod.id,
          version: modVersion,
          optional: role === 'optional',
          domainName: 'diablo2resurrected',
          source: {
            type: 'nexus',
            modId: parseInt(nexusModIdStr, 10),
            fileId: matchedFile.fileId,
            updatePolicy: 'prefer',
          },
          author: mod.info.author ?? undefined,
        });
      }

      const payload: ICollectionPayload = {
        adultContent: false,
        collectionSchemaId: 1,
        collectionManifest: {
          info: {
            author: authState.name ?? '',
            name: title,
            domainName: 'diablo2resurrected',
          },
          mods: manifestMods,
        },
      };

      let collectionSlug: string | null = null;

      if (mode === 'create') {
        const { collectionId } = await ModUpdaterAPI.createCollection(
          nexusApiKey,
          payload,
        );
        const collections = await ModUpdaterAPI.getMyCollections(nexusApiKey);
        collectionSlug =
          collections.find((c) => c.id === collectionId)?.slug ?? null;
      } else {
        if (selectedCollectionId == null) {
          throw new Error('No collection selected.');
        }
        await ModUpdaterAPI.createOrUpdateRevision(
          nexusApiKey,
          payload,
          selectedCollectionId,
        );
        const collections = await ModUpdaterAPI.getMyCollections(nexusApiKey);
        collectionSlug =
          collections.find((c) => c.id === selectedCollectionId)?.slug ?? null;
      }

      return collectionSlug != null
        ? `https://www.nexusmods.com/games/diablo2resurrected/collections/${collectionSlug}/`
        : 'https://www.nexusmods.com/my-collections';
    },
    [],
  );
}
