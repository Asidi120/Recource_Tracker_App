import { formatDate } from "./SizePrediction.js";

function getIntervalMinutes(date) {
  const now = Date.now();
  const diffDays =
    (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 1;       // ostatnie 24h
  if (diffDays <= 7) return 10;      // 1-7 dni
  if (diffDays <= 30) return 60;     // 7-30 dni
  if (diffDays <= 365) return 720;   // 30 dni - rok
  return 2880;                       // > rok (2 dni)
}

function nextTimestamp(timestamp, direction) {
  const interval =
    getIntervalMinutes(new Date(timestamp)) * 60 * 1000;

  return timestamp + direction * interval;
}

function normalizeMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d.getTime();
}


function fillHistory(history, nullFields) {
  if (!history.length) return [];

  const filled = [];
  const MAX_GENERATED_POINTS = 1000;


  for (let i = 0; i < history.length - 1; i++) {

    const current = normalizeMinute(
      history[i].data_i_czas
    );

    const next = normalizeMinute(
      history[i + 1].data_i_czas
    );


    filled.push({
      ...history[i],
      data_i_czas: formatDate(new Date(current))
    });


    const direction = current < next ? 1 : -1;


    let missing = nextTimestamp(current, direction);

    let generated = 0;


    while (
      (direction > 0 && missing < next) ||
      (direction < 0 && missing > next)
    ) {

      if (++generated > MAX_GENERATED_POINTS) {
        console.warn(
          `Za dużo punktów pomiędzy ${history[i].data_i_czas} i ${history[i + 1].data_i_czas}`
        );
        break;
      }


      const row = {
        ...history[i],
        data_i_czas: formatDate(
          new Date(missing)
        ),
      };


      for (const field of nullFields) {
        row[field] = null;
      }


      filled.push(row);


      missing = nextTimestamp(
        missing,
        direction
      );
    }
  }


  const last = history[history.length - 1];

  filled.push({
    ...last,
    data_i_czas: formatDate(
      new Date(
        normalizeMinute(last.data_i_czas)
      )
    )
  });


  return filled;
}

export function fillMissingData(history) {
  return fillHistory(history, [
    "rozmiar_mb",
    "rozmiar_prognoza",
  ]);
}

export function fillMissingResourceData(history) {
  return fillHistory(history, [
    "zuzycie_cpu_procent",
    "zuzycie_ramu_mb",
    "zuzycie_dysku_mb",
    "zuzycie_procesow",
    "zuzycie_dysku_prognoza",
  ]);
}

export function fillMissingStatusData(history) {
  if (!history.length) return [];

  const normalized = history.map((item) => {
    const d = new Date(item.data_i_czas);
    d.setSeconds(0, 0);

    return {
      ...item,
      data_i_czas: formatDate(d),
    };
  });

  return fillHistory(normalized, [
    "status",
    "ping_ms",
    "blad",
  ]);
}