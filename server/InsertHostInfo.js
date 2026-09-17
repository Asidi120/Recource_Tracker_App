import fs from "fs/promises";

export async function InsertHostInfo(db,data) {
  console.log("START InsertHostInfo");

  const [rows] = await db.query(
    "SELECT id FROM KONTO_HOSTINGOWE WHERE login = ?",
    [data.login]
  );

  // istnieje
  if (rows.length > 0) {
    return rows[0].id;
  }

  // dodaj nowe
  const [result] = await db.query(
    "INSERT INTO KONTO_HOSTINGOWE (login) VALUES (?)",
    [data.login]
  );

  return result.insertId;
}