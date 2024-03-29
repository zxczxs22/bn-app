import { NumberLong } from "../types.helper";
export type AssetsBaseModel = {
  transactionId: string;
  address: string;
  publicKey: string;
  logo?: string;
  /**英文缩写(unique)*/
  abbreviation: string;
  genesisAddress: string;
  /**初始发行的资产数量*/
  expectedIssuedAssets: string;
  expectedIssuedBlockHeight: number;
  applyAssetBlockHeight: number;
  status: ASSETS_STATUS;
  dateCreated: number;
};
export type AssetsPersonalModel = AssetsBaseModel & {
  hodingAssets: string;
  destoryAssets: string;
};
export type AssetsDetailModel = AssetsBaseModel & {
  remainAssets: string;
  originalFrozenAssets: string;
};
// export type AssetsModel = AssetsBaseModel & {
//   logo?: string;
// };
// export type AssetsModelWithLogoSafeUrl = AssetsBaseModel & {
//   logo_safe_url: import("@angular/platform-browser").SafeUrl;
// };
export type AssetsModelWithLogoSafeUrl = AssetsBaseModel & {
  logo_safe_url: import("@angular/platform-browser").SafeUrl;
};
export type AssetsPersonalModelWithLogoSafeUrl = AssetsPersonalModel &
  AssetsModelWithLogoSafeUrl;
export type AssetsDetailModelWithLogoSafeUrl = AssetsDetailModel &
  AssetsModelWithLogoSafeUrl;

export enum ASSETS_STATUS {
  /**
   * RAISE: 筹集 IBT 中, 到计划发行的块高度前都是 RAISE 状态
   */
  RAISE = 0,
  /**
   * SUCCESS: 发行成功, 到计划发行块高度, 筹集到足量或超量的 IBT
   */
  SUCCESS = 1,
  /**
   * FAILED： 发行失败, 到计划发行块高度, 未筹集到足量的 IBT
   */
  FAILED = 2,
}

export type AssetsPossessorModel = {
  hodingAssets: string;
  destoryAssets: string;
  abbreviation: string;
  address: string;
  assetId: string;
  publicKey: string;
};
