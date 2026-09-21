import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET_A;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET_A environment variable is required");
}

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const userClaims = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  isSeller: user.isSeller,
});

// Short-lived - safe to keep in Redux/localStorage on the frontend, since a
// leaked copy is only useful to an attacker for a few minutes.
export const generateAccessToken = (user) => {
  return jwt.sign(userClaims(user), JWT_SECRET, { expiresIn: "15m" });
};

// Long-lived - never sent to the frontend as a value it can read; only ever
// set as an httpOnly cookie. tokenVersion lets a single logout() call revoke
// every outstanding refresh token for that user at once.
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id, tokenVersion: user.refreshTokenVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export const verifyRefreshToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });

export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/api/users",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/users" });
};

export const getRefreshCookie = (req) => req.cookies?.[REFRESH_COOKIE_NAME];

export const checkToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(token, JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: "Invalid Token" });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: "No Token" });
  }
};
