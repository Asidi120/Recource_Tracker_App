export async function CheckHostingID(db, nick,serwer) {
  console.log('START CheckHostingID')
  const [rows] = await db.query(
    "SELECT id FROM KONTO_HOSTINGOWE WHERE login = ? and serwer_nazwa = ?",
    [nick,serwer]
  );

  if (rows.length > 0) {

    return rows[0].id;
  } else {
    
    const [result] = await db.execute(
      "INSERT INTO KONTO_HOSTINGOWE (login, serwer_nazwa) VALUES (?,?)", 
      [nick,serwer]
    );
    console.log(`Dodano nowe konto hostingowe do bazy: ${nick} (ID: ${result.insertId}, Serwer: ${serwer})`);
    return result.insertId; 
  }
}
