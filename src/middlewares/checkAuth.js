// const jwt = require("jsonwebtoken");
// const SECRET_KEY = "mysecretkey123";

// module.exports = function (req, res, next) {
//   const token = req.headers.authorization || req.query.token || req.body.token;

//   if (!token) return res.redirect("/login");

//   try {
//     const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.redirect("/login");
//   }
// };

module.exports = (req, res, next) => {
  req.session = req.session || {};

  const user = req.session.user || null;

  if (!user) {
    return res.redirect("/login?error=Bạn phải đăng nhập trước");
  }

  if (!user.token) {
    return res.redirect("/login?error=Phiên đăng nhập không hợp lệ");
  }
  req.user = req.session.user;

  next();
};
