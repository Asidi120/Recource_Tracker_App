export async function checkAlarm(db, hostingId, typ, condition, message) {
  const [rows] = await db.query(
    `SELECT id
     FROM ALARMY
     WHERE hosting_id = ?
       AND typ = ?
       AND aktywny = 1`,
    [hostingId, typ]
  );

  if (condition) {
    // alarm aktywny?
    if (rows.length === 0) {
      await sendGoogleChat(message);

      await db.query(
        `INSERT INTO ALARMY(hosting_id, typ, aktywny)
         VALUES (?, ?, 1)`,
        [hostingId, typ]
      );
    }
  } else {
    // jeżeli alarm był aktywny, zamknij go
    if (rows.length > 0) {
      await db.query(
        `UPDATE ALARMY
         SET aktywny = 0,
             data_zamkniecia = NOW()
         WHERE hosting_id = ?
           AND typ = ?
           AND aktywny = 1`,
        [hostingId, typ]
      );
    }
  }
}

export async function sendGoogleChat(message) {
    if (!process.env.GOOGLE_CHAT_WEBHOOK) return;

    try {
        await fetch(process.env.GOOGLE_CHAT_WEBHOOK, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: message,
            }),
        });
    } catch (err) {
        console.error("Błąd wysyłania do Google Chat:", err);
    }
}