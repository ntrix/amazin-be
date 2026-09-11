export const isOrderOwnerOrAdmin = (order, user) =>
  [String(order.user), String(order.seller)].includes(user._id) || user.isAdmin;

export const isOrderSellerOrAdmin = (order, user) =>
  String(order.seller) === user._id || user.isAdmin;

export const isProductOwnerOrAdmin = (product, user) =>
  product.seller.toString() === user._id || user.isAdmin;
