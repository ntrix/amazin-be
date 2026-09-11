import path from "path";
import express from "express";
import multer from "multer";
import uploadControllers from "../controllers/uploadControllers.js";
import { checkToken } from "../auth/token.js";

const uploadRoute = express.Router();

const upload = multer({
  dest: path.join(path.resolve(), "tmp", "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
});

uploadRoute.post(
  "/",
  checkToken,
  upload.array("images", 8),
  uploadControllers.uploadImages
);

uploadRoute.patch(
  "/",
  checkToken,
  upload.none(),
  uploadControllers.updateImages
);

export default uploadRoute;
