export const BUSINESS_RULES = {
  MIN_MONTHLY_CONTRIBUTION: 25,
  LOAN_ACCESS_THRESHOLD: 5000,
  MAX_CONTRIBUTION_CHANGES: 4,
  MAX_EMERGENCY_FUND_USES: 2,
  MIN_COLLATERAL_COVERAGE: 0.85,
  INTEREST_TIERS: [
    { tier: 1, rate: 5, description: 'Flawless history, 750+ credit' },
    { tier: 2, rate: 8, description: '620+ credit, 24 months perfect' },
    { tier: 3, rate: 10, description: 'Default tier' },
  ],
  STRIKES: [
    { count: 1, label: 'Soft Ban', description: '6 months to restore' },
    { count: 2, label: 'Full Ban', description: '12 months to restore' },
    { count: 3, label: 'Indefinite', description: 'Board vote required to reinstate' },
  ],
} as const;
