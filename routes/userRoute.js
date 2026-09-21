import cors from "cors";
import express from "express";
import asyncHandler from "express-async-handler";
import userControllers from "../controllers/userControllers.js";
import validate from "../middleware/validate.js";
import { checkToken } from "../auth/token.js";
import { isAdmin } from "../auth/rolls.js";
import devOnly from "../middleware/devOnly.js";
import passport, {
  googleOAuthEnabled,
  githubOAuthEnabled,
} from "../auth/passport.js";

const userRoute = express.Router();

const oauthFailureRedirect = `${
  process.env.FE_ORIGIN || "http://localhost:3000"
}/signin?error=oauth`;

userRoute.post("/contact", cors(), userControllers.postContact);

userRoute.get("/top-sellers", asyncHandler(userControllers.getTopSellers));

userRoute.get("/seed", devOnly, asyncHandler(userControllers.seed));

userRoute.post(
  "/signin",
  validate.email(),
  validate.loginPassword(),
  asyncHandler(userControllers.signIn)
);

userRoute.post(
  "/register",
  validate.name(),
  validate.email(),
  validate.password(),
  validate.confirmPassword(),
  asyncHandler(userControllers.signUp)
);

userRoute.post("/refresh", asyncHandler(userControllers.refresh));

// Registered before /:id since both are GET on this router - Express would
// otherwise match "auth" as an :id param. Always registered (rather than
// only when enabled) so a disabled provider 404s cleanly instead of falling
// through to /:id and being treated as a malformed user id lookup.
const notFound = (req, res) => res.status(404).send({ message: "Not Found" });

userRoute.get(
  "/auth/google",
  googleOAuthEnabled
    ? passport.authenticate("google", { scope: ["profile", "email"], session: false })
    : notFound
);
userRoute.get(
  "/auth/google/callback",
  googleOAuthEnabled
    ? [
        passport.authenticate("google", {
          session: false,
          failureRedirect: oauthFailureRedirect,
        }),
        asyncHandler(userControllers.oauthCallback),
      ]
    : notFound
);

userRoute.get(
  "/auth/github",
  githubOAuthEnabled
    ? passport.authenticate("github", { scope: ["user:email"], session: false })
    : notFound
);
userRoute.get(
  "/auth/github/callback",
  githubOAuthEnabled
    ? [
        passport.authenticate("github", {
          session: false,
          failureRedirect: oauthFailureRedirect,
        }),
        asyncHandler(userControllers.oauthCallback),
      ]
    : notFound
);

userRoute.get("/:id", asyncHandler(userControllers.getUser));

userRoute.use(checkToken);

userRoute.post("/logout", asyncHandler(userControllers.logout));

userRoute.put(
  "/profile",
  validate.name(),
  validate.email(),
  validate.password(),
  asyncHandler(userControllers.updateProfile)
);

/* submit contact form */
userRoute.patch(
  "/profile",
  validate.id(),
  asyncHandler(userControllers.updateProfile)
);

userRoute.get("/", isAdmin, asyncHandler(userControllers.getAllUsers));

userRoute.delete("/:id", isAdmin, asyncHandler(userControllers.deleteUser));

userRoute.put("/:id", isAdmin, asyncHandler(userControllers.editUser));

export default userRoute;
