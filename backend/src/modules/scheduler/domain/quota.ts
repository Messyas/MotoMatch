export interface QuotaUsage {
  readonly day: string; // YYYY-MM-DD
  readonly provider: string;
  readonly used: number;
  readonly limit: number;
}

