import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Only required for password-based accounts; OAuth-created users have no password.
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    isAdmin: { type: Boolean, default: false, required: true },
    isSeller: { type: Boolean, default: false, required: true },
    refreshTokenVersion: { type: Number, default: 0 },
    currency: { type: String },
    seller: {
      name: { type: String, default: "" },
      logo: { type: String, default: "/images/default-logo.png" },
      description: { type: String, default: "Seller's description: " },
      rating: { type: Number, default: 0, required: true },
      numReviews: { type: Number, default: 0, required: true },
    },
  },
  {
    timestamps: true,
  }
);
const User = mongoose.model("User", userSchema);
export default User;
