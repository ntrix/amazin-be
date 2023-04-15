import express from "express";
import multer from "multer";
import uploadControllers from "../controllers/uploadControllers.js";
import { checkToken } from "../auth/token.js";

const uploadRoute = express.Router();

// const storage = multer.diskStorage({
//   destination(req, file, cb) {
//     cb(null, "-tmp/multi/uploads/");
//   },
//   filename(req, file, cb) {
//     cb(null, `${Date.now()}.jpg`);
//   },
// });

// const upload = multer({ storage });

const upload = multer({ dest: "/tmp/uploads/" });

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
