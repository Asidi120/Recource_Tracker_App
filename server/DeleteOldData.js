export async function DeleteOldData(db) {

    // 1. Czyszczenie zużycia zasobów
    await db.query(`
        DELETE z
        FROM ZUZYCIE_ZASOBOW z
        JOIN (
            SELECT hosting_id,
                   DATE_SUB(MAX(data_i_czas), INTERVAL 7 DAY) AS granica
            FROM ZUZYCIE_ZASOBOW
            GROUP BY hosting_id
        ) x ON z.hosting_id = x.hosting_id
        WHERE z.data_i_czas < x.granica
    `);

    // 2. Czyszczenie historii rozmiaru usług
    await db.query(`
        DELETE r
        FROM ROZMIAR_USLUGI r
        JOIN USLUGI u 
            ON r.usluga_id = u.id
        JOIN (
            SELECT u2.hosting_id,
                   DATE_SUB(MAX(r2.data_i_czas), INTERVAL 7 DAY) AS granica
            FROM ROZMIAR_USLUGI r2
            JOIN USLUGI u2 
                ON r2.usluga_id = u2.id
            GROUP BY u2.hosting_id
        ) x 
            ON u.hosting_id = x.hosting_id
        WHERE r.data_i_czas < x.granica
    `);

    // 3. Czyszczenie historii statusów
    await db.query(`
        DELETE h
        FROM HISTORIA_STATUSU h
        JOIN USLUGI u 
            ON h.usluga_id = u.id
        JOIN (
            SELECT u2.hosting_id,
                   DATE_SUB(MAX(h2.data_i_czas), INTERVAL 7 DAY) AS granica
            FROM HISTORIA_STATUSU h2
            JOIN USLUGI u2
                ON h2.usluga_id = u2.id
            GROUP BY u2.hosting_id
        ) x
            ON u.hosting_id = x.hosting_id
        WHERE h.data_i_czas < x.granica
    `);

    // 4. Czyszczenie historii rozmiaru baz danych
    await db.query(`
        DELETE FROM ROZMIAR_BAZA_DANYCH
        WHERE data_i_czas < (
            SELECT granica FROM (
                SELECT DATE_SUB(MAX(data_i_czas), INTERVAL 7 DAY) AS granica
                FROM ROZMIAR_BAZA_DANYCH
            ) tmp
        )
    `);

    // 5. Czyszczenie zamkniętych alarmów starszych niż 18 miesięcy
    await db.query(`
        DELETE FROM ALARMY
        WHERE data_zamkniecia IS NOT NULL
        AND data_zamkniecia < (
            SELECT granica FROM (
                SELECT DATE_SUB(MAX(data_utworzenia), INTERVAL 7 DAY) AS granica
                FROM ALARMY
            ) tmp
        )
    `);
}