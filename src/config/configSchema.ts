export type LayerName = string;

export type TrussRule = {
  name: string;
  from: LayerName;
  disallow: LayerName[];
  message?: string;
};

export type Suppression = {
  file: string;
  rule: string;
  reason: string;
};

export type TrussConfig = {
  version?: string;
  layers: Record<LayerName, string[]>;
  rules: TrussRule[];
  suppressions?: Suppression[];
  ignore?: string[];
};
