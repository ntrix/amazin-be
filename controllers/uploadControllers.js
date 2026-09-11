import cloudinary from "cloudinary";
import multer from "multer";
import Product from "../models/productModel.js";

const uploadControllers = {
  uploadImages(req, res) {
    cloudinary.config({
      cloud_name: process.env.CD_NAME,
      api_key: process.env.CD_API_KEY,
      api_secret: process.env.CD_API_SECRET,
    });

    (async () => {
      const { productId } = req.body;
      const product = await Product.findById(productId);
      if (!product)
        return res
          .status(404)
          .send({ message: "Something wrong happens. Product Not Found" });

      const images = req.files;
      if (!images)
        return res.status(411).send({ message: "No Image has been sent" });

      const cloudImages = images.map(
        (image) =>
          new Promise((resolve, reject) =>
            cloudinary.v2.uploader.upload(
              image.path,
              { folder: `amazin/${productId}` },
              (error, data) => {
                if (error) {
                  reject(
                    new Error(
                      error instanceof Error ? error.message : String(error)
                    )
                  );
                } else {
                  resolve(data.public_id.split("/").pop()); // appName/sellerID/productId/imgName only need to save the imgName to DB
                }
              }
            )
          )
      );

      Promise.all(cloudImages)
        .then((urls) => {
          product.image = [product.image, ...urls].join("^");
          product.save();
          res.send(urls);
        })
        .catch((error) => res.status(503).send({ message: "here" + error }));
    })();
  },

  updateImages(req, res) {
    cloudinary.config({
      cloud_name: process.env.CD_NAME,
      api_key: process.env.CD_API_KEY,
      api_secret: process.env.CD_API_SECRET,
    });

    (async () => {
      const { productId, imgLink, image } = req.body;
      const imgName = imgLink.split("/").pop(); // img file name is the only last piece of url
      const product = await Product.findById(productId);
      if (!product)
        return res
          .status(417)
          .send({ message: "Something wrong happens. Product Not Found" });

      cloudinary.v2.uploader.destroy(`amazin/${productId}/${imgName}`);

      product.image = image;
      try {
        product.save();
        res.send({ message: "updated to DB" });
      } catch (error) {
        res.status(503).send({ message: error });
      }
    })();
  },
};

export default uploadControllers;
