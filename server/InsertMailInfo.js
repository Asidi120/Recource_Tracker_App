import fs from "fs/promises";

export async function InsertMailInfo(db, hostingId,maile) {
  console.log("START InsertMailInfo");
  for (const mail of maile) {

    const [rows] = await db.query(
      `SELECT id
       FROM USLUGI
       WHERE hosting_id = ?
         AND typ = 'mail'
         AND nazwa = ?`,
      [
        hostingId,
        mail.mail
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
        VALUES (?, ?, 'mail')`,
        [
          hostingId,
          mail.mail
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
        mail.rozmiar_bajty / 1024 / 1024,
        mail.data
      ]
    );

    console.log(
      `Dodano pomiar dla ${mail.mail}`
    );
  }
}