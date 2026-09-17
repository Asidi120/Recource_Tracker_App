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
            SELECT hosting_id, MAX(data_i_czas) AS max_data
            FROM ZUZYCIE_ZASOBOW
            GROUP BY hosting_id
        ) z_max ON z_max.hosting_id = k.id
        
        JOIN ZUZYCIE_ZASOBOW z 
            ON z.hosting_id = z_max.hosting_id 
            AND z.data_i_czas = z_max.max_data
            
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
        FROM USLUGI u
        JOIN KONTO_HOSTINGOWE kh 
            ON kh.id = u.hosting_id

        JOIN (
            SELECT usluga_id, MAX(data_i_czas) AS max_data
            FROM HISTORIA_STATUSU
            GROUP BY usluga_id
        ) hs_max 
            ON hs_max.usluga_id = u.id

        JOIN HISTORIA_STATUSU hs 
            ON hs.usluga_id = hs_max.usluga_id 
            AND hs.data_i_czas = hs_max.max_data

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

        WHERE u.typ = 'www'

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

    const [uslugi] = await db.query(`
      SELECT kh.id AS hosting_id, kh.login, u.id AS usluga_id, u.nazwa, u.typ
      FROM KONTO_HOSTINGOWE kh
      JOIN USLUGI u ON u.hosting_id = kh.id;
    `);
    const [techs] = await db.query(`
      SELECT ut.usluga_id, GROUP_CONCAT(jp.nazwa SEPARATOR ', ') AS technologie
      FROM USLUGI_TECHNOLOGIE ut
      JOIN TECHNOLOGIE jp ON jp.id = ut.technologia_id
      GROUP BY ut.usluga_id;
    `);

    const [limity] = await db.query(`
      SELECT z.hosting_id, z.limit_dysku_mb
      FROM ZUZYCIE_ZASOBOW z
      JOIN (
        SELECT hosting_id, MAX(data_i_czas) AS max_data
        FROM ZUZYCIE_ZASOBOW
        GROUP BY hosting_id
      ) z_max ON z.hosting_id = z_max.hosting_id AND z.data_i_czas = z_max.max_data;
    `);

    const [historia] = await db.query(`
      SELECT usluga_id, data_i_czas, rozmiar_mb
      FROM ROZMIAR_USLUGI
      WHERE data_i_czas >= DATE_SUB(NOW(), INTERVAL 3 HOUR)
      ORDER BY usluga_id, data_i_czas DESC;
    `);

    const techsMap = {};
    for (const t of techs) {
      techsMap[t.usluga_id] = t.technologie;
    }

    const limityMap = {};
    for (const l of limity) {
      limityMap[l.hosting_id] = l.limit_dysku_mb;
    }

    const metadataMap = {};
    for (const u of uslugi) {
      metadataMap[u.usluga_id] = {
        hosting_id: u.hosting_id,
        login: u.login,
        usluga_id: u.usluga_id,
        nazwa: u.nazwa,
        typ: u.typ,
        technologie: techsMap[u.usluga_id] || null,
        limit_dysku_mb: limityMap[u.hosting_id] || null
      };
    }

    const grouped = {};
    for (const wpis of historia) {
      if (!grouped[wpis.usluga_id]) {
        grouped[wpis.usluga_id] = [];
      }
      
      const meta = metadataMap[wpis.usluga_id];
      if (meta) {
        grouped[wpis.usluga_id].push({
          hosting_id: meta.hosting_id,
          login: meta.login,
          usluga_id: wpis.usluga_id,
          nazwa: meta.nazwa,
          typ: meta.typ,
          technologie: meta.technologie,
          limit_dysku_mb: meta.limit_dysku_mb,
          data_i_czas: wpis.data_i_czas,
          rozmiar_mb: wpis.rozmiar_mb
        });
      }
    }

    let result = [];
    for (const usluga_id in grouped) {
      const filled = fillMissingData(grouped[usluga_id]);
      result.push(...filled.slice(0, 200)); 
    }
    
    res.json(result);
  } catch (err) {
    console.error("Database query failed:", err);
    res.status(500).json({ error: "Błąd serwera" });
  } finally {
    if (db) await db.end();
  }
});

  app.get("/api/historia_uslug/:id", async (req, res) => {
    let db;

    try {
      db = await DbConnection();
      const id = req.params.id;

      const [metadataRows] = await db.query(`
        SELECT
            kh.id AS hosting_id,
            kh.login,
            u.id AS usluga_id,
            u.nazwa,
            u.typ,
            (
                SELECT GROUP_CONCAT(jp.nazwa SEPARATOR ', ')
                FROM USLUGI_TECHNOLOGIE ut
                JOIN TECHNOLOGIE jp ON jp.id = ut.technologia_id
                WHERE ut.usluga_id = u.id
            ) AS technologie,
            (
                SELECT rozmiar_mb 
                FROM ROZMIAR_USLUGI 
                WHERE usluga_id = u.id 
                ORDER BY data_i_czas DESC LIMIT 1
            ) AS aktualny_rozmiar_mb,
            (
                SELECT limit_dysku_mb 
                FROM ZUZYCIE_ZASOBOW 
                WHERE hosting_id = kh.id 
                ORDER BY data_i_czas DESC LIMIT 1
            ) AS limit_dysku_mb
        FROM USLUGI u
        JOIN KONTO_HOSTINGOWE kh ON kh.id = u.hosting_id
        WHERE u.id = ?;
      `, [id]);

      if (metadataRows.length === 0) {
        return res.status(404).json({ error: "Nie znaleziono usługi" });
      }

      const meta = metadataRows[0];

      const [historyRows] = await db.query(`
        SELECT data_i_czas, rozmiar_mb
        FROM ROZMIAR_USLUGI
        WHERE usluga_id = ?
          AND (
            (data_i_czas >= NOW() - INTERVAL 1 DAY) OR
            (data_i_czas >= NOW() - INTERVAL 7 DAY AND data_i_czas < NOW() - INTERVAL 1 DAY AND MINUTE(data_i_czas) % 10 = 0) OR
            (data_i_czas >= NOW() - INTERVAL 30 DAY AND data_i_czas < NOW() - INTERVAL 7 DAY AND MINUTE(data_i_czas) = 0) OR
            (data_i_czas >= NOW() - INTERVAL 1 YEAR AND data_i_czas < NOW() - INTERVAL 30 DAY AND HOUR(data_i_czas) IN (0,12) AND MINUTE(data_i_czas) = 0) OR
            (data_i_czas < NOW() - INTERVAL 1 YEAR AND HOUR(data_i_czas) = 0 AND MINUTE(data_i_czas) = 0 AND MOD(DAYOFYEAR(data_i_czas),2)=0)
          )
        ORDER BY data_i_czas DESC;
      `, [id]);

      const history = historyRows.map(row => ({
        hosting_id: meta.hosting_id,
        login: meta.login,
        usluga_id: meta.usluga_id,
        nazwa: meta.nazwa,
        typ: meta.typ,
        technologie: meta.technologie,
        aktualny_rozmiar_mb: meta.aktualny_rozmiar_mb,
        limit_dysku_mb: meta.limit_dysku_mb,
        data_i_czas: row.data_i_czas,
        rozmiar_mb: row.rozmiar_mb
      }));

      let averageGrowth30Days = 0;
      if (history.length > 0) {
         averageGrowth30Days = calculateAverageGrowth30Days(history);
      }
      
      const limitMap = await getHostingLimits();
      let predictedFullDate = null;
      
      if (history.length > 0 && history[0].typ === 'serwer') {
        predictedFullDate = predictFullDate(
            history[0].data_i_czas, 
            Number(history[0].rozmiar_mb), 
            limitMap[history[0].hosting_id], 
            averageGrowth30Days
        );
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
      const id = req.params.id;
      console.time(`API /api/historia_zasobow/${id}`);
      db = await DbConnection();
      
      const [rows] = await db.query(
        `
        SELECT data_i_czas, zuzycie_cpu_procent, zuzycie_ramu_mb, zuzycie_dysku_mb, zuzycie_procesow, limit_dysku_mb
        FROM ZUZYCIE_ZASOBOW
        WHERE hosting_id = ? AND data_i_czas >= NOW() - INTERVAL 1 DAY

        UNION ALL

        SELECT data_i_czas, zuzycie_cpu_procent, zuzycie_ramu_mb, zuzycie_dysku_mb, zuzycie_procesow, limit_dysku_mb
        FROM ZUZYCIE_ZASOBOW
        WHERE hosting_id = ? 
          AND data_i_czas >= NOW() - INTERVAL 7 DAY 
          AND data_i_czas < NOW() - INTERVAL 1 DAY 
          AND MINUTE(data_i_czas) % 10 = 0

        UNION ALL

        SELECT data_i_czas, zuzycie_cpu_procent, zuzycie_ramu_mb, zuzycie_dysku_mb, zuzycie_procesow, limit_dysku_mb
        FROM ZUZYCIE_ZASOBOW
        WHERE hosting_id = ? 
          AND data_i_czas >= NOW() - INTERVAL 30 DAY 
          AND data_i_czas < NOW() - INTERVAL 7 DAY 
          AND MINUTE(data_i_czas) = 0

        UNION ALL

        SELECT data_i_czas, zuzycie_cpu_procent, zuzycie_ramu_mb, zuzycie_dysku_mb, zuzycie_procesow, limit_dysku_mb
        FROM ZUZYCIE_ZASOBOW
        WHERE hosting_id = ? 
          AND data_i_czas >= NOW() - INTERVAL 1 YEAR 
          AND data_i_czas < NOW() - INTERVAL 30 DAY 
          AND HOUR(data_i_czas) IN (0, 12) 
          AND MINUTE(data_i_czas) = 0

        UNION ALL

        SELECT data_i_czas, zuzycie_cpu_procent, zuzycie_ramu_mb, zuzycie_dysku_mb, zuzycie_procesow, limit_dysku_mb
        FROM ZUZYCIE_ZASOBOW
        WHERE hosting_id = ? 
          AND data_i_czas < NOW() - INTERVAL 1 YEAR 
          AND HOUR(data_i_czas) = 0 
          AND MINUTE(data_i_czas) = 0 
          AND MOD(DAYOFYEAR(data_i_czas), 2) = 0
          
        ORDER BY data_i_czas DESC;
        `,
        [id, id, id, id, id]
      );

      console.timeEnd(`API /api/historia_zasobow/${id}`);
      res.json(rows);
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
      //console.log(req.params);

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
      //console.log(
      //  "Pobrano historię statusów dla hosting_id:",
      //  req.params.hosting_id,
      //);
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
