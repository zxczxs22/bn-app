export type LATEST_VERSION_INFO = {
  [x: string]: any;
  version: string;
  android_version?: string;
  ios_version?: string;
  changelogs: string[];
  android_changelogs?: string[];
  ios_changelogs?: string[];
  hotreload_version: string;
  download_link_android: string;
  download_link_ios_plist: string;
  download_link_web: string;
  download_message?: string;
  create_time: number;
  apk_size: number;
  plist_size: number;
  ios_app_store_link: string;
  "//": string;
};
