const LIMITS = Object.freeze({
  dimension: [5, 250],
  layerHeight: [0.02, 2],
  infill: [0, 100],
  speed: [1, 500],
  pricePerKg: [0, 10000],
  powerKw: [0, 100],
  electricityRate: [0, 100]
});

function boundedNumber(name, value, [min, max]) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new RangeError(name + " must be a finite number between " + min + " and " + max + ".");
  }
  return number;
}

export function calculatePartGeometry({ shape, x, y, z }) {
  x = boundedNumber("X", x, LIMITS.dimension);
  y = boundedNumber("Y", y, LIMITS.dimension);
  z = boundedNumber("Z", z, LIMITS.dimension);

  let volumeCm3;
  let description;
  if (shape === "cube") {
    volumeCm3 = x * y * z / 1000;
    description = "Rectangular-prism envelope";
  } else if (shape === "cylinder") {
    volumeCm3 = Math.PI * (x / 2) * (y / 2) * z / 1000;
    description = "Elliptical-cylinder envelope (X and Y are diameters)";
  } else if (shape === "bracket") {
    const wall = Math.min(8, Math.max(2, Math.min(x, y) * 0.1));
    const crossSectionMm2 = wall * y + (x - wall) * wall;
    volumeCm3 = crossSectionMm2 * z / 1000;
    description = "Idealized L-bracket with uniform wall thickness " + wall.toFixed(1) + " mm";
  } else {
    throw new RangeError("Unsupported geometry. Select cube, cylinder or bracket.");
  }
  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
    throw new RangeError("Calculated geometry volume is invalid.");
  }
  return { volumeCm3, description, dimensions: { x, y, z } };
}

export function calculatePrintEstimate(input) {
  if (input.process === "bio") {
    throw new RangeError("Bioprinting is a research overview only; no biological feedstock or process estimate is provided.");
  }
  const geometry = calculatePartGeometry(input);
  const layerHeight = boundedNumber("Layer height", input.layerHeight, LIMITS.layerHeight);
  const extrusion = input.process === "fdm" || input.process === "pellet";
  const infill = extrusion ? boundedNumber("Infill", input.infill, LIMITS.infill) : 100;
  const speed = extrusion ? boundedNumber("Machine speed", input.speed, LIMITS.speed) : 0;
  const pricePerKg = boundedNumber("Material price per kg", input.pricePerKg, LIMITS.pricePerKg);
  const powerKw = boundedNumber("Machine power", input.powerKw, LIMITS.powerKw);
  const electricityRate = boundedNumber("Electricity rate", input.electricityRate, LIMITS.electricityRate);
  const process = input.processModel;
  if (!process || !Number.isFinite(process.rate) || process.rate <= 0 ||
      !Number.isFinite(process.factor) || process.factor <= 0 ||
      !Number.isFinite(process.setup) || process.setup < 0) {
    throw new RangeError("A valid process model is required.");
  }
  const density = Number(input.materialDensity);
  if (!Number.isFinite(density) || density <= 0 || density > 30) {
    throw new RangeError("Material density must be greater than 0 and no more than 30 g/cm³.");
  }

  // The 18% shell allowance is a planning assumption, not a slicer wall calculation.
  const materialFraction = extrusion ? 0.18 + 0.82 * infill / 100 : 1;
  const depositedVolumeCm3 = geometry.volumeCm3 * materialFraction;
  const materialKg = depositedVolumeCm3 * density / 1000 * process.factor;
  const layers = Math.ceil(geometry.dimensions.z / layerHeight);

  let effectiveRate = process.rate;
  let rateExplanation = "Illustrative process-family throughput; not a machine specification.";
  if (extrusion) {
    const beadWidthMm = input.process === "pellet" ? 2.5 : 0.4;
    const theoreticalFlowCm3PerHour = speed * beadWidthMm * layerHeight * 3.6;
    effectiveRate = Math.min(process.rate, theoreticalFlowCm3PerHour);
    rateExplanation = "Limited by the lower of the illustrative machine throughput and speed × bead width × layer height.";
  }
  const geometryFactor = input.shape === "bracket" ? 1.22 : input.shape === "cylinder" ? 1.08 : 1;
  const durationHours = (depositedVolumeCm3 * process.factor * geometryFactor / effectiveRate) +
    (extrusion ? layers * 0.0015 : 0) + process.setup / 60;
  if (!Number.isFinite(durationHours) || durationHours < 0 || !Number.isFinite(materialKg)) {
    throw new RangeError("The estimate is outside the supported numeric range.");
  }

  const energyKwh = durationHours * powerKw;
  const materialCost = materialKg * pricePerKg;
  const energyCost = energyKwh * electricityRate;
  return {
    ...geometry,
    depositedVolumeCm3,
    materialFraction,
    materialKg,
    materialGrams: materialKg * 1000,
    durationHours,
    energyKwh,
    materialCost,
    energyCost,
    totalCost: materialCost + energyCost,
    layers,
    effectiveRate,
    rateExplanation,
    infillApplied: extrusion
  };
}
