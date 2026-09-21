import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/userModel.js";

// Shared by both strategies, exported separately so it can be unit tested
// without going through a real OAuth handshake. Links to an existing
// password account with the same email on first OAuth login instead of
// creating a duplicate user.
export const findOrCreateOAuthUser = async (provider, profile) => {
  const idField = `${provider}Id`;
  let user = await User.findOne({ [idField]: profile.id });
  if (user) return user;

  const email = profile.emails?.[0]?.value;
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user[idField] = profile.id;
      await user.save();
      return user;
    }
  }

  return User.create({
    name: profile.displayName || profile.username || email || "OAuth user",
    // profile.id is unique per provider, so this stays collision-free even
    // when the provider account has no public email.
    email: email || `${provider}-${profile.id}@no-email.amazin`,
    [idField]: profile.id,
  });
};

export const googleOAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);
export const githubOAuthEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
);

if (googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        findOrCreateOAuthUser("google", profile)
          .then((user) => done(null, user))
          .catch((err) => done(err));
      }
    )
  );
}

if (githubOAuthEnabled) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        findOrCreateOAuthUser("github", profile)
          .then((user) => done(null, user))
          .catch((err) => done(err));
      }
    )
  );
}

export default passport;
