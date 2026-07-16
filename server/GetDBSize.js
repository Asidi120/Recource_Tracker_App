export async function GetDatabaseSize(db) {
  const [rows] = await db.query(`
    SELECT
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
    FROM information_schema.tables
    WHERE table_schema = DATABASE();
  `);

  return rows[0].size_mb;
}