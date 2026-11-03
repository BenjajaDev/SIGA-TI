const MS_PER_HOUR = 3_600_000;

export interface ResolvedSample {
  readonly createdAt: Date;
  readonly resolvedAt: Date;
  readonly dueAt: Date;
}

export interface ResolutionStats {
  readonly resolvedCount: number;
  readonly averageResolutionHours: number | null;
  readonly slaCompliancePercent: number | null;
  readonly withinSlaCount: number;
  readonly breachedCount: number;
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const computeResolutionStats = (samples: readonly ResolvedSample[]): ResolutionStats => {
  if (samples.length === 0) {
    return {
      resolvedCount: 0,
      averageResolutionHours: null,
      slaCompliancePercent: null,
      withinSlaCount: 0,
      breachedCount: 0,
    };
  }
  const totalMs = samples.reduce(
    (sum, sample) => sum + (sample.resolvedAt.getTime() - sample.createdAt.getTime()),
    0,
  );
  const withinSlaCount = samples.filter(
    (sample) => sample.resolvedAt.getTime() <= sample.dueAt.getTime(),
  ).length;
  return {
    resolvedCount: samples.length,
    averageResolutionHours: round(totalMs / samples.length / MS_PER_HOUR, 2),
    slaCompliancePercent: round((withinSlaCount / samples.length) * 100, 1),
    withinSlaCount,
    breachedCount: samples.length - withinSlaCount,
  };
};
