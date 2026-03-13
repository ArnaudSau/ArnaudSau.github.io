export interface HoldingWithPrice {
  ticker: string;
  name: string;
  quantity: number;
  averagePurchasePrice: number;
  currentPrice: number;
  sector?: string | null;
  geographicZone?: string | null;
  currency?: string;
}

// Plus-value calculation
export function calculatePlusValue(holding: HoldingWithPrice) {
  const invested = holding.quantity * holding.averagePurchasePrice;
  const currentValue = holding.quantity * holding.currentPrice;
  const plusValue = currentValue - invested;
  const plusValuePercent = invested > 0 ? (plusValue / invested) * 100 : 0;
  return { invested, currentValue, plusValue, plusValuePercent };
}

// Portfolio total calculations
export function calculatePortfolioTotals(holdings: HoldingWithPrice[]) {
  let totalInvested = 0;
  let totalCurrentValue = 0;

  for (const h of holdings) {
    const { invested, currentValue } = calculatePlusValue(h);
    totalInvested += invested;
    totalCurrentValue += currentValue;
  }

  const totalPlusValue = totalCurrentValue - totalInvested;
  const totalPlusValuePercent =
    totalInvested > 0 ? (totalPlusValue / totalInvested) * 100 : 0;

  return { totalInvested, totalCurrentValue, totalPlusValue, totalPlusValuePercent };
}

// PEA tax calculation
export function calculatePEATax(plusValue: number, openDateYears: number): number {
  if (openDateYears >= 5) {
    return plusValue * 0.172; // Only social contributions
  }
  return plusValue * 0.3; // Flat tax 30%
}

// CTO tax calculation
export function calculateCTOTax(plusValue: number, usePFU = true, tmi = 30): number {
  if (usePFU) {
    return plusValue * 0.3; // PFU 30%
  }
  // Barème IR + social contributions
  return plusValue * (tmi / 100 + 0.172);
}

// Diversification score - geographic
export function calculateGeoDiversificationScore(
  holdings: HoldingWithPrice[]
): { score: number; distribution: Record<string, number> } {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0
  );

  if (totalValue === 0) return { score: 0, distribution: {} };

  const distribution: Record<string, number> = {};

  for (const h of holdings) {
    const zone = h.geographicZone || "Autres";
    const value = h.quantity * h.currentPrice;
    distribution[zone] = (distribution[zone] || 0) + value / totalValue;
  }

  // Score calculation
  const zones = Object.values(distribution);
  const maxConcentration = Math.max(...zones, 0);
  const numZones = zones.length;

  let score = 50;
  // Penalty for concentration > 60%
  if (maxConcentration > 0.6) {
    score -= (maxConcentration - 0.6) * 100;
  }
  // Bonus for multiple zones
  score += Math.min(numZones * 10, 40);
  // Bonus for balanced distribution (low std dev)
  const mean = 1 / numZones;
  const variance = zones.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) / numZones;
  score -= variance * 100;

  return { score: Math.max(0, Math.min(100, Math.round(score))), distribution };
}

// Diversification score - sector
export function calculateSectorDiversificationScore(
  holdings: HoldingWithPrice[]
): { score: number; distribution: Record<string, number> } {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0
  );

  if (totalValue === 0) return { score: 0, distribution: {} };

  const distribution: Record<string, number> = {};

  for (const h of holdings) {
    const sector = h.sector || "Autres";
    const value = h.quantity * h.currentPrice;
    distribution[sector] = (distribution[sector] || 0) + value / totalValue;
  }

  const sectors = Object.values(distribution);
  const maxConcentration = Math.max(...sectors, 0);
  const numSectors = sectors.length;

  let score = 50;
  if (maxConcentration > 0.6) {
    score -= (maxConcentration - 0.6) * 100;
  }
  score += Math.min(numSectors * 8, 40);
  const mean = 1 / numSectors;
  const variance = sectors.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / numSectors;
  score -= variance * 100;

  return { score: Math.max(0, Math.min(100, Math.round(score))), distribution };
}

// Global diversification score
export function calculateGlobalDiversificationScore(
  geoScore: number,
  sectorScore: number
): number {
  return Math.round(geoScore * 0.5 + sectorScore * 0.5);
}

// Projection calculation
export function calculateProjection(
  initialAmount: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): { year: number; invested: number; total: number; interest: number }[] {
  const monthlyReturn = annualReturn / 100 / 12;
  const results = [];
  let total = initialAmount;
  let invested = initialAmount;

  for (let year = 0; year <= years; year++) {
    results.push({
      year,
      invested: Math.round(invested * 100) / 100,
      total: Math.round(total * 100) / 100,
      interest: Math.round((total - invested) * 100) / 100,
    });

    for (let month = 0; month < 12; month++) {
      total = total * (1 + monthlyReturn) + monthlyContribution;
      invested += monthlyContribution;
    }
  }

  return results;
}

// Reverse calculator: how much to invest monthly to reach a goal
export function calculateRequiredMonthlyInvestment(
  targetAmount: number,
  currentAmount: number,
  annualReturn: number,
  years: number
): number {
  const monthlyReturn = annualReturn / 100 / 12;
  const months = years * 12;

  if (monthlyReturn === 0) {
    return (targetAmount - currentAmount) / months;
  }

  // FV = PV * (1+r)^n + PMT * ((1+r)^n - 1) / r
  // PMT = (FV - PV * (1+r)^n) * r / ((1+r)^n - 1)
  const compoundFactor = Math.pow(1 + monthlyReturn, months);
  const pmt =
    ((targetAmount - currentAmount * compoundFactor) * monthlyReturn) /
    (compoundFactor - 1);

  return Math.max(0, Math.round(pmt * 100) / 100);
}

// Yield on Cost
export function calculateYieldOnCost(
  annualDividendPerShare: number,
  averagePurchasePrice: number
): number {
  if (averagePurchasePrice <= 0) return 0;
  return (annualDividendPerShare / averagePurchasePrice) * 100;
}

// Dividend projection with DRIP
export function calculateDividendProjection(
  currentAnnualDividend: number,
  dividendGrowthRate: number,
  years: number,
  reinvest: boolean,
  currentYield: number
): { year: number; withDrip: number; withoutDrip: number }[] {
  const results = [];
  let dividendWithDrip = currentAnnualDividend;
  let dividendWithoutDrip = currentAnnualDividend;

  for (let year = 0; year <= years; year++) {
    results.push({
      year,
      withDrip: Math.round(dividendWithDrip * 100) / 100,
      withoutDrip: Math.round(dividendWithoutDrip * 100) / 100,
    });

    dividendWithoutDrip *= 1 + dividendGrowthRate / 100;
    if (reinvest && currentYield > 0) {
      // Reinvested dividends generate additional dividends
      dividendWithDrip =
        dividendWithDrip * (1 + dividendGrowthRate / 100) +
        dividendWithDrip * (currentYield / 100);
    } else {
      dividendWithDrip *= 1 + dividendGrowthRate / 100;
    }
  }

  return results;
}
