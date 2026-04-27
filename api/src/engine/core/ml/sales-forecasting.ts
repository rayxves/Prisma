import type { EncodedRow } from "../cleaner/data-cleaner";

const ALL_FEATURES: Feature[] = [
  "dayOfWeek",
  "monthOfYear",
  "categoriaCode",
  "custo_total",
  "quantidade",
  "margem",
];

const MIN_SELECTED_FEATURES = 3;
const MIN_ROWS_FOR_TRAINING = 10;
const CONFIDENCE_INTERVAL_MULTIPLIER = 1.96;

interface FeatureScore {
  feature: Feature;
  score: number;
}

interface HistoricalContext {
  averageCost: number;
  averageQuantity: number;
  averageMargin: number;
  dominantCategory: number;
}

export type Feature = keyof EncodedRow;

export interface Stump {
  feature: Feature;
  threshold: number;
  leftValue: number;
  rightValue: number;
}

export interface BoostedModel {
  stumps: Stump[];
  learningRate: number;
  baselinePrediction: number;
  trainedAt: string;
  featuresUsed: Feature[];
  rmse: number;
  r2: number;
}

export interface SalesProjection {
  date: string;
  projected: number;
  lower: number;
  upper: number;
}

function calculateAverage(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateAbsolutePearsonCorrelation(
  featureValues: number[],
  targetValues: number[],
): number {
  const valueCount = featureValues.length;
  const featureAverage = calculateAverage(featureValues);
  const targetAverage = calculateAverage(targetValues);

  let numerator = 0;
  let featureVariance = 0;
  let targetVariance = 0;

  for (let index = 0; index < valueCount; index++) {
    const featureDistance = featureValues[index]! - featureAverage;
    const targetDistance = targetValues[index]! - targetAverage;

    numerator += featureDistance * targetDistance;
    featureVariance += featureDistance * featureDistance;
    targetVariance += targetDistance * targetDistance;
  }

  const denominator = Math.sqrt(featureVariance * targetVariance);
  return denominator === 0 ? 0 : Math.abs(numerator / denominator);
}

function scoreFeatures(
  rows: EncodedRow[],
  targetValues: number[],
): FeatureScore[] {
  return ALL_FEATURES.map((feature) => ({
    feature,
    score: calculateAbsolutePearsonCorrelation(
      rows.map((row) => row[feature]),
      targetValues,
    ),
  })).sort((left, right) => right.score - left.score);
}

function createBaselineModel(
  rows: EncodedRow[],
  features: Feature[],
  learningRate: number,
): BoostedModel {
  const baselinePrediction = calculateAverage(
    rows.map((row) => row.valor_bruto),
  );

  return {
    stumps: [],
    learningRate,
    baselinePrediction,
    trainedAt: new Date().toISOString(),
    featuresUsed: features,
    rmse: 0,
    r2: 0,
  };
}

export function selectFeatures(
  rows: EncodedRow[],
  correlationThreshold = 0.05,
): Feature[] {
  const targetValues = rows.map((row) => row.valor_bruto);
  const rankedFeatures = scoreFeatures(rows, targetValues);
  const selectedFeatures = rankedFeatures
    .filter((featureScore) => featureScore.score >= correlationThreshold)
    .map((featureScore) => featureScore.feature);

  return selectedFeatures.length >= MIN_SELECTED_FEATURES
    ? selectedFeatures
    : rankedFeatures
        .slice(0, MIN_SELECTED_FEATURES)
        .map((featureScore) => featureScore.feature);
}

function trainDecisionStump(
  rows: EncodedRow[],
  residuals: number[],
  feature: Feature,
): Stump {
  const featureValues = rows.map((row) => row[feature]);
  const sortedDistinctValues = [...new Set(featureValues)].sort(
    (left, right) => left - right,
  );

  let bestSse = Infinity;
  let bestThreshold = sortedDistinctValues[0]!;
  let bestLeftValue = 0;
  let bestRightValue = 0;

  for (let index = 0; index < sortedDistinctValues.length - 1; index++) {
    const threshold =
      (sortedDistinctValues[index]! + sortedDistinctValues[index + 1]!) / 2;
    const leftResiduals = residuals.filter(
      (_, residualIndex) => featureValues[residualIndex]! <= threshold,
    );
    const rightResiduals = residuals.filter(
      (_, residualIndex) => featureValues[residualIndex]! > threshold,
    );

    if (leftResiduals.length === 0 || rightResiduals.length === 0) {
      continue;
    }

    const leftPrediction = calculateAverage(leftResiduals);
    const rightPrediction = calculateAverage(rightResiduals);
    const sse =
      leftResiduals.reduce(
        (sum, residual) => sum + Math.pow(residual - leftPrediction, 2),
        0,
      ) +
      rightResiduals.reduce(
        (sum, residual) => sum + Math.pow(residual - rightPrediction, 2),
        0,
      );

    if (sse < bestSse) {
      bestSse = sse;
      bestThreshold = threshold;
      bestLeftValue = leftPrediction;
      bestRightValue = rightPrediction;
    }
  }

  return {
    feature,
    threshold: bestThreshold,
    leftValue: bestLeftValue,
    rightValue: bestRightValue,
  };
}

function predictStump(stump: Stump, row: EncodedRow): number {
  return row[stump.feature] <= stump.threshold
    ? stump.leftValue
    : stump.rightValue;
}

function calculateStumpSse(
  stump: Stump,
  rows: EncodedRow[],
  residuals: number[],
): number {
  return rows.reduce((sum, row, index) => {
    const predictedResidual = predictStump(stump, row);
    const actualResidual = residuals[index]!;
    return sum + Math.pow(actualResidual - predictedResidual, 2);
  }, 0);
}

function updatePredictions(
  predictions: number[],
  rows: EncodedRow[],
  stump: Stump,
  learningRate: number,
): void {
  rows.forEach((row, index) => {
    predictions[index]! += learningRate * predictStump(stump, row);
  });
}

export function trainModel(
  rows: EncodedRow[],
  features: Feature[],
  nEstimators = 50,
  learningRate = 0.1,
): BoostedModel {
  if (rows.length < MIN_ROWS_FOR_TRAINING) {
    return createBaselineModel(rows, features, learningRate);
  }

  const targetValues = rows.map((row) => row.valor_bruto);
  const baselinePrediction = calculateAverage(targetValues);
  const predictions = new Array<number>(rows.length).fill(baselinePrediction);
  const stumps: Stump[] = [];

  for (let estimatorIndex = 0; estimatorIndex < nEstimators; estimatorIndex++) {
    const residuals = targetValues.map(
      (targetValue, index) => targetValue - predictions[index]!,
    );

    let bestStump: Stump | null = null;
    let bestSse = Infinity;

    for (const feature of features) {
      const candidateStump = trainDecisionStump(rows, residuals, feature);
      const candidateSse = calculateStumpSse(candidateStump, rows, residuals);

      if (candidateSse < bestSse) {
        bestSse = candidateSse;
        bestStump = candidateStump;
      }
    }

    if (!bestStump) {
      break;
    }

    stumps.push(bestStump);
    updatePredictions(predictions, rows, bestStump, learningRate);
  }

  const { rmse, r2 } = evaluateModel(targetValues, predictions);

  return {
    stumps,
    learningRate,
    baselinePrediction,
    trainedAt: new Date().toISOString(),
    featuresUsed: features,
    rmse: parseFloat(rmse.toFixed(2)),
    r2: parseFloat(r2.toFixed(4)),
  };
}

export function predict(
  model: BoostedModel,
  row: EncodedRow,
): { value: number; lower: number; upper: number } {
  let prediction = model.baselinePrediction;

  for (const stump of model.stumps) {
    prediction += model.learningRate * predictStump(stump, row);
  }

  const confidenceInterval = CONFIDENCE_INTERVAL_MULTIPLIER * model.rmse;

  return {
    value: Math.max(0, parseFloat(prediction.toFixed(2))),
    lower: Math.max(
      0,
      parseFloat((prediction - confidenceInterval).toFixed(2)),
    ),
    upper: parseFloat((prediction + confidenceInterval).toFixed(2)),
  };
}

function buildHistoricalContext(rows: EncodedRow[]): HistoricalContext {
  if (rows.length === 0) {
    return {
      averageCost: 0,
      averageQuantity: 1,
      averageMargin: 0.3,
      dominantCategory: 0,
    };
  }

  return {
    averageCost:
      rows.reduce((sum, row) => sum + row.custo_total, 0) / rows.length,
    averageQuantity:
      rows.reduce((sum, row) => sum + row.quantidade, 0) / rows.length,
    averageMargin: rows.reduce((sum, row) => sum + row.margem, 0) / rows.length,
    dominantCategory: findMode(rows.map((row) => row.categoriaCode)),
  };
}

function buildProjectedRow(date: Date, context: HistoricalContext): EncodedRow {
  return {
    dayOfWeek: date.getDay(),
    monthOfYear: date.getMonth() + 1,
    categoriaCode: context.dominantCategory,
    custo_total: context.averageCost,
    quantidade: context.averageQuantity,
    margem: context.averageMargin,
    valor_bruto: 0,
  };
}

export function projectFutureSales(
  model: BoostedModel,
  _branchId: string,
  horizon = 30,
  lastRows: EncodedRow[] = [],
): SalesProjection[] {
  const projections: SalesProjection[] = [];
  const historicalContext = buildHistoricalContext(lastRows);
  const today = new Date();

  for (let dayOffset = 1; dayOffset <= horizon; dayOffset++) {
    const projectedDate = new Date(today);
    projectedDate.setDate(today.getDate() + dayOffset);

    const projectedRow = buildProjectedRow(projectedDate, historicalContext);
    const { value, lower, upper } = predict(model, projectedRow);

    projections.push({
      date: projectedDate.toISOString().slice(0, 10),
      projected: value,
      lower,
      upper,
    });
  }

  return projections;
}

function evaluateModel(
  actual: number[],
  predicted: number[],
): { rmse: number; r2: number } {
  const valueCount = actual.length;
  const actualAverage = calculateAverage(actual);

  let residualSum = 0;
  let totalSum = 0;

  for (let index = 0; index < valueCount; index++) {
    residualSum += Math.pow(actual[index]! - predicted[index]!, 2);
    totalSum += Math.pow(actual[index]! - actualAverage, 2);
  }

  const rmse = Math.sqrt(residualSum / valueCount);
  const r2 = totalSum === 0 ? 0 : 1 - residualSum / totalSum;

  return { rmse, r2 };
}

function findMode(values: number[]): number {
  const frequencyByValue = new Map<number, number>();

  values.forEach((value) => {
    frequencyByValue.set(value, (frequencyByValue.get(value) ?? 0) + 1);
  });

  let mostFrequentValue = values[0] ?? 0;
  let highestFrequency = 0;

  frequencyByValue.forEach((frequency, value) => {
    if (frequency > highestFrequency) {
      highestFrequency = frequency;
      mostFrequentValue = value;
    }
  });

  return mostFrequentValue;
}
