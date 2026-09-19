import type { RoadDefect, DefectLifecycleStatus, PriorityLevel, DeteriorationRateCategory } from '@/types';

export interface MaintenancePriorityResult {
  score: number; // 0 - 100
  classification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'Low Priority' | 'Medium Priority' | 'High Priority' | 'Critical Priority';
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defectSeverityScore: number; // 0 - 100
  defectDensityScore: number; // 0 - 100
  trafficLoad: number; // 0 - 100
  recurrenceScore: number; // 0 - 100
  roadImportanceScore: number; // 0 - 100
  roadSegment: string;
  roadCategory: string;
  explanation: string;
}

export interface DeteriorationIndexResult {
  index: number; // 0.0 - 10.0
  trend: 'STABLE' | 'SLOWLY_DETERIORATING' | 'RAPIDLY_DETERIORATING' | 'IMPROVING' | 'Stable' | 'Slow Deterioration' | 'Moderate Deterioration' | 'Rapid Deterioration';
  category: 'STABLE' | 'SLOWLY_DETERIORATING' | 'RAPIDLY_DETERIORATING' | 'IMPROVING';
  currentCondition: string;
  previousCondition: string;
  deteriorationRatePct: number; // e.g. +14.5%/month
  preventiveIndication: string;
  observationHistoryCount: number;
  isDecisionSupportOnly: boolean;
  disclaimer: string;
}

export interface RepairCostRates {
  potholePatchRatePerSqM: number;
  crackSealRatePerM: number;
  moderateRepairPerSqM: number;
  majorRepairPerSqM: number;
  fullRehabPerSqM: number;
}

export const DEFAULT_COST_RATES: RepairCostRates = {
  potholePatchRatePerSqM: 2800,
  crackSealRatePerM: 650,
  moderateRepairPerSqM: 3200,
  majorRepairPerSqM: 5800,
  fullRehabPerSqM: 11500,
};

export interface CostEstimationResult {
  affectedLengthMeters: number;
  affectedAreaSqM: number;
  repairCategory: 'Minor Patch' | 'Crack Seal' | 'Moderate Repair' | 'Major Overlay' | 'Full Reconstruction' | 'Minor Repair' | 'Moderate Repair' | 'Major Repair' | 'Full Rehabilitation';
  estimatedQuantity: string;
  estimatedCostINR: number;
  costRangeMinINR: number;
  costRangeMaxINR: number;
  unitRateINR: number;
  potholePatchRatePerSqM: number;
  crackSealRatePerM: number;
  isPrototypeEstimate: boolean;
  disclaimer: string;
}

export interface DefectIntelligence {
  priority: MaintenancePriorityResult;
  deterioration: DeteriorationIndexResult;
  costEstimate: CostEstimationResult;
}

export const LIFECYCLE_STAGES: Array<{
  key: DefectLifecycleStatus;
  canonical: 'DETECTED' | 'VERIFIED' | 'PRIORITIZED' | 'REPAIR_ACTION' | 'RE_OBSERVED' | 'RESOLVED';
  label: string;
  description: string;
  step: number;
  color: string;
  bgColor: string;
  borderHex: string;
}> = [
  {
    key: 'DETECTED',
    canonical: 'DETECTED',
    label: 'Detected',
    description: 'Identified via transit bus mobile camera edge perception',
    step: 1,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    borderHex: '#38bdf8',
  },
  {
    key: 'VERIFIED',
    canonical: 'VERIFIED',
    label: 'Verified',
    description: 'Observation verified with spatial & reliability check',
    step: 2,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderHex: '#fbbf24',
  },
  {
    key: 'PRIORITIZED',
    canonical: 'PRIORITIZED',
    label: 'Prioritized',
    description: 'Scored by Priority Engine for municipal works queue',
    step: 3,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderHex: '#f97316',
  },
  {
    key: 'REPAIR_ACTION',
    canonical: 'REPAIR_ACTION',
    label: 'Repair Action',
    description: 'Maintenance work order dispatched for field crew',
    step: 4,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    borderHex: '#a855f7',
  },
  {
    key: 'RE_OBSERVED',
    canonical: 'RE_OBSERVED',
    label: 'Re-Observed',
    description: 'Subsequent bus pass-by verification of road segment',
    step: 5,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/15',
    borderHex: '#818cf8',
  },
  {
    key: 'RESOLVED',
    canonical: 'RESOLVED',
    label: 'Resolved',
    description: 'Confirmed closed and restored in Digital Twin state',
    step: 6,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderHex: '#34d399',
  },
];

