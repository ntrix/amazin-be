import { describe, it, expect } from "vitest";
import {
  isOrderOwnerOrAdmin,
  isOrderSellerOrAdmin,
  isProductOwnerOrAdmin,
} from "../domain/authorization.js";

describe("isOrderOwnerOrAdmin", () => {
  it("allows the buyer", () => {
    const order = { user: "u1", seller: "s1" };
    expect(isOrderOwnerOrAdmin(order, { _id: "u1", isAdmin: false })).toBe(true);
  });

  it("allows the seller", () => {
    const order = { user: "u1", seller: "s1" };
    expect(isOrderOwnerOrAdmin(order, { _id: "s1", isAdmin: false })).toBe(true);
  });

  it("allows an admin regardless of ownership", () => {
    const order = { user: "u1", seller: "s1" };
    expect(isOrderOwnerOrAdmin(order, { _id: "stranger", isAdmin: true })).toBe(
      true
    );
  });

  it("blocks an unrelated non-admin user", () => {
    const order = { user: "u1", seller: "s1" };
    expect(
      isOrderOwnerOrAdmin(order, { _id: "stranger", isAdmin: false })
    ).toBe(false);
  });
});

describe("isOrderSellerOrAdmin", () => {
  it("allows the seller but not the buyer", () => {
    const order = { user: "u1", seller: "s1" };
    expect(isOrderSellerOrAdmin(order, { _id: "s1", isAdmin: false })).toBe(
      true
    );
    expect(isOrderSellerOrAdmin(order, { _id: "u1", isAdmin: false })).toBe(
      false
    );
  });

  it("allows an admin", () => {
    const order = { user: "u1", seller: "s1" };
    expect(
      isOrderSellerOrAdmin(order, { _id: "stranger", isAdmin: true })
    ).toBe(true);
  });
});

describe("isProductOwnerOrAdmin", () => {
  it("allows the owning seller, blocks a different seller, allows admin", () => {
    const product = { seller: { toString: () => "s1" } };
    expect(isProductOwnerOrAdmin(product, { _id: "s1", isAdmin: false })).toBe(
      true
    );
    expect(
      isProductOwnerOrAdmin(product, { _id: "s2", isAdmin: false })
    ).toBe(false);
    expect(isProductOwnerOrAdmin(product, { _id: "s2", isAdmin: true })).toBe(
      true
    );
  });
});
