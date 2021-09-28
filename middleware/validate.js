import { body } from "express-validator";

const validate = {
  email: () =>
    body("email", "Invalid username or email").isEmail().trim().escape(),

  loginPassword: () =>
    body("password", "Invalid email or password")
      .isLength({ min: 8, max: 32 })
      .trim()
      .escape(),

  name: () =>
    body("name", "Name must be 2-50 characters long")
      .isLength({ min: 2, max: 50 })
      .trim()
      .escape(),

  password: () =>
    body("password")
      .isLength({ min: 8, max: 32 })
      .withMessage("Password must be 8-32 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9]/)
      .withMessage(
        "Password must have at least one digit, lowercase and uppercase characters"
      )
      .trim()
      .escape(),

  confirmPassword: () =>
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Password and Confirmation are not match")
      .trim()
      .escape(),
};

export default validate;
