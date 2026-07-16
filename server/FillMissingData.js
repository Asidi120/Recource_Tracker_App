import { formatDate } from "./SizePrediction.js";

export function fillMissingData(history, intervalMinutes = 1) {
  if (!history.length) return [];

  const filled = [];
  const interval = intervalMinutes * 60 * 1000;

  for (let i = 0; i < history.length - 1; i++) {
    filled.push(history[i]);

    let current = new Date(history[i].data_i_czas).getTime();
    let next = new Date(history[i + 1].data_i_czas).getTime();

    if (current > next) {
      let missing = current - interval;

      while (missing > next) {
        filled.push({
          ...history[i],
          data_i_czas: formatDate(new Date(missing)),
          rozmiar_mb: null,
          rozmiar_prognoza: null,
        });

        missing -= interval;
      }
    } else {
      // jeżeli dane są od najstarszych do najnowszych
      let missing = current + interval;

      while (missing < next) {
        filled.push({
          ...history[i],
          data_i_czas: formatDate(new Date(missing)),
          rozmiar_mb: null,
          rozmiar_prognoza: null,
        });

        missing += interval;
      }
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

    if (current < next) {
      let nextMissing = current + interval;
      let generatedCount = 0;

      while (nextMissing < next) {
        if (generatedCount > MAX_GENERATED_POINTS) {
          console.warn(`Wykryto zbyt dużą lukę w danych między ${history[i].data_i_czas} a ${history[i+1].data_i_czas}. Pomijanie generowania punktów.`);
          break; 
        }

        filled.push({
          ...history[i],
          data_i_czas: formatDate(new Date(nextMissing)),
          zuzycie_cpu_procent: null,
          zuzycie_ramu_mb: null,
          zuzycie_dysku_mb: null,
          zuzycie_procesow: null,
          zuzycie_dysku_prognoza: null,
        });

        nextMissing += interval;
        generatedCount++;
      }
    }
  }

  filled.push(history[history.length - 1]);
  return filled;
}