export function normalizeLifecycleStatus(status?: string): 'DETECTED' | 'VERIFIED' | 'PRIORITIZED' | 'REPAIR_ACTION' | 'RE_OBSERVED' | 'RESOLVED' {
  if (!status) return 'DETECTED';
  const s = status.toUpperCase().trim();
  if (s === 'DETECTED') return 'DETECTED';
  if (s === 'VERIFIED') return 'VERIFIED';
  if (s === 'PRIORITIZED') return 'PRIORITIZED';
  if (s === 'REPAIR_ACTION' || s === 'SCHEDULED' || s === 'REPAIR') return 'REPAIR_ACTION';
  if (s === 'RE_OBSERVED' || s === 'REOBSERVED' || s === 'INSPECTING') return 'RE_OBSERVED';
  if (s === 'RESOLVED' || s === 'REPAIRED' || s === 'CLOSED') return 'RESOLVED';
  return 'DETECTED';
}

export function getLifecycleStageIndex(status?: string): number {
  const norm = normalizeLifecycleStatus(status);
  const found = LIFECYCLE_STAGES.find((st) => st.canonical === norm);
  return found ? found.step : 1;
}

export function getNextLifecycleStatus(status?: string): 'DETECTED' | 'VERIFIED' | 'PRIORITIZED' | 'REPAIR_ACTION' | 'RE_OBSERVED' | 'RESOLVED' {
  const currentIdx = getLifecycleStageIndex(status);
  if (currentIdx >= 6) return 'RESOLVED';
  return LIFECYCLE_STAGES[currentIdx].canonical;
}

/**
 * Calculates Road Maintenance Priority, Deterioration Index, and Cost Estimates deterministically
 * for a given RoadDefect record.
 */
