import cors from "cors";
import express from "express";
import asyncHandler from "express-async-handler";
import userControllers from "../controllers/userControllers.js";
import validate from "../middleware/validate.js";
import { checkToken } from "../auth/token.js";
import { isAdmin } from "../auth/rolls.js";
import devOnly from "../middleware/devOnly.js";

const userRoute = express.Router();

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

userRoute.get("/:id", asyncHandler(userControllers.getUser));

userRoute.use(checkToken);

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
