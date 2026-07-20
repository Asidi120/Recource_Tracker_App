import express from "express";
import cors from "cors";
import { DbConnection } from "./DbConnection.js";
import { InsertHostInfo } from "./InsertHostInfo.js"; 
import { InsertBasicInfo } from "./InsertBasicInfo.js";
import { InsertMailInfo } from "./InsertMailInfo.js";
import { InsertDataBaseInfo } from "./InsertDataBaseInfo.js";
import { InsertStatusInfo } from "./InsertStatusInfo.js";
import { CheckHostingID } from "./CheckHostingID.js"; 
import { StartApi } from "./ApiSender.js";
import { InsertDBSize} from "./GetDBSize.js";


const app = express();
app.use(cors());
app.use(express.json());

StartApi(app);

const PORT = process.env.PORT;
const TAJNY_TOKEN = process.env.API_KEY;

const checkAuth = (req, res, next) => {
  if (req.headers["x-api-key"] !== TAJNY_TOKEN) {
    return res.status(401).json({ error: "Brak autoryzacji" });
  }
  next();
};

console.log("- Uruchamianie Serwera API odbiorczego -");

// 1. ENDPOINT: Zużycie zasobów (zuzycie_zasobow.json)
app.post("/api/zasoby/post", checkAuth, async (req, res) => {
  const { nick, panel, dane } = req.body;
  let db;
  try {
    db = await DbConnection();
    const hostingId = await CheckHostingID(db, nick, panel);
    await InsertBasicInfo(db, hostingId, dane,panel,nick); 
    res.status(200).json({ success: true, message: "Zasoby zapisane" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (db) await db.end();
  }
});

// 2. ENDPOINT: Poczta e-mail (rozmiar_maili.json)
app.post("/api/poczta/post", checkAuth, async (req, res) => { 
  const { nick, panel, dane } = req.body;
  let db;
  try {
    db = await DbConnection();
    const hostingId = await CheckHostingID(db, nick, panel);
    await InsertMailInfo(db, hostingId, dane);
    res.status(200).json({ success: true, message: "Poczta zapisana" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (db) await db.end();
  }
});

// 3. ENDPOINT: Bazy danych (bazy_danych.json)
app.post("/api/bazy/post", checkAuth, async (req, res) => {
  const { nick, panel, dane } = req.body;
  let db;
  try {
    db = await DbConnection();
    const hostingId = await CheckHostingID(db, nick, panel);
    await InsertDataBaseInfo(db, hostingId, dane);
    res.status(200).json({ success: true, message: "Bazy danych zapisane" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (db) await db.end();
  }
});

// 4. ENDPOINT: Status serwera (status.json)
app.post("/api/status/post", checkAuth, async (req, res) => {
  const { nick, panel, dane } = req.body;
  let db;
  try {
    db = await DbConnection();
    const hostingId = await CheckHostingID(db, nick, panel);
    await InsertStatusInfo(db, hostingId, dane);
    const info = await InsertDBSize(db);
    res.status(200).json({ success: true, message: "Status zapisany" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (db) await db.end();
  }
});



app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serwer API działa lokalnie na porcie ${PORT}`);
});