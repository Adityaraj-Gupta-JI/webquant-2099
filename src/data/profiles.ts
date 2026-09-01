import type { InvestorProfile } from '../types';

export const DEFAULT_PROFILE: InvestorProfile = {
  riskTolerance: 'moderate',
  horizon: 'long',
  allocation: { IT: 42, Banking: 28, Energy: 18, Other: 12 },
};

export const RISK_LABELS: Record<InvestorProfile['riskTolerance'], string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

export const HORIZON_LABELS: Record<InvestorProfile['horizon'], string> = {
  short: 'Short · < 6 months',
  medium: 'Medium · 6–24 months',
  long: 'Long · 2 years +',
};
