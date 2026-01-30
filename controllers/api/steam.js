var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;

var config = require('@/config/config.js');

passport.use(new SteamStrategy({
    apiKey: config.app.steam.apikey,
    returnURL: config.app.url + config.app.steam.callback_url,
    realm: config.app.url,
    passReqToCallback: true
}, async (req, identifier, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (user, done) => {
    done(null, user);
});