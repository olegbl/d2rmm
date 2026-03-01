# Nexus Mods API Reference

All Nexus API calls live in [src/main/worker/ModUpdaterAPI.ts](../src/main/worker/ModUpdaterAPI.ts).
Types are in [src/bridge/NexusModsAPI.d.ts](../src/bridge/NexusModsAPI.d.ts) and [src/bridge/ModUpdaterAPI.d.ts](../src/bridge/ModUpdaterAPI.d.ts).

---

## How to Research Nexus APIs

Nexus Mods has no single public API reference. When figuring out an undocumented endpoint, check these two codebases — they often disagree on parameter names or behavior:

### 1. [node-nexus-api](https://github.com/Nexus-Mods/node-nexus-api)
Official Node.js SDK. Best source for:
- REST v1 endpoint shapes (request/response types)
- GraphQL v2 query/mutation signatures
- Field names on response objects

Key files to check:
- `src/NexusClient.ts` — all API method implementations
- `src/types.ts` — all TypeScript types

### 2. [Vortex](https://github.com/Nexus-Mods/Vortex)
The official Nexus Mods mod manager. Best source for:
- Collection manifest schema (what fields are required vs optional)
- How `ICollectionPayload` / `ICollectionManifest` are assembled in practice
- What GraphQL mutations actually accept (Vortex sometimes uses undocumented fields)
- How `modRules` interacts with the archive upload

Key files to check:
- `src/extensions/nexus_integration/` — Nexus API usage
- `src/extensions/collections/` — collection creation/upload logic

**Rule of thumb**: If something works in Vortex but not via `api.nexusmods.com/v2/graphql` directly, check whether Vortex is using `api-router.nexusmods.com/graphql` (the web UI endpoint) which has different validation.

---

## REST API v1

Base URL: `https://api.nexusmods.com/v1`
Auth header: `apikey: <key>` (lowercase)
Game domain for D2R: `diablo2resurrected`

| Endpoint | Method | Purpose | D2RMM usage |
|----------|--------|---------|-------------|
| `/users/validate.json` | GET | Validate API key, get user info | `validateNexusApiKey` |
| `/games/{domain}/mods/{modId}/files.json` | GET | List all files for a mod | `getFiles`, `getModFiles` |
| `/games/{domain}/mods/{modId}/files/{fileId}.json` | GET | Get single file info | `getFile` (in `installModViaNexus`) |
| `/games/{domain}/mods/{modId}/files/{fileId}/download_link.json` | GET | Get CDN download URL | `getDownloadLink` |

Rate limit headers returned on every REST response:
```
x-rl-daily-limit / x-rl-daily-remaining / x-rl-daily-reset
x-rl-hourly-limit / x-rl-hourly-remaining / x-rl-hourly-reset
```
These are published to the renderer via `EventAPI.send('nexus-mods-api-status', ...)`.

### File categories
`file.category_name` values that matter:
- `'MAIN'` — current main release
- `'OLD_VERSION'` — archived releases
- `'OPTIONAL'`, `'MISCELLANEOUS'`, etc. — ignored for update checking

### Download link format
`GET .../download_link.json` returns an array: `[{ name, short_name, URI }]`.
Use `result[0].URI` for the actual download URL.
For NXM links (from browser), pass `?key=<key>&expires=<timestamp>` query params.

---

## GraphQL API v2

Base URL: `https://api.nexusmods.com/v2/graphql`
Auth header: `apikey: <key>` (lowercase, same as REST)
Method: always `POST`, body `{ query, variables }`, `Content-Type: application/json`

Error shape: `{ errors: [{ message: string }] }` — check `data.errors` before using `data.data`.

### Queries

#### `collectionRevision` — fetch mods in a collection
```graphql
query CollectionRevision($slug: String!, $revision: Int!, $viewAdultContent: Boolean) {
  collectionRevision(slug: $slug, revision: $revision, viewAdultContent: $viewAdultContent) {
    revisionNumber
    modFiles {
      fileId
      optional
      file {
        fileId
        modId
        mod {
          modId
          modCategory { name }
          game { domainName }
        }
      }
    }
  }
}
```
Variable name is `revision` (Int), NOT `revisionNumber`. This is a common gotcha vs. what the response field is called.

#### `myCollections` — list user's collections
```graphql
query MyCollections($gameDomain: String) {
  myCollections(
    gameDomain: $gameDomain,
    viewAdultContent: true,
    viewUnlisted: true,
    viewUnderModeration: true,
  ) {
    nodes { id slug name }
  }
}
```
Variable is `gameDomain: String` (not `gameId: Int`). Pass `"diablo2resurrected"`.

#### `collectionRevisionUploadUrl` — get S3 pre-signed upload URL
```graphql
query CollectionRevisionUploadUrl {
  collectionRevisionUploadUrl {
    uuid
    url
  }
}
```
Returns `{ uuid, url }`. URL expires in ~900 seconds. No variables needed.
Note: the response field is `url` but D2RMM maps it to `uploadUrl` in `PreSignedUrl`.

### Mutations

#### `createCollection` — create a new collection + initial revision
```graphql
mutation CreateCollection($data: CollectionPayload!, $uuid: String!) {
  createCollection(collectionData: $data, uuid: $uuid) {
    collection { id }
    revision { id }
    success
  }
}
```
Param name is `collectionData` (not `payload`, not `collection`). The `$uuid` is the UUID from `collectionRevisionUploadUrl`.

