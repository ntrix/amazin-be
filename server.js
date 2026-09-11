import mongoose from "mongoose";
import app from "./app.js";

mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost/amazin", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});
