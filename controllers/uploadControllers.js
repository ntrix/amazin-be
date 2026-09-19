import cloudinary from "cloudinary";
import Product from "../models/productModel.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";

const uploadControllers = {
  async uploadImages(req, res) {
    cloudinary.config({
      cloud_name: process.env.CD_NAME,
      api_key: process.env.CD_API_KEY,
      api_secret: process.env.CD_API_SECRET,
    });

    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      throw new NotFoundError("Something wrong happens. Product Not Found");

    const images = req.files;
    if (!images) throw new BadRequestError("No Image has been sent");

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

    const urls = await Promise.all(cloudImages);
    product.image = [product.image, ...urls].join("^");
    await product.save();
    res.send(urls);
  },

  async updateImages(req, res) {
    cloudinary.config({
      cloud_name: process.env.CD_NAME,
      api_key: process.env.CD_API_KEY,
      api_secret: process.env.CD_API_SECRET,
    });

    const { productId, imgLink, image } = req.body;
    const imgName = imgLink.split("/").pop(); // img file name is the only last piece of url
    const product = await Product.findById(productId);
    if (!product)
      throw new NotFoundError("Something wrong happens. Product Not Found");

    cloudinary.v2.uploader.destroy(`amazin/${productId}/${imgName}`);

    product.image = image;
    await product.save();
    res.send({ message: "updated to DB" });
  },
};

export default uploadControllers;
