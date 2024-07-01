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
