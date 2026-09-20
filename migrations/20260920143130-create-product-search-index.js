// Atlas Search index creation only works against a real Atlas cluster (M0+),
// not against local/test MongoDB (mongodb-memory-server, community server) -
// createSearchIndex() throws there, so both directions log and continue
// instead of failing the whole migration run.

export const up = async (db) => {
  try {
    await db.collection("products").createSearchIndex({
      name: "product_search",
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            name: { type: "string" },
            brand: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    });
    console.log(
      "Atlas Search index 'product_search' submitted - it builds asynchronously, check status in Atlas UI before enabling ATLAS_SEARCH_ENABLED"
    );
  } catch (err) {
    console.warn(
      "Skipping Atlas Search index creation (expected on local/test MongoDB, only supported on Atlas):",
      err.message
    );
  }
};

export const down = async (db) => {
  try {
    await db.collection("products").dropSearchIndex("product_search");
  } catch (err) {
    console.warn("Skipping Atlas Search index drop:", err.message);
  }
};
