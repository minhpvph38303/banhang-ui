// middlewares/requireAdmin.js
module.exports = (req, res, next) => {
  if (!req.user) return res.status(401).send("Bạn chưa đăng nhập!");
  if (req.user.role !== "admin")
    return res.status(403).send("Bạn không có quyền!");
  next();
};
