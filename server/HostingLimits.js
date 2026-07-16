import { DbConnection } from "./DbConnection.js";

export async function getHostingLimits() {
  let db;

  try {
    db = await DbConnection();

    const [rows] = await db.query(`
      SELECT
          kh.id AS hosting_id,
          zz.limit_dysku_mb
      FROM KONTO_HOSTINGOWE kh
      JOIN ZUZYCIE_ZASOBOW zz
          ON kh.id = zz.hosting_id
      WHERE zz.data_i_czas = (
          SELECT MAX(z2.data_i_czas)
          FROM ZUZYCIE_ZASOBOW z2
          WHERE z2.hosting_id = kh.id
      )
    `);

    const limits = {};

    rows.forEach(row => {
      limits[row.hosting_id] = Number(row.limit_dysku_mb);
    });

    return limits;

  } finally {
    if (db) await db.end();
  }
}