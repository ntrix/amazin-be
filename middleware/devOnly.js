// Guards demo/dev-only routes (seed endpoints, etc.) - CI runs with
// NODE_ENV=test and needs these unauthenticated (no user exists yet to
// get a token from), so this can't be a normal auth check. Returns 404
// rather than 403 so the route's existence isn't revealed in production.
export default function devOnly(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).send({ message: "Not found" });
  }
  next();
}