export function calculateDefectIntelligence(
  defect: RoadDefect,
  customRates: RepairCostRates = DEFAULT_COST_RATES
): DefectIntelligence {
  const addressLower = (defect.address || '').toLowerCase();

  // 1. Determine Road Importance & Base Traffic Load based on Pune Corridor metadata
  let trafficLoad = 75;
  let roadImportanceScore = 75;
  let roadCategory = 'Major Collector Road';

  if (addressLower.includes('karve') || addressLower.includes('university') || addressLower.includes('fc road')) {
    trafficLoad = 92;
    roadImportanceScore = 95;
    roadCategory = 'Arterial Transit Corridor';
  } else if (addressLower.includes('paud') || addressLower.includes('kothrud') || addressLower.includes('solapur')) {
    trafficLoad = 84;
    roadImportanceScore = 85;
    roadCategory = 'Primary Arterial Road';
  } else if (addressLower.includes('nagar') || addressLower.includes('satara') || addressLower.includes('sinhagad')) {
    trafficLoad = 88;
    roadImportanceScore = 88;
    roadCategory = 'High Density Transit Route';
  } else if (addressLower.includes('mg road') || addressLower.includes('camp')) {
    trafficLoad = 78;
    roadImportanceScore = 80;
    roadCategory = 'Urban Commercial Sector';
  }

  // 2. Defect Severity Score (0-100)
  let defectSeverityScore = 40;
  if (defect.severity === 'critical') defectSeverityScore = 95;
  else if (defect.severity === 'high') defectSeverityScore = 75;
  else if (defect.severity === 'medium') defectSeverityScore = 55;
  else if (defect.severity === 'low') defectSeverityScore = 35;

  // 3. Recurrence & Density Score based on reports & historical observation counts
  const reports = defect.reports || 1;
  const recurrenceScore = Math.min(100, Math.round(30 + reports * 14));
  const defectDensityScore = Math.min(100, Math.round(25 + reports * 12 + (defect.type === 'pothole' ? 15 : 5)));

  // 4. Calculate Maintenance Priority Score (0-100)
  // Factors: Defect Severity (35%), Defect Density (20%), Traffic/Congestion (25%), Recurrence (20%)
  const priorityScore = Math.min(100, Math.max(10, Math.round(
    0.35 * defectSeverityScore +
    0.20 * defectDensityScore +
    0.25 * trafficLoad +
    0.20 * recurrenceScore
  )));

  let priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let priorityClassification: MaintenancePriorityResult['classification'] = 'Low Priority';

  if (priorityScore >= 80) {
    priorityLevel = 'CRITICAL';
    priorityClassification = 'CRITICAL';
  } else if (priorityScore >= 65) {
    priorityLevel = 'HIGH';
    priorityClassification = 'HIGH';
  } else if (priorityScore >= 45) {
    priorityLevel = 'MEDIUM';
    priorityClassification = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
    priorityClassification = 'LOW';
  }

  const explanation = `Score ${priorityScore}/100 derived from Severity (${defectSeverityScore}/100, 35%), Defect Density (${defectDensityScore}/100, 20%), Traffic Load (${trafficLoad}/100, 25%), and Recurrence (${recurrenceScore}/100, 20%).`;

  const priorityResult: MaintenancePriorityResult = {
    score: priorityScore,
    classification: priorityClassification,
    level: priorityLevel,
    defectSeverityScore,
    defectDensityScore,
    trafficLoad,
    recurrenceScore,
    roadImportanceScore,
    roadSegment: defect.address || 'Unknown Road Segment',
    roadCategory,
    explanation,
  };

  // 5. Calculate Road Quality Deterioration Index (0.0 to 10.0)
  let trend: DeteriorationIndexResult['trend'] = 'STABLE';
  let category: DeteriorationIndexResult['category'] = 'STABLE';
  let deteriorationIndex = 2.0;
  let deteriorationRatePct = 3.2;
  let currentCondition = 'Good Condition';
  let previousCondition = 'Excellent Condition';
  let preventiveIndication = 'Routine Inspection & Preventive Surface Monitoring';

  const normStatus = normalizeLifecycleStatus(defect.status);
  const isResolved = normStatus === 'RESOLVED';

  if (isResolved) {
    deteriorationIndex = 1.2;
    category = 'IMPROVING';
    trend = 'IMPROVING';
    deteriorationRatePct = -18.5;
    currentCondition = 'Restored Surface Quality';
    previousCondition = 'Repaired Defect Site';
    preventiveIndication = 'Periodic Monitoring & Surface Cleanliness';
  } else if (defect.severity === 'critical' || reports >= 4) {
    deteriorationIndex = Math.min(10.0, Number((7.8 + (reports * 0.4)).toFixed(1)));
    category = 'RAPIDLY_DETERIORATING';
    trend = 'RAPIDLY_DETERIORATING';
    deteriorationRatePct = 24.8 + (reports * 2.5);
    currentCondition = 'Critical Surface Failure';
    previousCondition = 'Degraded Condition';
    preventiveIndication = 'Immediate Emergency Milling & Full Subbase Rehabilitation';
  } else if (defect.severity === 'high' || reports >= 2) {
    deteriorationIndex = Math.min(7.5, Number((5.2 + (reports * 0.3)).toFixed(1)));
    category = 'SLOWLY_DETERIORATING';
    trend = 'SLOWLY_DETERIORATING';
    deteriorationRatePct = 14.2 + (reports * 1.8);
    currentCondition = 'Severe Surface Distress';
    previousCondition = 'Fair Condition';
    preventiveIndication = 'Preventive Bituminous Resurfacing & Deep Crack Sealing';
  } else if (defect.severity === 'medium') {
    deteriorationIndex = 4.2;
    category = 'SLOWLY_DETERIORATING';
    trend = 'SLOWLY_DETERIORATING';
    deteriorationRatePct = 7.5 + (reports * 1.2);
    currentCondition = 'Moderate Potholes / Cracks';
    previousCondition = 'Good Condition';
    preventiveIndication = 'Localized Pothole Patching & Edge Sealant Application';
  } else {
    deteriorationIndex = 2.4;
    category = 'STABLE';
    trend = 'STABLE';
    deteriorationRatePct = 2.4;
    currentCondition = 'Minor Surface Wear';
    previousCondition = 'Satisfactory';
    preventiveIndication = 'Routine Seal Coating & Surface Cleaning';
  }

  const deteriorationResult: DeteriorationIndexResult = {
    index: deteriorationIndex,
    trend,
    category,
    currentCondition,
    previousCondition,
    deteriorationRatePct: Number(deteriorationRatePct.toFixed(1)),
    preventiveIndication,
    observationHistoryCount: reports,
    isDecisionSupportOnly: true,
    disclaimer: 'Prototype decision-support model only — based on repeated mobile perception observations.',
  };

  // 6. Calculate Maintenance Cost Estimation with Configurable Assumptions & Range
  let affectedLengthMeters = 2.5;
  let affectedAreaSqM = 3.5;

  if (defect.sizeEstimate) {
    const numbers = defect.sizeEstimate.match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length >= 2) {
      affectedLengthMeters = parseFloat(numbers[0]);
      const width = parseFloat(numbers[1]);
      affectedAreaSqM = Number((affectedLengthMeters * width).toFixed(1));
    } else if (numbers && numbers.length === 1) {
      affectedLengthMeters = parseFloat(numbers[0]);
      affectedAreaSqM = Number((affectedLengthMeters * 1.2).toFixed(1));
    }
  }

  // Fallback dimensions if not parseable
  if (affectedAreaSqM <= 0.2) {
    if (defect.severity === 'critical') {
      affectedLengthMeters = 12.0;
      affectedAreaSqM = 36.0;
    } else if (defect.severity === 'high') {
      affectedLengthMeters = 6.5;
      affectedAreaSqM = 14.5;
    } else if (defect.severity === 'medium') {
      affectedLengthMeters = 3.2;
      affectedAreaSqM = 6.0;
    } else {
      affectedLengthMeters = 1.5;
      affectedAreaSqM = 2.5;
    }
  }

  let repairCategory: CostEstimationResult['repairCategory'] = 'Minor Patch';
  let unitRateINR = customRates.potholePatchRatePerSqM;
  let estimatedQuantity = `${affectedAreaSqM} m² Bituminous Cold Patching`;
  let baseCost = 0;

  if (defect.type === 'crack') {
    repairCategory = 'Crack Seal';
    unitRateINR = customRates.crackSealRatePerM;
    estimatedQuantity = `${affectedLengthMeters}m Polymer Crack Sealing & Joint Repair`;
    baseCost = Math.round(affectedLengthMeters * customRates.crackSealRatePerM);
  } else if (defect.severity === 'critical' || affectedAreaSqM > 25) {
    repairCategory = 'Full Reconstruction';
    unitRateINR = customRates.fullRehabPerSqM;
    estimatedQuantity = `${affectedLengthMeters}m Corridor (${affectedAreaSqM} m²) Subbase & Asphalt Reconstruction`;
    baseCost = Math.round(affectedAreaSqM * customRates.fullRehabPerSqM);
  } else if (defect.severity === 'high' || affectedAreaSqM > 10) {
    repairCategory = 'Major Overlay';
    unitRateINR = customRates.majorRepairPerSqM;
    estimatedQuantity = `${affectedAreaSqM} m² Hot Mix Asphalt Milling & Overlay`;
    baseCost = Math.round(affectedAreaSqM * customRates.majorRepairPerSqM);
  } else if (defect.severity === 'medium' || affectedAreaSqM > 4) {
    repairCategory = 'Moderate Repair';
    unitRateINR = customRates.moderateRepairPerSqM;
    estimatedQuantity = `${affectedAreaSqM} m² Deep Pothole Patching & Tack Coat`;
    baseCost = Math.round(affectedAreaSqM * customRates.moderateRepairPerSqM);
  } else {
    repairCategory = 'Minor Patch';
    unitRateINR = customRates.potholePatchRatePerSqM;
    estimatedQuantity = `${affectedAreaSqM} m² Rapid Bituminous Patching`;
    baseCost = Math.round(affectedAreaSqM * customRates.potholePatchRatePerSqM);
  }

  const estimatedCostINR = baseCost;
  const costRangeMinINR = Math.round(baseCost * 0.85);
  const costRangeMaxINR = Math.round(baseCost * 1.25);

  const costResult: CostEstimationResult = {
    affectedLengthMeters,
    affectedAreaSqM,
    repairCategory,
    estimatedQuantity,
    estimatedCostINR,
    costRangeMinINR,
    costRangeMaxINR,
    unitRateINR,
    potholePatchRatePerSqM: customRates.potholePatchRatePerSqM,
    crackSealRatePerM: customRates.crackSealRatePerM,
    isPrototypeEstimate: true,
    disclaimer: 'Prototype estimate — planning support only',
  };

  return {
    priority: priorityResult,
    deterioration: deteriorationResult,
    costEstimate: costResult,
  };
}
