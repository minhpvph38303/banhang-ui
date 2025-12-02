const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2");

// console.log("DB_HOST =", process.env.DB_HOST);
// console.log("DB_USER =", process.env.DB_USER);
// console.log("DB_NAME =", process.env.DB_NAME);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

// db.query("SELECT 1", (err) => {
//   if (err) console.error("MySQL connection failed:", err);
//   else console.log("MySQL connected!");
// });

module.exports = db;
