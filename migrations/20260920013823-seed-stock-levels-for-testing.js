const BULK_STOCK = 1000;
const LOW_STOCK = 2;
const DEFAULT_STOCK = 20;

export const up = async (db) => {
  await db.collection("products").updateMany({}, { $set: { countInStock: BULK_STOCK } });

  const [firstProduct] = await db
    .collection("products")
    .find()
    .sort({ _id: 1 })
    .limit(1)
    .toArray();
  if (firstProduct) {
    await db
      .collection("products")
      .updateOne({ _id: firstProduct._id }, { $set: { countInStock: LOW_STOCK } });
  }
};

// original per-product values aren't preserved, so this resets everyone to
// the same flat default rather than restoring exact prior numbers
export const down = async (db) => {
  await db.collection("products").updateMany({}, { $set: { countInStock: DEFAULT_STOCK } });
};
