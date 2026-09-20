export const up = async (db) => {
  await db.collection("products").createIndex({ category: 1 });
  await db.collection("products").createIndex({ seller: 1 });
  await db.collection("orders").createIndex({ user: 1 });
  await db.collection("orders").createIndex({ seller: 1 });
};

export const down = async (db) => {
  await db.collection("products").dropIndex({ category: 1 });
  await db.collection("products").dropIndex({ seller: 1 });
  await db.collection("orders").dropIndex({ user: 1 });
  await db.collection("orders").dropIndex({ seller: 1 });
};
