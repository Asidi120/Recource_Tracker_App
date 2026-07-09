//import fs from "fs/promises";
import { detectTech } from "./TechDetector.js";
import ping from "ping";

export async function InsertStatusInfo(db, hostingId, strony) {
  console.log("START InsertStatusInfo");
  console.log("Dane z status_stron.json:", strony);

  for (const strona of strony) {
    const techs = await detectTech(strona.domena);
    console.log(`Technologie wykryte dla ${strona.domena}:`, techs);

    const [rows] = await db.query(
      `SELECT id
       FROM USLUGI
       WHERE hosting_id = ?
         AND typ = 'www'
         AND nazwa = ?`,
      [
        hostingId,
        strona.domena
      ]
    );

    let uslugaId;

    if (rows.length === 0) {
      const [result] = await db.query(
        `INSERT INTO USLUGI (
          hosting_id,
          nazwa,
          typ
        )
        VALUES (?,?,'www')`,
        [hostingId, strona.domena],
      );

      uslugaId = result.insertId;

      console.log(`Dodano usługę www: ${strona.domena} (id=${uslugaId})`);
    } else {
      uslugaId = rows[0].id;
    }

        for (const tech of techs) {
      const [rowsTech] = await db.query(
        "SELECT id FROM TECHNOLOGIE WHERE nazwa = ?",
        [tech],
      );

      if (!rowsTech.length) continue;

      await db.query(
        `INSERT IGNORE INTO USLUGI_TECHNOLOGIE
        (usluga_id, technologia_id)
        VALUES (?, ?)`,
        [uslugaId, rowsTech[0].id],
      );
    }

    await db.query(
      `INSERT IGNORE INTO ROZMIAR_USLUGI (
        usluga_id,
        rozmiar_mb,
        data_i_czas
      )
      VALUES (?, ?, NOW())`,
      [uslugaId, strona.rozmiar_bajty / 1024 / 1024],
    );

    console.log(`Dodano pomiar dla ${strona.domena}`);
    const result = await ping.promise.probe(strona.domena);
    let status;
    let blad = null;
    let pingMs = null;
    if (result.alive) {
      status = "online";
      pingMs = Number(result.time);
    } else {
      status = "offline";
      blad = result.output; // Zapisz komunikat błędu
    }
    console.log(result);
    await db.query(
      `INSERT IGNORE INTO HISTORIA_STATUSU (
        usluga_id,
        data_i_czas,
        status,
        ping_ms,
        blad
      )
      VALUES (?, NOW(), ?, ?,?)`,
      [uslugaId, status, pingMs, blad],
    );
  }
  const [check] = await db.query(
    "SELECT COUNT(*) AS cnt FROM USLUGI WHERE typ = 'www'",
  );
  console.log("ILE USŁUG WWW W BAZIE:", check[0].cnt);
  const [check1] = await db.query(`
  SELECT *
  FROM HISTORIA_STATUSU
  ORDER BY data_i_czas DESC
  LIMIT 10
`);

  console.log("Historia statusu: ", check1);
}
