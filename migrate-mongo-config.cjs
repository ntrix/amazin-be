// In this file you can configure migrate-mongo
require("dotenv").config();

const config = {
  mongodb: {
    // same env var and same default as server.js - database name is
    // encoded in the URL itself, so databaseName is left out
    url: process.env.MONGODB_URL || "mongodb://localhost/amazin",

    options: {
      // useNewUrlParser: true, // (not needed anymore in mongodb driver 4.x+)
      // useUnifiedTopology: true, // (not needed anymore in mongodb driver 4.x+)
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // The mongodb collection where the lock will be created.
  lockCollectionName: "changelog_lock",

  // The value in seconds for the TTL index that will be used for the lock. Value of 0 will disable the feature.
  lockTtl: 0,

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // migration files use `export default`, matching this repo's ESM
  // ("type": "module" in package.json)
  moduleSystem: 'esm',
};

module.exports = config;
