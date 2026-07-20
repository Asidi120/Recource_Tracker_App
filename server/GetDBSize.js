async function GetDatabaseSize(db) {
  const [rows] = await db.query(`
    SELECT
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
    FROM information_schema.tables
    WHERE table_schema = DATABASE();
  `);

  return rows[0].size_mb;
}

export async function InsertDBSize(db) {
  console.log("START InsertDBSize");

  const size = await GetDatabaseSize(db);

  await db.query(
    `INSERT INTO ROZMIAR_BAZA_DANYCH
      (rozmiar_mb, data_i_czas)
     VALUES (?, NOW())`,
    [size]
  );

  console.log(`Dodano rozmiar bazy: ${size} MB`);
  const results = await DBLimitPrediction(db, Number(process.env.MAX_DB_SIZE));
  console.log(results);
  return results;
}

async function CalculateAverageGrowthDB(db) {
  const [rows] = await db.query(`
    SELECT
      rozmiar_mb,
      data_i_czas
    FROM ROZMIAR_BAZA_DANYCH
    WHERE data_i_czas >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ORDER BY data_i_czas ASC
  `);

  if (rows.length < 2) return 0;

  const first = rows[0];
  const last = rows[rows.length - 1];

  const days =
    (new Date(last.data_i_czas) - new Date(first.data_i_czas)) /
    (1000 * 60 * 60 * 24);

  if (days <= 0) return 0;

  return (last.rozmiar_mb - first.rozmiar_mb) / days;
}

export async function DBLimitPrediction(db, maxSize) {
  const averageGrowth = await CalculateAverageGrowthDB(db);

  if (averageGrowth <= 0) {
    return {
      averageGrowth,
      predictedDate: null,
    };
  }

  const [rows] = await db.query(`
    SELECT
      rozmiar_mb,
      data_i_czas
    FROM ROZMIAR_BAZA_DANYCH
    ORDER BY data_i_czas DESC
    LIMIT 1
  `);

  if (!rows.length) {
    return {
      averageGrowth,
      predictedDate: null,
    };
  }

  const currentSize = Number(rows[0].rozmiar_mb);

  if (currentSize >= maxSize) {
    return {
      averageGrowth,
      predictedDate: new Date(rows[0].data_i_czas),
    };
  }

  const daysLeft = (maxSize - currentSize) / averageGrowth;

  const predictedDate = new Date(rows[0].data_i_czas);
  predictedDate.setDate(predictedDate.getDate() + Math.ceil(daysLeft));

  return {
    averageGrowth,
    predictedDate,
  };
}