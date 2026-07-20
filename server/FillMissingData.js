import { formatDate } from "./SizePrediction.js";

export function fillMissingData(history, intervalMinutes = 1) {
  if (!history.length) return [];

  const filled = [];
  const interval = intervalMinutes * 60 * 1000;

  for (let i = 0; i < history.length - 1; i++) {
    filled.push(history[i]);

    const current = new Date(history[i].data_i_czas).getTime();
    const next = new Date(history[i + 1].data_i_czas).getTime();

    const direction = current < next ? 1 : -1;
    const diff = Math.abs(next - current);

    // ile pełnych odstępów minutowych jest między rekordami
    const missingCount = Math.floor(diff / interval) - 1;

    for (let j = 1; j <= missingCount; j++) {
      filled.push({
        ...history[i],
        data_i_czas: formatDate(
          new Date(current + direction * interval * j)
        ),
        rozmiar_mb: null,
        rozmiar_prognoza: null,
      });
    }
  }

  filled.push(history[history.length - 1]);

  return filled;
}

export function fillMissingResourceData(history, intervalMinutes = 1) {
  if (!history.length) return [];

  const filled = [];
  const interval = intervalMinutes * 60 * 1000;

  const MAX_GENERATED_POINTS = 1000;

  for (let i = 0; i < history.length - 1; i++) {
    filled.push(history[i]);

    const current = new Date(history[i].data_i_czas).getTime();
    const next = new Date(history[i + 1].data_i_czas).getTime();

    if (next <= current) continue;

    const diff = next - current;
    const missingCount = Math.floor(diff / interval) - 1;

    if (missingCount > MAX_GENERATED_POINTS) {
      console.warn(
        `Wykryto zbyt dużą lukę między ${history[i].data_i_czas} a ${history[i + 1].data_i_czas}`
      );
      continue;
    }

    for (let j = 1; j <= missingCount; j++) {
      filled.push({
        ...history[i],
        data_i_czas: formatDate(new Date(current + interval * j)),
        zuzycie_cpu_procent: null,
        zuzycie_ramu_mb: null,
        zuzycie_dysku_mb: null,
        zuzycie_procesow: null,
        zuzycie_dysku_prognoza: null,
      });
    }
  }

  filled.push(history[history.length - 1]);

  return filled;
}

export function fillMissingStatusData(history, intervalMinutes = 1) {
  if (!history.length) return [];

  // Zaokrąglamy wszystkie istniejące rekordy do pełnej minuty
  const normalizedHistory = history.map((item) => {
    const d = new Date(item.data_i_czas);
    d.setSeconds(0, 0);

    return {
      ...item,
      data_i_czas: formatDate(d),
    };
  });

  const filled = [];
  const interval = intervalMinutes * 60 * 1000;

  for (let i = 0; i < normalizedHistory.length - 1; i++) {
    filled.push(normalizedHistory[i]);

    const current = new Date(normalizedHistory[i].data_i_czas).getTime();
    const next = new Date(normalizedHistory[i + 1].data_i_czas).getTime();

    if (current > next) {
      let missing = current - interval;

      while (missing > next) {
        filled.push({
          ...normalizedHistory[i],
          data_i_czas: formatDate(new Date(missing)),
          status: null,
          ping_ms: null,
          blad: null,
        });

        missing -= interval;
      }
    }
  }

  filled.push(normalizedHistory[normalizedHistory.length - 1]);

  return filled;
}