import cors from "cors";
import express from "express";
import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import userControllers from "../controllers/userControllers.js";
import { checkToken } from "../auth/token.js";
import { isAdmin } from "../auth/rolls.js";

const userRoute = express.Router();

userRoute.post("/contact", cors(), userControllers.postContact);

userRoute.get("/top-sellers", asyncHandler(userControllers.getTopSellers));

userRoute.get("/seed", asyncHandler(userControllers.seed));

userRoute.post(
  "/signin",
  body("email", "Invalid username or email").isEmail().trim().escape(),
  body("password", "Invalid email or password")
    .isLength({ min: 8, max: 32 })
    .trim()
    .escape(),
  asyncHandler(userControllers.signIn)
);

userRoute.post(
  "/register",

  body("name", "Name must be 2-50 characters long")
    .isLength({ min: 2, max: 50 })
    .trim()
    .escape(),
  body("email", "Email address is invalid").isEmail().trim().escape(),
  body("password")
    .isLength({ min: 8, max: 32 })
    .withMessage("Password must be 8-32 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/)
    .withMessage(
      "Password must have letter, number and special character (@$!%*#?&)"
    )
    .trim()
    .escape(),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Password and Confirmation are not match")
    .trim()
    .escape(),

  asyncHandler(userControllers.signUp)
);

userRoute.get("/:id", asyncHandler(userControllers.getUser));

userRoute.use(checkToken);

userRoute.put(
  "/profile",

  body("name", "Name must be 2-50 characters long")
    .isLength({ min: 2, max: 50 })
    .trim()
    .escape(),
  body("email", "Email address is invalid").isEmail().trim().escape(),
  body("password")
    .isLength({ min: 8, max: 32 })
    .withMessage("Password must be 8-32 characters long")
    .trim()
    .escape()
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/)
    .withMessage(
      "Password must have letter, number and special character (@$!%*#?&)"
    ),

  asyncHandler(userControllers.updateProfile)
);

userRoute.get("/", isAdmin, asyncHandler(userControllers.getAllUsers));

userRoute.delete("/:id", isAdmin, asyncHandler(userControllers.deleteUser));

userRoute.put("/:id", isAdmin, asyncHandler(userControllers.editUser));

export default userRoute;
