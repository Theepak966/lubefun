var fs = require('fs');
var express = require('express');
var layouts = require('express-ejs-layouts');
var session = require('express-session');
var useragent = require('express-useragent');
var passport = require('passport');
var cors = require('cors');
var cookie = require('cookie-parser');
var helmet = require('helmet');

var { loggerError } = require('@/lib/logger.js');

var app = express();

// NUMBER OF PROXIES BETWEEN USER AND SERVER
app.set('trust proxy', 1);

/**
 * Health endpoint used by load balancers and reverse proxies.
 *
 * Why:
 * - It must run before DB-backed middleware so nginx can verify liveness
 *   even if the DB is temporarily down.
 * - It must exist before the catch-all 404 handler.
 */
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// SERVER STATIC FILES
app.use(express.static('public'));
app.use('/audio', express.static('public/audio'));
app.use('/css', express.static('public/css'));
app.use('/fonts', express.static('public/fonts'));
app.use('/img', express.static('public/img'));
app.use('/js', express.static('public/js'));

// VIEW ENGINE SETUP
app.use(layouts);
app.set('layout', 'layouts/default');
app.set('view engine', 'ejs');
app.set('env', process.env.APP_ENV);

// HELMET HEADERS SECURITY
app.use(helmet.hidePoweredBy());
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.xssFilter());

// PARSE URL-ENCODED BODIES (AS SEND BY HTML FORMS)
app.use(express.urlencoded({ extended: false }));

// BUILT-IN MIDDLEWARE FOR JSON
app.use(express.json());

// MIDDLEWARE FOR CORS CONFIGURATION
app.use(cors());

// MIDDLEWARE FOR COOKIE
app.use(cookie());
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Validate SESSION_SECRET is set
if (!process.env.SESSION_SECRET) {
    console.error('[FATAL] SESSION_SECRET is required. Please set it in .env');
    process.exit(1);
}

// USE THE SESSION MIDDLEWARE
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        // Use "auto" so secure cookies work correctly behind reverse proxies
        // that terminate TLS (nginx) as well as when Node listens on HTTPS directly.
        secure: 'auto',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// NOWPAYMENTS CALLBACK
app.use('/nowpayments', require('@/routes/api/nowpayments.js'));

// DRAKON WEBHOOK
app.use('/drakon', require('@/routes/api/drakon.js'));

// BOT DETECTOR
app.use(useragent.express());
app.use((req, res, next) => {
    if(!req.headers['user-agent']) return res.status(500).render('500', { layout: 'layouts/error', error: 'Useragent is not defined' });

    if(!req.useragent) return res.status(500).render('500', { layout: 'layouts/error', error: 'Useragent is not defined' });

    var allowedBots = [
        'Googlebot',
        'Google-InspectionTool',
        'bingbot',
        'DuckDuckBot',
        'Twitterbot',
        'facebookexternalhit',
        'Facebot',
        'Instagram',
        'Discordbot',
        'Slackbot'
    ];

    if(allowedBots.some(bot => req.headers['user-agent'].toLowerCase().includes(bot.toLowerCase()))) return next();

    if(req.useragent.isBot) return res.status(403).render('403', { layout: 'layouts/error', error: 'Bot detected' });

    next();
});

// RATE LIMITER
app.use(require('@/middleware/limiter.js').global);

// SETUP PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// USE MIDDLEWARES
app.use(require('@/middleware/authentication.js'));
app.use(require('@/middleware/user.js'));
app.use(require('@/middleware/banip.js'));
app.use(require('@/middleware/visitors.js'));
app.use(require('@/middleware/trackingLink.js'));
app.use(require('@/middleware/globals.js'));
app.use(require('@/middleware/maintenance.js'));
app.use(require('@/middleware/bansite.js'));

// ROUTES
app.use('/auth', require('@/routes/api/auth.js'));
app.use('/twofa', require('@/routes/api/twofa.js'));
app.use('/', require('@/routes/auth.js'));

app.use(require('@/middleware/auth.js'));

app.use('/', require('@/routes/index.js'));

// ERROR HANDLER
app.use((err, req, res, next) => {
    loggerError(err);

    // Always show generic error in production
    res.status(500).render('500', { layout: 'layouts/error', error: 'Internal Server Error' });
});

// ROUTE FOR 404 PAGES
app.all('*', (req, res) => {
    res.status(404).render('404', { layout: 'layouts/error' });
});

module.exports = app;