var gulp = require('gulp');
var concat = require('gulp-concat');
var cleanCss = require('gulp-clean-css');
const obfuscatorJs = require('gulp-javascript-obfuscator');

gulp.task('pack-components-js', function () {
    return gulp.src([
            'assets/js/components/*.js',
            'assets/js/components.js'
        ])
        .pipe(concat('components.js'))
        .pipe(obfuscatorJs({
            compact: true,
            controlFlowFlattening: false,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: false,
            debugProtection: false,
            stringArray: true,
            stringArrayEncoding: [ 'base64' ],
            stringArrayThreshold: 0.75,
            transformObjectKeys: false
        }))
        .pipe(gulp.dest('public/js'));
});

gulp.task('pack-js', function () {
    return gulp.src([
            'assets/js/app.js',
            'assets/js/auth.js',
            'assets/js/graph.js'
        ], { base: 'assets/js' })
        .pipe(obfuscatorJs({
            compact: true,
            controlFlowFlattening: false,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: false,
            debugProtection: false,
            stringArray: true,
            stringArrayEncoding: [ 'base64' ],
            stringArrayThreshold: 0.75,
            transformObjectKeys: false
        }))
        .pipe(gulp.dest('public/js'));
});

gulp.task('pack-css', function () {
    return gulp.src(['assets/css/**/*.css'])
        .pipe(concat('globals.css'))
        .pipe(cleanCss())
        .pipe(gulp.dest('public/css'));
});

gulp.task('pack', gulp.series('pack-js', 'pack-components-js', 'pack-css'));

gulp.task('watch', function () {
    gulp.watch([
        'assets/js/app.js',
        'assets/js/auth.js',
        'assets/js/graph.js'
    ], gulp.series('pack-js'));

    gulp.watch([
        'assets/js/components/*.js',
        'assets/js/components.js'
    ], gulp.series('pack-components-js'));

    gulp.watch('assets/css/**/*.css', gulp.series('pack-css'));
});

gulp.task('default', gulp.series('pack', 'watch'));