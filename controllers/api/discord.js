var passport = require('passport');
var DiscordStrategy = require('passport-discord').Strategy;

var config = require('@/config/config.js');

passport.use(new DiscordStrategy({
    clientID: config.app.discord.client,
    clientSecret: config.app.discord.secret,
    callbackURL: config.app.discord.callback_url,
    scope: [ 'identify', 'email', 'guilds' ],
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