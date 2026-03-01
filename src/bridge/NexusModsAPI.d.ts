// /v1/games/{game_domain_name}/mods/{id}.json
// Retrieve specified mod, from a specified game
export type Mod = {
  name: string;
  summary: string;
  description: string;
  picture_url: string;
  mod_downloads: number;
  mod_unique_downloads: number;
  uid: number;
  mod_id: number;
  game_id: number;
  allow_rating: boolean;
  domain_name: string;
  category_id: number;
  version: string;
  endorsement_count: number;
  created_timestamp: number;
  created_time: string;
  updated_timestamp: number;
  updated_time: string;
  author: string;
  uploaded_by: string;
  uploaded_users_profile_url: string;
  contains_adult_content: boolean;
  status: string;
  available: boolean;
  user: {
    member_id: number;
    member_group_id: number;
    name: string;
  };
  endorsement: {
    endorse_status: string;
    timestamp: number | null;
    version: string | null;
  };
};

// /v1/games/{game_domain_name}/mods/{mod_id}/files/{file_id}.json
// View a specified mod file
export type File = {
  category_id: number;
  category_name: string;
  changelog_html: string;
  content_preview_link: string;
  description: string;
  external_virus_scan_url: string;
  file_id: number;
  file_name: string;
  id: number[];
  is_primary: boolean;
  mod_version: string;
  name: string;
  size: number;
  size_in_bytes: number;
  size_kb: number;
  uid: number;
  uploaded_time: string;
  uploaded_timestamp: number;
  version: string;
};

export type FileUpdate = {
  new_file_id: number;
  new_file_name: string;
  old_file_id: number;
  old_file_name: string;
  uploaded_time: string;
  uploaded_timestamp: number;
};

// /v1/games/{game_domain_name}/mods/{mod_id}/files.json
// List files for specified mod
export type Files = {
  files: File[];
  file_updates: FileUpdate[];
};

// /v1/games/{game_domain_name}/mods/{mod_id}/files/{id}/download_link.json
// Generate download link for mod file
export type DownloadLink = {
  name: string;
  short_name: string;
  URI: string;
}[];

export type ValidateResult = {
  email: string;
  is_premium: boolean;
  is_supporter: boolean;
  key: string;
  name: string;
  profile_url: string;
  user_id: number;
};

export type NexusModsApiStateEvent = {
  dailyLimit: string;
  dailyRemaining: string;
  dailyReset: string;
  hourlyLimit: string;
  hourlyRemaining: string;
  hourlyReset: string;
};

// Nexus Mods GraphQL API
// https://github.com/Nexus-Mods/node-nexus-api/blob/master/src/types.ts

// /v2/graphql { collectionRevision(slug, revision) { modFiles { ... } } }
// A single mod entry within a collection revision
export type CollectionRevisionMod = {
  fileId: number;
  optional: boolean;
  file: {
    fileId: number;
    modId: number;
    mod: {
      modId: number;
      modCategory: {
        name: string;
      } | null;
      game: {
        domainName: string;
      };
    };
  } | null;
};

// /v2/graphql { collectionRevision(slug, revision) { ... } }
// Retrieve a specific revision of a collection
export type CollectionRevision = {
  revisionNumber: number;
  modFiles: CollectionRevisionMod[];
};

// /v2/graphql { myCollections(gameId) { nodes { id slug name } } }
// One of the authenticated user's collections
export type MyCollection = {
  id: number;
  slug: string;
  name: string;
};

export type UpdatePolicy = 'exact' | 'latest' | 'prefer';

export type SourceType = 'browse' | 'manual' | 'direct' | 'nexus';

export interface ICollectionManifestInfo {
  author: string;
  authorUrl?: string;
  name: string;
  description?: string;
  summary?: string;
  domainName: string;
  gameVersions?: string[];
}

export interface ICollectionManifestModSource {
  type: SourceType;
  modId?: number;
  fileId?: number;
  md5?: string;
  fileSize?: number;
  updatePolicy?: UpdatePolicy;
  logicalFilename?: string;
  fileExpression?: string;
  url?: string;
  adultContent?: boolean;
}

export interface ICollectionManifestMod {
  name: string;
  version: string;
  optional: boolean;
  domainName: string;
  source: ICollectionManifestModSource;
  author?: string;
}

export interface ICollectionManifest {
  info: ICollectionManifestInfo;
  mods: ICollectionManifestMod[];
}

export interface ICollectionPayload {
  adultContent: boolean;
  collectionSchemaId: number;
  collectionManifest: ICollectionManifest;
}

// /v1/collections/upload_url
// Pre-signed S3 URL for uploading a collection asset
export type PreSignedUrl = {
  uuid: string;
  uploadUrl: string;
};
