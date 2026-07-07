import mysql from "mysql2/promise";
//import ftp from "basic-ftp";

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

// FTPS CONNECTION

// export async function FTPconnect() {
//   const client = new ftp.Client();

//   client.ftp.verbose = true;

//   try {
//     console.log("Connecting to FTPS...");

//     await client.access({
//       host: process.env.FTP_HOST,
//       port: 21,
//       user: process.env.FTP_USER,
//       password: process.env.FTP_PASSWORD,

//       // FTPS
//       secure: true,
//     });

//     console.log("FTPS connected");

//     return client;
//   } catch (error) {
//     console.error("FTPS connection error:", error);
//     throw error;
//   }
// }