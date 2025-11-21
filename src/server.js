const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const app = express();

const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "banhang",
});

db.connect((err) => {
  if (err) console.log(err);
  console.log("MySQL connected!");
});

app.get("/", (req, res) => {
  db.query("SELECT * FROM customers", (err, data) => {
    res.render("index", { customers: data });
  });
});

app.get("/add", (req, res) => {
  res.render("add");
});

app.post("/add", (req, res) => {
  const { name, sdt, diachi } = req.body;
  db.query(
    "INSERT INTO customers (name,sdt,diachi) VALUES (?,?,?)",
    [name, sdt, diachi],
    () => res.redirect("/")
  );
});

app.get("/edit/:id", (req, res) => {
  db.query(
    "SELECT * FROM customers WHERE id = ?",
    [req.params.id],
    (err, rs) => {
      res.render("edit", { cat: rs[0] });
    }
  );
});

app.post("/edit/:id", (req, res) => {
  const { name, sdt, diachi } = req.body;
  db.query(
    "UPDATE customers SET name=?, sdt=?, diachi=? WHERE id=?",
    [name, sdt, diachi, req.params.id],
    () => res.redirect("/")
  );
});

app.get("/delete/:id", (req, res) => {
  db.query("DELETE FROM customers WHERE id=?", [req.params.id], () =>
    res.redirect("/")
  );
});

app.listen(3000, () => console.log("Server running: http://localhost:3000/"));
