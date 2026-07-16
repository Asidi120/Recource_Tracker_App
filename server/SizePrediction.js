export function formatDate(date) {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function linearRegression(history, valueKey = "rozmiar_mb") {
  if (!history || history.length < 2) return null;

  const points = [];
  const len = history.length;

  for (let i = 0; i < len; i++) {
    const item = history[i];
    if (!item) break;

    const val = Number(item[valueKey]);
    if (!isNaN(val) && item[valueKey] !== null) {
      points.push({
        x: new Date(item.data_i_czas).getTime(),
        y: val,
      });
    }
  }

  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function predictUntilEndOfYear(history, valueKey = "rozmiar_mb", predictionKey = "rozmiar_prognoza") {
  if (!history.length) return [];

  const regression = linearRegression(history, valueKey);

  if (!regression) return [];

  const { slope, intercept } = regression;
  const template = history[history.length - 1];
  const prediction = [];
  const lastDate = new Date(template.data_i_czas);
  const endDate = new Date(lastDate.getFullYear(), 11, 31);
  const current = new Date(lastDate);

  current.setDate(current.getDate() + 7);

  while (current <= endDate) {
    prediction.push({
      ...template,
      data_i_czas: formatDate(current),
      [valueKey]: null,
      [predictionKey]: Number(
        (slope * current.getTime() + intercept).toFixed(2)
      ),
    });

    current.setDate(current.getDate() + 7);
  }

  return prediction;
}

export function calculateAverageGrowth30Days(history, valueKey = "rozmiar_mb") {
  if (!history || history.length < 2) return null;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);

  const last30Days = history
    .filter(
      (x) =>
        x[valueKey] != null &&
        new Date(x.data_i_czas) >= from
    )
    .sort(
      (a, b) =>
        new Date(a.data_i_czas) - new Date(b.data_i_czas)
    );

  if (last30Days.length < 2) return null;

  const first = last30Days[0];
  const last = last30Days[last30Days.length - 1];

  const days =
    (new Date(last.data_i_czas) - new Date(first.data_i_czas)) /
    (1000 * 60 * 60 * 24);

  if (days <= 0) return null;

  return Number(
    ((Number(last[valueKey]) - Number(first[valueKey])) / days).toFixed(2)
  );
}

export function predictFullDate(lastMeasurementDate, currentSize, limitSize, averageGrowth) {
  if (
    averageGrowth == null ||
    averageGrowth <= 0 ||
    currentSize >= limitSize
  ) {
    return null;
  }
  const daysLeft = (limitSize - currentSize) / averageGrowth;
  const date = new Date(lastMeasurementDate);
  
  date.setDate(date.getDate() + Math.ceil(daysLeft));

  return formatDate(date);
}