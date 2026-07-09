import fs from "fs/promises";

export async function InsertDataBaseInfo(db, hostingId,bazy) {
  console.log("START InsertDataBaseInfo");

  for (const baza of bazy) {

    const [rows] = await db.query(
      `SELECT id
       FROM USLUGI
       WHERE hosting_id = ?
         AND typ = 'baza_danych'
         AND nazwa = ?
         AND typ_bazy_danych = ?`,
      [
        hostingId,
        baza.nazwa,
        baza.rodzaj
      ]
    );

    let uslugaId;

    if (rows.length === 0) {

      const [result] = await db.query(
        `INSERT INTO USLUGI (
          hosting_id,
          nazwa,
          typ,
          typ_bazy_danych
        )
        VALUES (?, ?, 'baza_danych', ?)`,
        [
          hostingId,
          baza.nazwa,
          baza.rodzaj
        ]
      );
      uslugaId = result.insertId;

    } else {

      uslugaId = rows[0].id;

    }

    await db.query(
      `INSERT IGNORE INTO ROZMIAR_USLUGI (
        usluga_id,
        rozmiar_mb,
        data_i_czas
      )
      VALUES (?, ?, ?)`,
      [
        uslugaId,
        baza.rozmiar,
        baza.data
      ]
    );

    console.log(
      `Dodano pomiar dla ${baza.nazwa} (${baza.rodzaj})`
    );
  }
}