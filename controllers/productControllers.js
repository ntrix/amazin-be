import { movies } from "../seed.data.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import { isProductOwnerOrAdmin } from "../domain/authorization.js";

const productControllers = {
  async adminBackup(req, res) {
    const pList = await Product.find({});
    const uList = await User.find({});
    const oList = await Order.find({});
    res.json({ uList, pList, oList });
  },

  async adminUpdate(req, res) {
    // one-off migration, currently disabled - uncomment and adapt the
    // update spec below before re-enabling:
    // const pList = await Product.updateMany({}, [
    //   { $set: { video: { $concat: ["$video", "$brand"] } } },
    // ]);
    res.json({ message: "No update operation configured" });
  },

  async getProducts(req, res) {
    const category = req.query.category || "";
    const categoryFilter = category ? { category } : {};
    const pageSize = Number(req.query.pageSize) || 6;
    if (pageSize == 999) {
      // only for Search function: categories scope purpose
      const list = await Product.find(categoryFilter);
      const productList = list.map((p) => ({
        name: p.name,
        // _id: p._id,
        // category: p.category,
      }));
      res.send({ productList });
      return;
    }
    const page = Number(req.query.pageNumber) || 1;
    const name = req.query.name || "";
    const seller = req.query.seller || "";
    const order = req.query.order || "";
    const deal =
      req.query.deal && Number(req.query.deal) !== 0
        ? Number(req.query.deal)
        : 0;
    const min =
      req.query.min && Number(req.query.min) !== 0 ? Number(req.query.min) : 0;
    const max =
      req.query.max && Number(req.query.max) !== 0 ? Number(req.query.max) : 0;
    const rating =
      req.query.rating && Number(req.query.rating) !== 0
        ? Number(req.query.rating)
        : 0;

    const sellerFilter = seller ? { seller } : {};
    const dealFilter = deal ? { deal: { $gte: deal } } : {};
    const priceFilter =
      min && !max
        ? { price: { $gte: min } }
        : min && max
        ? { price: { $gte: min, $lte: max } }
        : {};
    const ratingFilter = rating ? { rating: { $gte: rating } } : {};
    const sortOrder = {
      lowest: { price: 1 },
      highest: { price: -1 },
      toprated: { rating: -1 },
      bestselling: { numReviews: -1 },
      oldest: { _id: 1 },
    }[order] || { _id: -1 }; /* date */

    if (name && process.env.ATLAS_SEARCH_ENABLED === "true") {
      try {
        const searched = await productControllers.searchWithAtlas({
          name,
          otherFilters: {
            ...sellerFilter,
            ...categoryFilter,
            ...dealFilter,
            ...priceFilter,
            ...ratingFilter,
          },
          sortOrder: order ? sortOrder : null, // null = rank by relevance
          pageSize,
          page,
        });
        return res.send({
          products: searched.products,
          page,
          count: searched.count,
          category: category || "All",
          pages: Math.ceil(searched.count / pageSize),
        });
      } catch (err) {
        req.log.warn(
          { err },
          "Atlas Search query failed, falling back to regex search"
        );
      }
    }

    const nameFilter = name ? { name: { $regex: name, $options: "i" } } : {};
    const count = await Product.countDocuments({
      ...sellerFilter,
      ...nameFilter,
      ...categoryFilter,
      ...dealFilter,
      ...priceFilter,
      ...ratingFilter,
    });
    const products = await Product.find({
      ...sellerFilter,
      ...nameFilter,
      ...categoryFilter,
      ...dealFilter,
      ...priceFilter,
      ...ratingFilter,
    })
      .populate("seller", "seller.name seller.logo")
      .sort(sortOrder)
      .skip(pageSize > 500 ? 0 : pageSize * (page - 1)) /* > 500 = all */
      .limit(pageSize > 500 ? 0 : pageSize);
    res.send({
      products,
      page,
      count,
      category: category || "All",
      pages: Math.ceil(count / pageSize),
    });
  },

  // Full-text relevance search via Atlas Search - only reachable when
  // ATLAS_SEARCH_ENABLED=true, which is only meaningful once the
  // "product_search" index (see migrations/) reports status "READY" in
  // the Atlas UI, since a missing/building index makes $search throw.
  async searchWithAtlas({ name, otherFilters, sortOrder, pageSize, page }) {
    const noLimit = pageSize > 500;
    const dataPipeline = [
      { $sort: sortOrder || { score: -1 } },
      ...(noLimit ? [] : [{ $skip: pageSize * (page - 1) }, { $limit: pageSize }]),
    ];
    const [result] = await Product.aggregate([
      {
        $search: {
          index: "product_search",
          text: {
            query: name,
            path: ["name", "brand", "category", "description"],
            fuzzy: { maxEdits: 1 },
          },
        },
      },
      { $match: otherFilters },
      { $addFields: { score: { $meta: "searchScore" } } },
      { $facet: { data: dataPipeline, totalCount: [{ $count: "count" }] } },
    ]);
    const products = await Product.populate(result.data, {
      path: "seller",
      select: "seller.name seller.logo",
    });
    return { products, count: result.totalCount[0]?.count || 0 };
  },

  async getCategories(req, res) {
    const categories = await Product.find().distinct("category");
    res.send(categories);
  },

  async seedDB(req, res) {
    if ((await Product.countDocuments()) > 0) {
      return res.status(409).send({ message: "Already seeded" });
    }
    const seller = await User.findOne({ isSeller: true });
    if (seller) {
      const products = movies.products.map((product) => ({
        ...product,
        seller: seller._id,
      }));
      const createdProducts = await Product.insertMany(products);
      res.send({ createdProducts });
    } else {
      res
        .status(404)
        .send({ message: "No seller found. first run /api/users/seed" });
    }
  },

  async getProduct(req, res) {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "seller.name seller.logo seller.rating seller.numReviews"
    );
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: "Product Not Found" });
    }
  },

  async createProduct(req, res) {
    const product = new Product({
      name: "product name " + Date.now(),
      seller: req.user._id,
      image: "",
      price: 0,
      category: "pending category",
      brand: "noname",
      countInStock: 0,
      rating: 0,
      numReviews: 0,
      description: "product description",
    });
    const createdProduct = await product.save();
    res.send({ message: "Product Created", product: createdProduct });
  },

  async updateProduct(req, res) {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      if (!isProductOwnerOrAdmin(product, req.user)) {
        return res
          .status(403)
          .send({ message: "Not authorized to edit this product" });
      }
      product.name = req.body.name;
      product.price = req.body.price;
      product.deal = req.body.deal;
      product.ship = req.body.ship;
      product.image = req.body.image;
      product.video = req.body.video;
      product.category = req.body.category;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description;
      const updatedProduct = await product.save();
      res.send({ message: "Product Updated", product: updatedProduct });
    } else {
      res.status(404).send({ message: "Product Not Found" });
    }
  },

  async deleteProduct(req, res) {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.send({ message: "Product Deleted", product });
    } else {
      res.status(404).send({ message: "Product Not Found" });
    }
  },

  async postReviews(req, res) {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(409)
          .send({ message: "You already submitted a review" });
      }
      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((a, c) => c.rating + a, 0) /
        product.reviews.length;
      const updatedProduct = await product.save();
      res.status(201).send({
        message: "Review Created",
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
      });
    } else {
      res.status(404).send({ message: "Product Not Found" });
    }
  },
};

export default productControllers;
