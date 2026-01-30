var limiter = require('express-rate-limit');

module.exports.global = limiter.rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('429', { layout: 'layouts/error' });
    }
});

module.exports.login = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(409).json({ 'success': false, 'error': 'Too many login attempts! Please try again later.' });
    }
});

module.exports.register = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(409).json({ 'success': false, 'error': 'Too many register attempts! Please try again later.' });
    }
});

module.exports.google = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        res.status(409).render('409', { layout: 'layouts/error', error: 'Too many google requests attempts! Please try again later' });
    }
});

module.exports.discord = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        res.status(409).render('409', { layout: 'layouts/error', error: 'Too many discord requests attempts! Please try again later' });
    }
});

module.exports.steam = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        res.status(409).render('409', { layout: 'layouts/error', error: 'Too many steam requests attempts! Please try again later' });
    }
});

module.exports.recover = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(409).json({ 'success': false, 'error': 'Too many account recovery attempts! Please try again later.' });
    }
});

module.exports.twofa = limiter.rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(409).json({ 'success': false, 'error': 'Too many Two-Factory Authentication attempts! Please try again later.' });
    }
});