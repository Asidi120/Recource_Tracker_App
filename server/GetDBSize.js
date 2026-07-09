export async function GetDatabaseSize(db) {
  const result = await db.query(`
    SELECT
      pg_database_size(current_database()) AS bytes,
      pg_size_pretty(pg_database_size(current_database())) AS pretty;
  `);

  return {
    bytes: Number(result.rows[0].bytes),
    pretty: result.rows[0].pretty
  };
}