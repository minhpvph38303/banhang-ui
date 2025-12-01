const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const SECRET_KEY = "mysecretkey123";
const checkAuth = require("./middlewares/checkAuth.js");
const checkRole = require("./middlewares/checkRole.js");
const requireAdmin = require("./middlewares/requireAdmin");
const session = require("express-session");

app.use(cors());
app.use(
  cors({
    origin: "http://localhost:5500", // URL front-end
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mysecretkey123",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 giờ
  })
);

const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "banhang",
  waitForConnections: true,
  connectionLimit: 10,
});

db.query("SELECT 1", (err) => {
  if (err) {
    console.log("MySQL connection failed:", err);
  } else {
    console.log("MySQL connected!");
  }
});

app.get("/", checkAuth, (req, res) => {
  db.query("SELECT * FROM customers", (err, data) => {
    res.render("index", { customers: data, role: req.session.user.role });
  });
});

app.get("/add", checkAuth, checkRole("admin"), (req, res) => {
  res.render("add");
});

app.post("/add", checkAuth, checkRole("admin"), (req, res) => {
  const { name, sdt, diachi } = req.body;
  db.query(
    "INSERT INTO customers (name,sdt,diachi) VALUES (?,?,?)",
    [name, sdt, diachi],
    () => res.json({ status: "success", message: "Thêm thành công!" })
  );
});

app.get("/edit/:id", checkAuth, checkRole("admin"), (req, res) => {
  db.query(
    "SELECT * FROM customers WHERE id = ?",
    [req.params.id],
    (err, rs) => {
      res.render("edit", { cat: rs[0] });
    }
  );
});

app.post("/edit/:id", checkAuth, checkRole("admin"), (req, res) => {
  const { name, sdt, diachi } = req.body;
  db.query(
    "UPDATE customers SET name=?, sdt=?, diachi=? WHERE id=?",
    [name, sdt, diachi, req.params.id],
    () => res.redirect("/")
  );
});

app.get("/delete/:id", (req, res) => {
  try {
    db.query("DELETE FROM customers WHERE id=?", [req.params.id], () =>
      res.redirect("/")
    );
  } catch (error) {
    console.log(error);
  }
});
app.get("/register", (req, res) => {
  res.render("auth/register");
});

app.post("/register", (req, res) => {
  const { name, email, sdt, password } = req.body;
  if (!/^0\d{9}$/.test(sdt)) {
    return res.status(400).json({
      status: "fail",
      message: "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0",
    });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err)
      return res.status(500).json({ status: "fail", message: "Lỗi server" });

    if (result.length > 0) {
      return res.json({ status: "fail", message: "Tài khoản đã tồn tại" });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error("Bcrypt hash error:", err);
        return res
          .status(500)
          .json({ status: "fail", message: "Lỗi mã hoá mật khẩu" });
      }

      db.query(
        "INSERT INTO users (name, email, sdt, password,role) VALUES (?, ?, ?,?,?)",
        [name, email, sdt, hash, "viewer"],
        (err, result) => {
          if (err) {
            console.error("DB Insert error:", err);
            return res.status(500).json({
              status: "fail",
              message: "Lỗi server: không thể tạo tài khoản",
            });
          }

          return res.json({
            status: "success",
            message: "Đăng ký thành công!",
          });
        }
      );
    });
  });
});

app.get("/login", (req, res) => {
  res.render("auth/login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [username],
    async (err, result) => {
      if (err) return res.json({ status: "fail", message: "Lỗi server" });
      if (result.length === 0)
        return res.json({ status: "fail", message: "Sai tài khoản" });

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.json({ status: "fail", message: "Sai mật khẩu" });

      // Tạo token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        token: token,
      };

      return res.json({
        status: "success",
        message: "Đăng nhập thành công",
        role: user.role,
        token: token,
      });
    }
  );
});

app.post("/customers/:id/invoices", (req, res) => {
  const customerId = req.params.id;
  const { price, createdAt } = req.body;

  if (price == null) {
    return res.status(400).json({ status: "fail", message: "Thiếu số tiền" });
  }

  if (price < 0) {
    return res
      .status(400)
      .json({ status: "fail", message: "số tiền không được âm" });
  }

  db.query(
    "INSERT INTO invoice (price,createdAt,customerId ) VALUES (?,?,?)",
    [price, createdAt, customerId],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ status: "fail", message: err.message || "Lỗi server" });
      }

      return res.json({
        status: "success",
        message: "Tạo hóa đơn thành công!",
        invoice: {
          invoiceId: result.insertId,
          price,
          createdAt,
          customerId,
        },
      });
    }
  );
});

// Lấy danh sách hóa đơn của 1 customer
app.get("/customers/:id/invoices", async (req, res) => {
  const customerId = req.params.id;

  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM invoice WHERE customerId = ? ORDER BY createdAt DESC",
        [customerId]
      );

    res.render("invoice/index", {
      customerId,
      invoices: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("<h2>Lỗi server khi lấy danh sách hóa đơn!</h2>");
  }
});

app.get("/customers/:id/invoices/add", (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) return res.status(400).send("CustomerId không hợp lệ");
  res.render("invoice/add", { customerId });
});

app.listen(3000, () => console.log("Server running: http://localhost:3000"));
