require("dotenv").config(); // <---- Tự load .env từ gốc project

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const session = require("express-session");

const checkAuth = require("./src/middlewares/checkAuth");
const checkRole = require("./src/middlewares/checkRole");

const app = express();

// Database
const db = require("./src/views/config/db");

// ===== Middlewares =====
app.use(cors({
    origin: "http://localhost:5500",
    credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 60 * 60 * 1000,
            secure: false,
            httpOnly: true,
        },
    })
);

// ===== View Engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));


// ===== Routes =====
app.get("/", checkAuth, async(req, res) => { // <--- Must be async
    try {
        const [data] = await db.promise().query("SELECT * FROM customers"); // <--- Promise
        res.render("index", { customers: data, role: req.session.user.role });
    } catch (err) {
        // Centralized error handling
        return res.status(500).send("DB error");
    }
});

app.get("/add", checkAuth, checkRole("admin"), (req, res) => {
    res.render("add");
});

app.post("/add", checkAuth, checkRole("admin"), (req, res) => {
    const { name, sdt, diachi } = req.body;

    if (!/^0\d{9}$/.test(sdt)) {
        return res.status(400).json({
            status: "error",
            message: "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số!",
        });
    }

    db.query(
        "INSERT INTO customers (name, sdt, diachi) VALUES (?,?,?)", [name, sdt, diachi],
        (err) => {
            if (err)
                return res
                    .status(500)
                    .json({ status: "error", message: "Server error" });
            res.json({ status: "success", message: "Thêm thành công!" });
        }
    );
});

app.get("/edit/:id", checkAuth, checkRole("admin"), (req, res) => {
    db.query(
        "SELECT * FROM customers WHERE id = ?", [req.params.id],
        (err, rs) => {
            if (err) return res.status(500).send("DB error");
            res.render("edit", { cat: rs[0] });
        }
    );
});

app.post("/edit/:id", checkAuth, checkRole("admin"), (req, res) => {
    const { name, sdt, diachi } = req.body;
    db.query(
        "UPDATE customers SET name=?, sdt=?, diachi=? WHERE id=?", [name, sdt, diachi, req.params.id],
        () => res.redirect("/")
    );
});

app.get("/delete/:id", checkAuth, checkRole("admin"), (req, res) => {
    db.query("DELETE FROM customers WHERE id=?", [req.params.id], () =>
        res.redirect("/")
    );
});

app.get("/register", (req, res) => {
    res.render("auth/register");
});

app.post("/register", (req, res) => {
    const { name, email, sdt, password } = req.body;
    if (!/^0\d{9}$/.test(sdt)) {
        return res
            .status(400)
            .json({ status: "fail", message: "SĐT phải bắt đầu bằng 0 và có 10 số" });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err)
            return res.status(500).json({ status: "fail", message: "Lỗi server" });
        if (result.length > 0)
            return res.json({ status: "fail", message: "Tài khoản đã tồn tại" });

        bcrypt.hash(password, 10, (err, hash) => {
            if (err)
                return res.status(500).json({ status: "fail", message: "Lỗi mã hoá" });
            db.query(
                "INSERT INTO users (name, email, sdt, password, role) VALUES (?,?,?,?,?)", [name, email, sdt, hash, "viewer"],
                (err) => {
                    if (err)
                        return res
                            .status(500)
                            .json({ status: "fail", message: "Không thể tạo tài khoản" });
                    res.json({ status: "success", message: "Đăng ký thành công!" });
                }
            );
        });
    });
});

app.get("/login", (req, res) => {
    res.render("auth/login");
});

app.post("/login", async(req, res) => {
    try {
        const { username, password } = req.body;
        console.log("Login attempt:", username); // <--- log

        const [rows] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?", [username]
        );

        console.log("DB result:", rows); // <--- log

        if (rows.length === 0) {
            return res.json({ status: "fail", message: "Sai tài khoản" });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ status: "fail", message: "Sai mật khẩu" });

        if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY missing");

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role },
            process.env.SECRET_KEY, { expiresIn: "1h" }
        );

        req.session.user = { id: user.id, email: user.email, role: user.role, token };

        res.json({ status: "success", message: "Đăng nhập thành công", role: user.role, token });

    } catch (err) {
        console.error("Login error:", err); // <--- log chi tiết
        res.status(500).json({ status: "fail", message: "Lỗi server" });
    }
});


// Customers invoices
app.post("/customers/:id/invoices", (req, res) => {
    const { price, createdAt } = req.body;
    const customerId = req.params.id;

    if (price == null || price < 0) {
        return res
            .status(400)
            .json({ status: "fail", message: "Số tiền không hợp lệ" });
    }

    db.query(
        "INSERT INTO invoice (price, createdAt, customerId) VALUES (?,?,?)", [price, createdAt, customerId],
        (err, result) => {
            if (err)
                return res.status(500).json({ status: "fail", message: "DB error" });
            res.json({
                status: "success",
                message: "Tạo hóa đơn thành công!",
                invoice: { invoiceId: result.insertId, price, createdAt, customerId },
            });
        }
    );
});

app.get("/customers/:id/invoices", async(req, res) => {
    try {
        const [rows] = await db
            .promise()
            .query(
                "SELECT * FROM invoice WHERE customerId = ? ORDER BY createdAt DESC", [req.params.id]
            );
        res.render("invoice/index", { customerId: req.params.id, invoices: rows });
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.get("/customers/:id/invoices/add", (req, res) => {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return res.status(400).send("Invalid CustomerId");
    res.render("invoice/add", { customerId });
});

// ===== Start Server =====
app.listen(3000, () => console.log("Server running: http://localhost:3000"));