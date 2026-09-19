import mongoose from 'mongoose';
import app from './app.js';
import logger from './lib/logger.js';

mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/amazin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  logger.info({ port }, `Serve at http://localhost:${port}`);
});
