import mysql from "mysql2/promise";

// MYSQL CONNECTION

export async function DbConnection() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      dateStrings: true
    });

    console.log("DB connected");

    return db;
  } catch (error) {
    console.error("DB connection error:", error);
    throw error;
  }
}
