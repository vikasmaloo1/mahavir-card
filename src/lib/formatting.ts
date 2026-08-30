type NumericValue = number | string | null | undefined;

export function formatInr(value: NumericValue) {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `\u20b9${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(safeAmount)}`;
}

export function formatDimension(value: NumericValue) {
  if (value === null || value === undefined || value === "") return null;
  const dimension = Number(value);
  if (!Number.isFinite(dimension)) return null;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(dimension);
}

export function formatDimensions(width: NumericValue, height: NumericValue, unit = "mm") {
  const formattedWidth = formatDimension(width);
  const formattedHeight = formatDimension(height);
  return formattedWidth && formattedHeight ? `${formattedWidth} \u00d7 ${formattedHeight} ${unit}` : null;
}
