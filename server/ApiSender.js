import express from "express";
import cors from "cors";
import { DbConnection } from "./DbConnection.js";
import { predictUntilEndOfYear, calculateAverageGrowth30Days, predictFullDate } from "./SizePrediction.js";
import { fillMissingData, fillMissingResourceData } from "./FillMissingData.js";
import { getHostingLimits } from "./HostingLimits.js";

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
        JOIN ZUZYCIE_ZASOBOW z
          ON z.hosting_id = k.id
        JOIN (
          SELECT hosting_id, MAX(data_i_czas) AS max_data
          FROM ZUZYCIE_ZASOBOW
          GROUP BY hosting_id
        ) latest
          ON z.hosting_id = latest.hosting_id
          AND z.data_i_czas = latest.max_data;
    `);
      // const history = rows;
      // const averageGrowth30Days = calculateAverageGrowth30Days(history);
      // let predictedFullDate = null;
      // if (history[0].typ === 'serwer') {
      //   predictedFullDate = predictFullDate(history[0].data_i_czas, Number(history[0].rozmiar_mb), limitMap[history[0].hosting_id], averageGrowth30Days);
      // }
      // res.json({
      //     historia: historyWithMissing,
      //     predykcja: prediction,
      //     srednie_wzrost: averageGrowth30Days,
      //     przewidziana_data_pelna: predictedFullDate
      // });
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
        GROUP_CONCAT(DISTINCT jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie,
        hs.data_i_czas,
        hs.status,
        hs.ping_ms,
        hs.blad
    FROM HISTORIA_STATUSU hs
    JOIN (
        SELECT
            usluga_id,
            MAX(data_i_czas) AS max_data
        FROM HISTORIA_STATUSU
        GROUP BY usluga_id
    ) latest
    ON hs.usluga_id = latest.usluga_id
    AND hs.data_i_czas = latest.max_data
    JOIN USLUGI u
        ON hs.usluga_id = u.id
    JOIN KONTO_HOSTINGOWE kh
        ON u.hosting_id = kh.id
    LEFT JOIN USLUGI_TECHNOLOGIE ut
    ON ut.usluga_id = u.id
    LEFT JOIN TECHNOLOGIE jp
    ON jp.id = ut.technologia_id
    WHERE u.typ = 'www'
    GROUP BY
      hs.id,
      u.id,
      kh.id
    ORDER BY kh.login, u.nazwa;
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
        ru.data_i_czas DESC;
      `);
      const history=rows;
      const historyWithMissing = fillMissingData(history);
      const grouped = {};
      for (const row of historyWithMissing) {
        if (!grouped[row.usluga_id]) grouped[row.usluga_id] = [];
        grouped[row.usluga_id].push(row);
      }

      const result = Object.values(grouped)
        .flatMap(rows => rows.slice(0, 200));

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
          GROUP_CONCAT(DISTINCT jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie,
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
          ) r2 ON r1.usluga_id = r2.usluga_id AND r1.data_i_czas = r2.max_data
      ) aktualny ON aktualny.usluga_id = u.id
      LEFT JOIN (
          SELECT *
          FROM (
              SELECT
                  ru.*,
                  ROW_NUMBER() OVER (PARTITION BY ru.usluga_id ORDER BY ru.data_i_czas DESC) AS rn
              FROM ROZMIAR_USLUGI ru
          ) x
          WHERE rn <= 200
      ) ru ON ru.usluga_id = u.id
      WHERE u.id = ?
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
      
const history = rows //tu zmienialam jak cos 
const averageGrowth30Days = calculateAverageGrowth30Days(history,"zuzycie_dysku_mb");
const prediction = predictUntilEndOfYear(history,"zuzycie_dysku_mb","zuzycie_dysku_prognoza");

//const historyWithMissing = fillMissingResourceData(history);
const historyWithMissing = history;
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
          u.nazwa,
          u.typ,
          kh.login,
          hs.blad,
          GROUP_CONCAT(DISTINCT jp.nazwa ORDER BY jp.nazwa SEPARATOR ', ') AS technologie
      FROM HISTORIA_STATUSU hs
      JOIN USLUGI u ON u.id = hs.usluga_id
      JOIN KONTO_HOSTINGOWE kh ON u.hosting_id = kh.id
      LEFT JOIN USLUGI_TECHNOLOGIE ut
ON ut.usluga_id = u.id

LEFT JOIN TECHNOLOGIE jp
ON jp.id = ut.technologia_id
      WHERE u.hosting_id = ? AND hs.usluga_id = ?
      GROUP BY
    hs.id,
    hs.usluga_id,
    hs.data_i_czas,
    hs.status,
    hs.ping_ms,
    u.nazwa,
    u.typ,
    kh.login,
    hs.blad;
    `,
        [req.params.hosting_id, req.params.usluga_id],
      );
      res.json(rows);
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
}
