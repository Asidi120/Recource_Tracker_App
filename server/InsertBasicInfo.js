import fs from "fs/promises";
import { sendGoogleChat, checkAlarm } from "./SendGoogleAlerts.js";

export async function InsertBasicInfo(db, hostingId, zasoby, serwer, login) {
  console.log("START InsertBasicInfo");

  try {
    // 2. Zapisywanie ogólnego zużycia zasobów
    await db.query(
      `INSERT IGNORE INTO ZUZYCIE_ZASOBOW (
        hosting_id,
        data_i_czas,
        zuzycie_cpu_procent,
        zuzycie_ramu_mb,
        limit_ramu_mb,
        zuzycie_ramu_procent,
        zuzycie_dysku_mb,
        limit_dysku_mb,
        zuzycie_dysku_procent,
        zuzycie_procesow,
        limit_procesow
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hostingId,
        zasoby.data_i_czas,
        zasoby.zuzycie_cpu_procent,
        zasoby.zuzycie_ramu_mb,
        zasoby.limit_ramu_mb,
        zasoby.zuzycie_ramu_procent,
        zasoby.zuzycie_dysku_mb,
        zasoby.limit_dysku_mb,
        zasoby.zuzycie_dysku_procent,
        zasoby.zuzycie_procesow,
        zasoby.limit_procesow,
      ],
    );

    // 3. Sprawdzenie, czy usługa typu 'serwer' już istnieje dla tego hostingu
    const [rows] = await db.query(
      `SELECT id 
       FROM USLUGI 
       WHERE hosting_id = ? AND typ = 'serwer' AND nazwa = ?`,
      [hostingId, serwer],
    );

    let uslugaId;

    if (rows.length === 0) {
      const [result] = await db.query(
        `INSERT INTO USLUGI (hosting_id, nazwa, typ) VALUES (?, ?, 'serwer')`,
        [hostingId, serwer],
      );
      uslugaId = result.insertId;
    } else {
      uslugaId = rows[0].id;
    }

    // 4. Zapisanie pomiaru historii do ROZMIAR_USLUGI
    await db.query(
      `INSERT IGNORE INTO ROZMIAR_USLUGI (
        usluga_id,
        rozmiar_mb,
        data_i_czas
      ) VALUES (?, ?, ?)`,
      [uslugaId, zasoby.zuzycie_dysku_mb, zasoby.data_i_czas],
    );
    await checkAlarm(
      db,
      hostingId,
      "CPU",
      zasoby.zuzycie_cpu_procent >= 90,
      `Wysokie użycie CPU\nSerwer: ${serwer}\nLogin: ${login}\nCPU: ${zasoby.zuzycie_cpu_procent}%`,
    );

    await checkAlarm(
      db,
      hostingId,
      "RAM",
      zasoby.zuzycie_ramu_procent >= 90,
      `Wysokie użycie RAM\nSerwer: ${serwer}\nLogin: ${login}\nRAM: ${zasoby.zuzycie_ramu_mb} MB (${zasoby.zuzycie_ramu_procent}%)`,
    );

    await checkAlarm(
      db,
      hostingId,
      "DYSK",
      zasoby.zuzycie_dysku_procent >= 90,
      `Kończy się miejsce na dysku\nSerwer: ${serwer}\nLogin: ${login}\nDysk: ${zasoby.zuzycie_dysku_mb} MB (${zasoby.zuzycie_dysku_procent}%)`,
    );

    await checkAlarm(
      db,
      hostingId,
      "PROCESY",
      zasoby.zuzycie_procesow >= zasoby.limit_procesow * 0.9,
      `Wysokie użycie procesów\nSerwer: ${serwer}\nLogin: ${login}\nProcesy: ${zasoby.zuzycie_procesow}/${zasoby.limit_procesow}`,
    );
  } catch (error) {
    console.error(
      `Błąd w InsertBasicInfo dla hostingu ${hostingId}:`,
      error.message,
    );
  }
}