**Gotcha**: `createCollection` creates the collection shell but does NOT process the S3 manifest to populate the mod list. You must immediately call `createOrUpdateRevision` with the same UUID to actually add mods to the draft revision.

#### `createOrUpdateRevision` — add/update a draft revision
```graphql
mutation CreateOrUpdateRevision($data: CollectionPayload!, $uuid: String!, $collectionId: Int!) {
  createOrUpdateRevision(collectionData: $data, uuid: $uuid, collectionId: $collectionId) {
    revision { id }
    success
  }
}
```
Same `collectionData` param name. The `collectionId` is the `id` from the collection object (integer, not slug).

---

## Collection Upload Flow

The full sequence for creating or updating a collection:

```
1. getRevisionUploadUrl()       → { uuid, uploadUrl }
2. uploadCollectionAsset()      → PUT to uploadUrl (Backblaze B2 / S3)
3. createCollection() OR        → creates collection shell; returns collectionId
   createOrUpdateRevision()     → updates existing collection

For createCollection only:
4. createOrUpdateRevision()     → needed to populate mod list from the S3 manifest
```

### S3 Upload Details
- Bucket: Backblaze B2 (`nexus-collections-temp`)
- `Content-Type: application/octet-stream` (required — signed for this type)
- Body: ZIP archive containing `collection.json`
- **Archive format is required** — plain JSON rejected by web UI validation

```typescript
// How the upload body is built:
const uploadManifest = { ...manifest, modRules: [] }; // modRules required by schema but empty
const jsonBytes = Buffer.from(JSON.stringify(uploadManifest));
const body = Buffer.from(zipSync({ 'collection.json': jsonBytes })); // fflate
```

`modRules` must be present in the archive's `collection.json` (empty array is fine) even though it's not sent in the GraphQL payload. This is a Vortex-compatible schema requirement.

### Two GraphQL Endpoints
| Endpoint | Used by | Validation |
|----------|---------|-----------|
| `api.nexusmods.com/v2/graphql` | D2RMM (direct API) | Less strict — plain JSON upload may work |
| `api-router.nexusmods.com/graphql` | Nexus web UI (Vortex) | Strict — requires ZIP archive format |

Use `api.nexusmods.com/v2/graphql` for all D2RMM calls.

### Error Diagnosis
| Error message | Actual cause |
|---------------|-------------|
| "Revision does not contain mods" | Archive format validation failed (not a mod count issue) |
| `Aws::S3::Errors::NotFound` | UUID used without uploading first |
| GraphQL error on `createCollection` | Usually wrong param name (`collectionData` not `payload`) |

---

## ICollectionPayload Structure

```typescript
// What gets sent to createCollection / createOrUpdateRevision
interface ICollectionPayload {
  adultContent: boolean;
  collectionSchemaId: number;    // always 1
  collectionManifest: ICollectionManifest;
}

interface ICollectionManifest {
  info: ICollectionManifestInfo;
  mods: ICollectionManifestMod[];
  // modRules is NOT here — it goes in the ZIP upload only
}

interface ICollectionManifestInfo {
  author: string;
  authorUrl?: string;
  name: string;                  // collection title
  description?: string;
  summary?: string;
  domainName: string;            // 'diablo2resurrected'
  gameVersions?: string[];
}

interface ICollectionManifestMod {
  name: string;
  version: string;
  optional: boolean;
  domainName: string;            // 'diablo2resurrected'
  author?: string;
  source: {
    type: 'nexus';               // always 'nexus' for Nexus-hosted mods
    modId: number;
    fileId: number;
    updatePolicy?: 'exact' | 'latest' | 'prefer';
    adultContent?: boolean;
  };
}
```

### File ID Lookup
To find the `fileId` for a mod's current version:
1. Call `getModFiles(apiKey, nexusModID)` → `{ fileId, version, uploadedTimestamp }[]`
2. Match `file.version === mod.info.version` (exact string match)
3. Fallback: most recent by `uploadedTimestamp` (sort descending, take first)

---

## nxm:// Protocol

Format: `nxm://{gameDomain}/mods/{modId}/files/{fileId}?key=...&expires=...`
Collections: `nxm://collections/{slug}/revisions/{revisionNumber}`

Handled in [src/main/NxmProtocolAPI.ts](../src/main/NxmProtocolAPI.ts):
- Path segment `[1]` is `'mods'` → emits `nexus-mods-open-url` event
- Path segment `[1]` is `'collections'` → emits `nexus-mods-open-collection-url` event

Events consumed in [src/renderer/react/context/hooks/useNxmProtocolHandler.tsx](../src/renderer/react/context/hooks/useNxmProtocolHandler.tsx).

---

## Authentication & Rate Limits

- API key stored in `NexusModsContext` (validated on entry via `useValidateNexusModsApiKey`)
- Auth state: `{ name, email, isPremium }` — premium users get higher download limits
- Rate limits tracked via `NexusModsApiStateEvent` and displayed in the UI
- Non-premium users cannot use NXM download links without key/expires params (they need the Nexus website to generate the link)
