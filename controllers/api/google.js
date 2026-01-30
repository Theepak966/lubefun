var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

var config = require('@/config/config.js');

passport.use(new GoogleStrategy({
    clientID: config.app.google.client,
    clientSecret: config.app.google.secret,
    callbackURL: config.app.google.callback_url,
    scope: [ 'email', 'profile' ],
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (user, done) => {
    done(null, user);
});