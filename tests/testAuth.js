import jwt from "jsonwebtoken";

export function signTestToken(user) {
  return jwt.sign(
    {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      isAdmin: !!user.isAdmin,
      isSeller: !!user.isSeller,
    },
    process.env.JWT_SECRET_A,
    { expiresIn: "1h" }
  );
}
