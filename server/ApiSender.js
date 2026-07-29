import express from "express";
import cors from "cors";
import { DbConnection } from "./DbConnection.js";
import { predictUntilEndOfYear, calculateAverageGrowth30Days, predictFullDate } from "./SizePrediction.js";
import { fillMissingData, fillMissingResourceData, fillMissingStatusData } from "./FillMissingData.js";
import { getHostingLimits } from "./HostingLimits.js";
import { InsertDBSize,DBLimitPrediction } from "./GetDBSize.js";

export function StartApi(app) {
  app.use(cors());
  app.use(express.json());
  app.get("/api/zasoby", async (req, res) => {
    let db;
    try {
      db = await DbConnection();

      const [rows] = await db.query(`
        SELECT
            k.id AS hosting_id,
            k.login,
            z.data_i_czas,
            z.zuzycie_cpu_procent,
            z.zuzycie_ramu_mb,
            z.limit_ramu_mb,
            z.zuzycie_ramu_procent,
            z.zuzycie_dysku_mb,
            z.limit_dysku_mb,
            z.zuzycie_dysku_procent,
            z.zuzycie_procesow,
            z.limit_procesow
        FROM KONTO_HOSTINGOWE k
        JOIN (
            SELECT
                hosting_id,
                data_i_czas,
                zuzycie_cpu_procent,
                zuzycie_ramu_mb,
                limit_ramu_mb,
                zuzycie_ramu_procent,
                zuzycie_dysku_mb,
                limit_dysku_mb,
                zuzycie_dysku_procent,
                zuzycie_procesow,
                limit_procesow
            FROM (
                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY hosting_id
                        ORDER BY data_i_czas DESC
                    ) AS rn
                FROM ZUZYCIE_ZASOBOW
            ) t
            WHERE rn = 1
        ) z
        ON z.hosting_id = k.id
        ORDER BY k.login;
    `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });

  app.get("/api/strony", async (req, res) => {
    let db;

    try {
      db = await DbConnection();
      const [rows] = await db.query(`
        SELECT
            hs.id,
            u.nazwa,
            u.id AS usluga_id,
            kh.id AS hosting_id,
            kh.login,
            tech.technologie,
            hs.data_i_czas,
            hs.status,
            hs.ping_ms,
            hs.blad
        FROM
        (
            SELECT *
            FROM
            (
                SELECT
                    *,
                    ROW_NUMBER() OVER(
                        PARTITION BY usluga_id
                        ORDER BY data_i_czas DESC
                    ) rn
                FROM HISTORIA_STATUSU
            ) t
            WHERE rn = 1
        ) hs

        JOIN USLUGI u
        ON u.id = hs.usluga_id

        JOIN KONTO_HOSTINGOWE kh
        ON kh.id = u.hosting_id

        LEFT JOIN
        (
            SELECT
                ut.usluga_id,
                GROUP_CONCAT(jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie
            FROM USLUGI_TECHNOLOGIE ut
            JOIN TECHNOLOGIE jp
                ON jp.id = ut.technologia_id
            GROUP BY ut.usluga_id
        ) tech
        ON tech.usluga_id = u.id

        WHERE u.typ='www'

        ORDER BY
            kh.login,
            u.nazwa;
    `);

      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });

  app.get("/api/historia_uslug", async (req, res) => {
    let db;
    try {
      db = await DbConnection();
      const [rows] = await db.query(`
    SELECT
        kh.id AS hosting_id,
        kh.login,
        u.id AS usluga_id,
        u.nazwa,
        u.typ,
        GROUP_CONCAT(DISTINCT jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie,
        aktualny.rozmiar_mb AS rozmiar_mb,
        ru.data_i_czas,
        ru.rozmiar_mb,
        z.limit_dysku_mb

    FROM KONTO_HOSTINGOWE kh

    JOIN USLUGI u
        ON u.hosting_id = kh.id
    LEFT JOIN (
    SELECT z1.hosting_id, z1.limit_dysku_mb
    FROM ZUZYCIE_ZASOBOW z1
    JOIN (
        SELECT hosting_id, MAX(data_i_czas) AS max_data
        FROM ZUZYCIE_ZASOBOW
        GROUP BY hosting_id
    ) z2
    ON z1.hosting_id = z2.hosting_id
    AND z1.data_i_czas = z2.max_data
) z
ON z.hosting_id = kh.id

    LEFT JOIN USLUGI_TECHNOLOGIE ut
ON ut.usluga_id = u.id

LEFT JOIN TECHNOLOGIE jp
ON jp.id = ut.technologia_id

    LEFT JOIN (
        SELECT r1.usluga_id, r1.rozmiar_mb
        FROM ROZMIAR_USLUGI r1
        JOIN (
            SELECT usluga_id, MAX(data_i_czas) AS max_data
            FROM ROZMIAR_USLUGI
            GROUP BY usluga_id
        ) r2
        ON r1.usluga_id = r2.usluga_id
        AND r1.data_i_czas = r2.max_data
    ) aktualny
        ON aktualny.usluga_id = u.id

    LEFT JOIN (
        SELECT *
        FROM (
            SELECT
                ru.*,
                ROW_NUMBER() OVER (
                    PARTITION BY ru.usluga_id
                    ORDER BY ru.data_i_czas DESC
                ) AS rn
            FROM ROZMIAR_USLUGI ru
        ) x
        WHERE rn <= 200
    ) ru
        ON ru.usluga_id = u.id
    GROUP BY
    kh.id,
    kh.login,
    u.id,
    u.nazwa,
    u.typ,
    aktualny.rozmiar_mb,
    ru.data_i_czas,
    ru.rozmiar_mb
    ORDER BY
        kh.login,
        u.nazwa,
        ru.data_i_czas desc;
      `);
  const history = rows;
  const grouped = {};
  for (const row of history) {
    if (!grouped[row.usluga_id]) {
      grouped[row.usluga_id] = [];
    }

    grouped[row.usluga_id].push(row);
  }


  let result = [];

  for (const usluga_id in grouped) {
    const filled = fillMissingData(grouped[usluga_id]);

    result.push(...filled.slice(0,200));
  }

  res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });

  app.get("/api/historia_uslug/:id", async (req, res) => {
    let db;

    try {
      db = await DbConnection();
      const [rows] = await db.query(
        `
      SELECT
          kh.id AS hosting_id,
          kh.login,
          u.id AS usluga_id,
          u.nazwa,
          u.typ,
          tech.technologie,
          aktualny.rozmiar_mb AS aktualny_rozmiar_mb,
          ru.data_i_czas,
          ru.rozmiar_mb,
          z.limit_dysku_mb
      FROM KONTO_HOSTINGOWE kh
      JOIN USLUGI u ON u.hosting_id = kh.id
      LEFT JOIN (
    SELECT z1.hosting_id, z1.limit_dysku_mb
    FROM ZUZYCIE_ZASOBOW z1
    JOIN (
        SELECT hosting_id, MAX(data_i_czas) AS max_data
        FROM ZUZYCIE_ZASOBOW
        GROUP BY hosting_id
    ) z2
    ON z1.hosting_id = z2.hosting_id
    AND z1.data_i_czas = z2.max_data
) z
ON z.hosting_id = kh.id
      LEFT JOIN (
    SELECT
        ut.usluga_id,
        GROUP_CONCAT(jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie
    FROM USLUGI_TECHNOLOGIE ut
    JOIN TECHNOLOGIE jp
        ON jp.id = ut.technologia_id
    GROUP BY ut.usluga_id
) tech
ON tech.usluga_id = u.id
      LEFT JOIN (
          SELECT r1.usluga_id, r1.rozmiar_mb
          FROM ROZMIAR_USLUGI r1
          JOIN (
              SELECT usluga_id, MAX(data_i_czas) AS max_data
              FROM ROZMIAR_USLUGI
              GROUP BY usluga_id
          ) r2 ON r1.usluga_id = r2.usluga_id AND r1.data_i_czas = r2.max_data
      ) aktualny ON aktualny.usluga_id = u.id
      LEFT JOIN (
    SELECT *
    FROM (
        SELECT
            ru.*,
            ROW_NUMBER() OVER (
                PARTITION BY ru.usluga_id
                ORDER BY ru.data_i_czas DESC
            ) AS rn
        FROM ROZMIAR_USLUGI ru
        WHERE
            (
                ru.data_i_czas >= NOW() - INTERVAL 1 DAY
            )

            OR
            (
                ru.data_i_czas >= NOW() - INTERVAL 7 DAY
                AND ru.data_i_czas < NOW() - INTERVAL 1 DAY
                AND MINUTE(ru.data_i_czas) % 10 = 0
            )

            OR
            (
                ru.data_i_czas >= NOW() - INTERVAL 30 DAY
                AND ru.data_i_czas < NOW() - INTERVAL 7 DAY
                AND MINUTE(ru.data_i_czas) = 0
            )

            OR
            (
                ru.data_i_czas >= NOW() - INTERVAL 1 YEAR
                AND ru.data_i_czas < NOW() - INTERVAL 30 DAY
                AND HOUR(ru.data_i_czas) IN (0,12)
                AND MINUTE(ru.data_i_czas) = 0
            )

            OR
            (
                ru.data_i_czas < NOW() - INTERVAL 1 YEAR
                AND HOUR(ru.data_i_czas) = 0
                AND MINUTE(ru.data_i_czas) = 0
                AND MOD(DAYOFYEAR(ru.data_i_czas),2)=0
            )
    ) x
) ru
ON ru.usluga_id = u.id
      WHERE u.id = ?
GROUP BY
    kh.id,
    kh.login,
    u.id,
    u.nazwa,
    u.typ,
    tech.technologie,
    aktualny.rozmiar_mb,
    ru.data_i_czas,
    ru.rozmiar_mb,
    z.limit_dysku_mb
    ORDER BY
      ru.data_i_czas DESC;
    `,
        [req.params.id],
      );
      const history = rows;
      const averageGrowth30Days = calculateAverageGrowth30Days(history);
      const limitMap = await getHostingLimits();
      let predictedFullDate = null;
      if (history[0].typ === 'serwer') {
        predictedFullDate = predictFullDate(history[0].data_i_czas, Number(history[0].rozmiar_mb), limitMap[history[0].hosting_id], averageGrowth30Days);
      }
      const prediction = predictUntilEndOfYear(history);
      const historyWithMissing = fillMissingData(history);

      res.json({
          historia: historyWithMissing,
          predykcja: prediction,
          srednie_wzrost: averageGrowth30Days,
          przewidziana_data_pelna: predictedFullDate
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });
  app.get("/api/historia_zasobow/:id", async (req, res) => {
    let db;
    try {
      db = await DbConnection();
      const [rows] = await db.query(
        `
      SELECT
          z.data_i_czas,
          z.zuzycie_cpu_procent,
          z.zuzycie_ramu_mb,
          z.zuzycie_dysku_mb,
          z.zuzycie_procesow,
          z.limit_dysku_mb
      FROM ZUZYCIE_ZASOBOW z
      WHERE z.hosting_id = ?
    `,
        [req.params.id],
      );
      
const history = rows
const averageGrowth30Days = calculateAverageGrowth30Days(history,"zuzycie_dysku_mb");
const prediction = predictUntilEndOfYear(history,"zuzycie_dysku_mb","zuzycie_dysku_prognoza");

const historyWithMissing = fillMissingResourceData(history);
const limitMap = await getHostingLimits();

const predictedFullDate = predictFullDate(
  history[0].data_i_czas,
  Number(history[0].zuzycie_dysku_mb),
  limitMap[req.params.id],
  averageGrowth30Days
);

res.json({
  historia: historyWithMissing,
  predykcja: prediction,
  srednie_wzrost: averageGrowth30Days,
  przewidziana_data_pelna: predictedFullDate,
});

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });
  app.get("/api/historia_statusow/:hosting_id/:usluga_id", async (req, res) => {
    let db;
    try {
      db = await DbConnection();
      console.log(req.params);

      const [test] = await db.query(
        `
  SELECT
    u.id,
    u.hosting_id,
    u.nazwa
  FROM USLUGI u
  WHERE u.hosting_id = ?
  `,
        [req.params.hosting_id],
      );

      console.table(test);
      const [rows] = await db.query(
        `
      SELECT
    hs.usluga_id,
    hs.data_i_czas,
    hs.status,
    hs.ping_ms,
    hs.blad,
    u.nazwa,
    u.typ,
    kh.login,
    tech.technologie

FROM HISTORIA_STATUSU hs

JOIN USLUGI u
ON u.id = hs.usluga_id

JOIN KONTO_HOSTINGOWE kh
ON kh.id = u.hosting_id

LEFT JOIN (
    SELECT
        ut.usluga_id,
        GROUP_CONCAT(jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie
    FROM USLUGI_TECHNOLOGIE ut
    JOIN TECHNOLOGIE jp
        ON jp.id = ut.technologia_id
    GROUP BY ut.usluga_id
) tech
ON tech.usluga_id = u.id

WHERE
    u.hosting_id = ?
    AND hs.usluga_id = ?
    AND
    (
        hs.data_i_czas >= NOW() - INTERVAL 1 DAY

        OR

        (
            hs.data_i_czas >= NOW() - INTERVAL 7 DAY
            AND hs.data_i_czas < NOW() - INTERVAL 1 DAY
            AND MINUTE(hs.data_i_czas) % 10 = 0
        )

        OR

        (
            hs.data_i_czas >= NOW() - INTERVAL 30 DAY
            AND hs.data_i_czas < NOW() - INTERVAL 7 DAY
            AND MINUTE(hs.data_i_czas) = 0
        )

        OR

        (
            hs.data_i_czas >= NOW() - INTERVAL 1 YEAR
            AND hs.data_i_czas < NOW() - INTERVAL 30 DAY
            AND HOUR(hs.data_i_czas) IN (0,12)
            AND MINUTE(hs.data_i_czas) = 0
        )

        OR

        (
            hs.data_i_czas < NOW() - INTERVAL 1 YEAR
            AND HOUR(hs.data_i_czas) = 0
            AND MINUTE(hs.data_i_czas) = 0
            AND MOD(DAYOFYEAR(hs.data_i_czas),2)=0
        )
    )

ORDER BY hs.data_i_czas ASC;
    `,
        [req.params.hosting_id, req.params.usluga_id],
      );
      const historyWithMissing = fillMissingStatusData(rows.reverse());

      res.json(historyWithMissing);
      console.log(
        "Pobrano historię statusów dla hosting_id:",
        req.params.hosting_id,
      );
      console.log("Dane:", rows);
      console.log(req.params);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera" });
    } finally {
      if (db) await db.end();
    }
  });

app.get("/api/rozmiar_bazy", async (req,res)=>{
  let db;

  try {
    db = await DbConnection();

    const [rows] = await db.query(`
      SELECT 
        rozmiar_mb,
        data_i_czas
      FROM ROZMIAR_BAZA_DANYCH
      ORDER BY data_i_czas DESC
      LIMIT 1
    `);

    const prediction = await DBLimitPrediction(
      db,
      Number(process.env.MAX_DB_SIZE)
    );

    res.json({
      rozmiar_mb: rows[0].rozmiar_mb,
      data_i_czas: rows[0].data_i_czas,
      sredni_wzrost: prediction.averageGrowth,
      przewidywana_data: prediction.predictedDate
    });

  } catch(err){
    res.status(500).json({error:err.message});
  }
  finally{
    if(db) await db.end();
  }
});

}
