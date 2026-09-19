import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { generateToken } from "../auth/token.js";
import User from "../models/userModel.js";
import { data } from "../seed.data.js";

const NOT_FOUND = "User Not Found";

const userControllers = {
  async postContact(req, res) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const { name, email, phone, text } = req.body;
    try {
      await sgMail.send({
        to: process.env.TOMAIL,
        from: process.env.FROMMAIL,
        subject: `contact from name:${name} email:${email} phone:${
          phone || ""
        }`,
        text: "Nachricht: " + text,
        html: "<strong>Nachricht</strong>: " + text,
      });
      res.status(200).send("ok");
      req.log.info({ name, email, phone }, "contact form submitted");
    } catch (err) {
      req.log.error({ err }, "failed to send contact email");
      res.status(500).send({ message: "Failed to send message" });
    }
  },

  async getTopSellers(req, res) {
    const topSellers = await User.find({ isSeller: true })
      .select("-password")
      .sort({ "seller.rating": -1 })
      .limit(5);
    res.send(topSellers);
  },

  async seed(req, res) {
    if ((await User.countDocuments()) > 0) {
      return res.status(403).send({ message: "Already seeded" });
    }
    const createdUsers = await User.insertMany(data.users);
    res.send({ createdUsers });
  },

  async signIn(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: errors.array().map(({ msg }) => msg) });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(401)
        .send({ message: "Invalid username or email or password" });

    let count = (user.failLoginCount || 0) + 1;

    if (bcrypt.compareSync(req.body.password, user.password)) {
      user.failLoginCount = 0; //reset fail attempts count by success login
      user.save((err) =>
        err
          ? res.status(500).send({ message: "Failed to update login state" })
          : 0
      );
      return res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSeller: user.isSeller,
        currency: user.currency,
        token: generateToken(user),
      });
    }

    user.failLoginCount = count;
    if (count < 3)
      res
        .status(401)
        .send({ message: "Wrong password! " + count + " of 4 attempts." });
    else if (count < 5) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: user.email,
        from: process.env.FROMMAIL,
        subject: "Warning! too many failed attempts by logging in",
        text: `You have reached ${count}/4 attempts to login. Please be careful or your account will be locked permanent.`,
        html: "<b>You can also retry in 15 minutes or reset your password</b>",
      };
      try {
        await sgMail.send(msg);
        res.status(401).send({
          message: `${count} fail attempts. A warning message has been sent to the registered email address!`,
        });
      } catch (err) {
        res.status(401).send({
          message: `${count} fail attempts. A warning message has been sent, but the registered email cannot receive any message! Error: ${err}`,
        });
      }
    } else {
      //case count = timeId + 5, is > 5
      clearTimeout(user.failLoginCount - 5); //-5 to get back the right timeoutId
      const waitingSingleton = setTimeout(() => {
        user.failLoginCount = 3;
        user.save((err) =>
          err
            ? res.status(500).send({ message: "Failed to update login state" })
            : 0
        );
      }, 15 * 60 * 1000);
      user.failLoginCount = waitingSingleton + 5; //save timeoutId instead the counter, +5 for surely have more than 4 fail attempts
      res.status(429).send({
        message:
          "Too many fail attempts! Please try again in 15 minutes or reset your password.",
      });
    }
    try {
      user.save();
    } catch (err) {
      res.status(403).send({ message: err });
    }
  },

  async signUp(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: errors.array().map(({ msg }) => msg) });
    }
    const existUser = await User.findOne({ email: req.body.email });
    if (existUser) {
      return res.status(409).json({ message: "Email is already in use!" });
    }
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
    });
    const createdUser = await user.save();
    res.send({
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      isAdmin: createdUser.isAdmin,
      isSeller: user.isSeller,
      token: generateToken(createdUser),
    });
  },

  async getUser(req, res) {
    const user = await User.findById(req.params.id).select("-password");
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: NOT_FOUND });
    }
  },

  async updateProfile(req, res) {
    const errors = validationResult(req);
    if ((req.body.name || req.body.email) && !errors.isEmpty())
      return res
        .status(400)
        .json({ message: errors.array().map(({ msg }) => msg) });

    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: NOT_FOUND });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.currency = req.body.currency || user.currency;

    if (user.isSeller || req.body.verify) {
      if (!req.body.seller) req.body.seller = {};
      user.isSeller = true; //verify and apply new seller profile from user acc
      user.seller.name = req.body.seller.name || user.seller.name || user.name;
      user.seller.logo = req.body.seller.logo || user.seller.logo;
      user.seller.description =
        req.body.seller.description || user.seller.description;
    }

    if (req.body.oldPassword) {
      if (!bcrypt.compareSync(req.body.oldPassword, user.password))
        return res.status(401).send({ message: "Invalid email or password" });
      if (req.body.password !== req.body.confirmPassword)
        return res
          .status(400)
          .send({ message: "Password and Confirmation are not match" });
    }

    if (req.body.password)
      user.password = bcrypt.hashSync(req.body.password, 8);

    const updatedUser = await user.save();
    return res.send({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      currency: updatedUser.currency,
      isAdmin: updatedUser.isAdmin,
      isSeller: updatedUser.isSeller,
      seller: updatedUser.seller,
      token: generateToken(updatedUser),
    });
  },

  async getAllUsers(req, res) {
    const users = await User.find({}).select("-password");
    res.send(users);
  },

  async deleteUser(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ message: NOT_FOUND });

    if (user.email === "admin@admin.com" || user.isAdmin)
      return res.status(403).send({ message: "Can Not Delete Admin User" });

    const deleteUser = await user.remove();
    return res.send({ message: "User Deleted", user: deleteUser });
  },

  async editUser(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ message: NOT_FOUND });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    user.isAdmin = Boolean(req.body.isAdmin);
    // user.isAdmin = req.body.isAdmin || user.isAdmin;

    user.isSeller = Boolean(req.body.isSeller);
    user.seller.name = user.seller.name || user.name;
    user.seller.logo = user.seller.logo || "/images/default-logo.png";

    const updatedUser = await user.save();
    return res.send({ message: "User Updated", user: updatedUser });
  },
};

export default userControllers;
