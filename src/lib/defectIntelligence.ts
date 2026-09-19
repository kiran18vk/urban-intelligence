import type { RoadDefect } from '@/types';

export interface MaintenancePriorityResult {
  score: number; // 0 - 100
  classification: 'Critical Priority' | 'High Priority' | 'Medium Priority' | 'Low Priority';
  defectSeverityScore: number; // 0 - 100
  trafficLoad: number; // 0 - 100
  recurrenceScore: number; // 0 - 100
  roadImportanceScore: number; // 0 - 100
  roadSegment: string;
  roadCategory: string;
}

export interface DeteriorationIndexResult {
  currentCondition: string;
  previousCondition: string;
  deteriorationRatePct: number; // e.g. +14.5%/month
  trend: 'Rapid Deterioration' | 'Moderate Deterioration' | 'Slow Deterioration' | 'Stable';
  preventiveIndication: string;
  isEstimateData: boolean;
}

export interface RepairCostRates {
  minorRepairPerSqM: number;
  moderateRepairPerSqM: number;
  majorRepairPerSqM: number;
  fullRehabPerSqM: number;
}

export const DEFAULT_COST_RATES: RepairCostRates = {
  minorRepairPerSqM: 1200,
  moderateRepairPerSqM: 2800,
  majorRepairPerSqM: 5500,
  fullRehabPerSqM: 12000,
};

export interface CostEstimationResult {
  affectedLengthMeters: number;
  affectedAreaSqM: number;
  repairCategory: 'Minor Repair' | 'Moderate Repair' | 'Major Repair' | 'Full Rehabilitation';
  estimatedQuantity: string;
  estimatedCostINR: number;
  unitRateINR: number;
  isPrototypeEstimate: boolean;
}

export interface DefectIntelligence {
  priority: MaintenancePriorityResult;
  deterioration: DeteriorationIndexResult;
  costEstimate: CostEstimationResult;
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

  // 2. Defect Severity Score
  let defectSeverityScore = 40;
  if (defect.severity === 'critical') defectSeverityScore = 95;
  else if (defect.severity === 'high') defectSeverityScore = 75;
  else if (defect.severity === 'medium') defectSeverityScore = 55;
  else if (defect.severity === 'low') defectSeverityScore = 35;

  // 3. Recurrence Score based on reports & historical observation counts
  const reports = defect.reports || 1;
  const recurrenceScore = Math.min(100, Math.round(30 + reports * 14));

  // 4. Calculate Maintenance Priority Score (0-100)
  const priorityScore = Math.round(
    0.35 * defectSeverityScore +
    0.25 * trafficLoad +
    0.20 * recurrenceScore +
    0.20 * roadImportanceScore
  );

  let priorityClassification: MaintenancePriorityResult['classification'] = 'Low Priority';
  if (priorityScore >= 80) priorityClassification = 'Critical Priority';
  else if (priorityScore >= 65) priorityClassification = 'High Priority';
  else if (priorityScore >= 45) priorityClassification = 'Medium Priority';

  const priorityResult: MaintenancePriorityResult = {
    score: priorityScore,
    classification: priorityClassification,
    defectSeverityScore,
    trafficLoad,
    recurrenceScore,
    roadImportanceScore,
    roadSegment: defect.address || 'Unknown Road Segment',
    roadCategory,
  };

  // 5. Calculate Road Quality Deterioration Index
  let trend: DeteriorationIndexResult['trend'] = 'Stable';
  let deteriorationRatePct = 3.2;
  let currentCondition = 'Good Condition';
  let previousCondition = 'Excellent Condition';
  let preventiveIndication = 'Routine Inspection & Preventive Surface Monitoring';

  if (defect.severity === 'critical' || reports >= 4) {
    trend = 'Rapid Deterioration';
    deteriorationRatePct = 24.8 + (reports * 2.5);
    currentCondition = 'Critical Surface Failure';
    previousCondition = 'Degraded Condition';
    preventiveIndication = 'Immediate Emergency Milling & Full Subbase Rehabilitation';
  } else if (defect.severity === 'high' || reports >= 2) {
    trend = 'Moderate Deterioration';
    deteriorationRatePct = 14.2 + (reports * 1.8);
    currentCondition = 'Severe Surface Distress';
    previousCondition = 'Fair Condition';
    preventiveIndication = 'Preventive Bituminous Resurfacing & Deep Crack Sealing';
  } else if (defect.severity === 'medium') {
    trend = 'Slow Deterioration';
    deteriorationRatePct = 7.5 + (reports * 1.2);
    currentCondition = 'Moderate Potholes / Cracks';
    previousCondition = 'Good Condition';
    preventiveIndication = 'Localized Pothole Patching & Edge Sealant Application';
  } else {
    trend = 'Stable';
    deteriorationRatePct = 2.4;
    currentCondition = 'Minor Surface Wear';
    previousCondition = 'Satisfactory';
    preventiveIndication = 'Routine Seal Coating & Surface Cleaning';
  }

  const deteriorationResult: DeteriorationIndexResult = {
    currentCondition,
    previousCondition,
    deteriorationRatePct: Number(deteriorationRatePct.toFixed(1)),
    trend,
    preventiveIndication,
    isEstimateData: true,
  };

  // 6. Calculate Maintenance Cost Estimation
  // Estimate dimensions from defect size string (e.g. "1.2m x 0.8m") or defect type/severity
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

  // Fallback defaults if size estimate was unavailable
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

  let repairCategory: CostEstimationResult['repairCategory'] = 'Minor Repair';
  let unitRateINR = customRates.minorRepairPerSqM;
  let estimatedQuantity = `${affectedAreaSqM} m² Bituminous Cold Patching`;

  if (defect.severity === 'critical' || affectedAreaSqM > 25) {
    repairCategory = 'Full Rehabilitation';
    unitRateINR = customRates.fullRehabPerSqM;
    estimatedQuantity = `${affectedLengthMeters}m Corridor (${affectedAreaSqM} m²) Subbase & Asphalt Reconstruction`;
  } else if (defect.severity === 'high' || affectedAreaSqM > 10) {
    repairCategory = 'Major Repair';
    unitRateINR = customRates.majorRepairPerSqM;
    estimatedQuantity = `${affectedAreaSqM} m² Hot Mix Asphalt Milling & Overlay`;
  } else if (defect.severity === 'medium' || affectedAreaSqM > 4) {
    repairCategory = 'Moderate Repair';
    unitRateINR = customRates.moderateRepairPerSqM;
    estimatedQuantity = `${affectedAreaSqM} m² Deep Pothole Repair & Crack Filling`;
  }

  const estimatedCostINR = Math.round(affectedAreaSqM * unitRateINR);

  const costResult: CostEstimationResult = {
    affectedLengthMeters,
    affectedAreaSqM,
    repairCategory,
    estimatedQuantity,
    estimatedCostINR,
    unitRateINR,
    isPrototypeEstimate: true,
  };

  return {
    priority: priorityResult,
    deterioration: deteriorationResult,
    costEstimate: costResult,
  };
}
