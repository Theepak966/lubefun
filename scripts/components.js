var chokidar = require('chokidar');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');

var inputDir = path.join(__dirname, '..', 'views', 'components');
var outputDir = path.join(__dirname, '..', 'assets', 'js', 'components');

var watcher = chokidar.watch('.', {
    cwd: inputDir,
    persistent: true,
    ignoreInitial: true,
    atomic: false,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    },
    ignored: (path, stats) => stats?.isFile() && !path.endsWith('.ejs')
});

function inlineIncludes(templateStr, baseDir) {
    return templateStr.replace(/<%-?\s*include\((['"`])(.+?)\1\s*,\s*([\s\S]+?)\)\s*;?\s*%>/g, (match, quote, includePath, paramObjStr) => {
        var fullPath = path.resolve(baseDir, includePath);

        if(!fs.existsSync(fullPath)) throw new Error(`Included file not found: ${fullPath}`);

        var includedStr = fs.readFileSync(fullPath, 'utf8');
        var inlinedTemplate = inlineIncludes(includedStr, path.dirname(fullPath));

        // Wrap included template inside a scoped context using `with` to simulate passed params
        return `<% with (${paramObjStr}) { %>${inlinedTemplate}<% } %>`;
    }).replace(/<%-?\s*include\((['"`])(.+?)\1\)\s*;?\s*%>/g, (match, quote, includePath) => {
        var fullPath = path.resolve(baseDir, includePath);

        if(!fs.existsSync(fullPath)) throw new Error(`Included file not found: ${fullPath}`);

        var includedStr = fs.readFileSync(fullPath, 'utf8');

        // Handle includes without params
        return inlineIncludes(includedStr, path.dirname(fullPath));
    });
}

function processComponents(callback){
    fs.readdir(inputDir, function(err1, files) {
        if(err1) return callback(err1);

        function runNext(index){
            if(index >= files.length) return callback(null);

            if(path.extname(files[index]) != '.ejs') return runNext(index + 1);

            buildComponent(files[index], false, function(err2){
                if(err2) return callback(err2);

                runNext(index + 1);
            });
        }

        runNext(0);
    });
}

function buildComponent(file, parents, callback){
    var templatePath = path.join(inputDir, file);
    var outputFileName = path.basename(file, '.ejs') + '.js';
    var outputPath = path.join(outputDir, outputFileName);

    var template = fs.readFileSync(templatePath, 'utf-8');
    var fullTemplate = inlineIncludes(template, path.dirname(templatePath));

    var compiledFunction = ejs.compile(fullTemplate, { client: true });

    var outputJS = `
function ${path.basename(file, '.ejs')}(edata) {
    ${compiledFunction.toString()}
    return anonymous(edata);
}
    `.trim();

    fs.writeFile(outputPath, outputJS, function(err1) {
        if(err1) return callback(err1);

        console.log('\x1B[33m[components] component ' + file + ' compiled to ' + outputFileName);

        fs.readdir(inputDir, function(err2, files) {
            if(err2) return callback(err2);

            if(!parents) return callback(null);

            function runNext(index){
                if(index >= files.length) return callback(null);

                if(path.extname(files[index]) != '.ejs') return runNext(index + 1);
                if(files[index] == file) return runNext(index + 1);

                var regex = new RegExp(`<%-?\\s*include\\((['"\`])(.+?)${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*,\\s*([\\s\\S]+?)\\)\\s*;?\\s*%>`, 'g');

                var localTemplatePath = path.join(inputDir, files[index]);
                var localTemplate = fs.readFileSync(localTemplatePath, 'utf-8');

                if(!regex.test(localTemplate)) return runNext(index + 1);

                buildComponent(files[index], true, function(err3){
                    if(err3) return callback(err3);

                    runNext(index + 1);
                });
            }

            runNext(0);
        });
    });
}

function initComponents(callback){
    fs.access(outputDir, function(err1){
        if(err1) {
            return fs.mkdir(outputDir, { recursive: true }, function(err2) {
                if(err2) return callback(err2);

                processComponents(callback);
            });
        }

        fs.readdir(outputDir, function(err2, files) {
            if(err2) return callback(err2);

            if(files.length <= 0) return processComponents(callback);

            function runNext(i) {
                if(i >= files.length) return processComponents(callback);

                var filePath = path.join(outputDir, files[i]);

                fs.unlink(filePath, function(err3) {
                    if(err3) return callback(err3);

                    runNext(i + 1);
                });
            }

            runNext(0);
        });
    });
}

if(process.argv[2] == '--watch'){
    watcher.on('add', function(file){
        console.log('\x1B[33m[components] component ' + file + ' added');

        buildComponent(file, true, function(err1){
            if(err1) {
                console.log('\x1b[31m[components] ' + err1.message);

                process.exit(1);
            }

            console.log('\x1B[32m[components] all components compiled successfully');
        });
    });

    watcher.on('change', function(file){
        console.log('\x1B[33m[components] component ' + file + ' changed');

        buildComponent(file, true, function(err1){
            if(err1) {
                console.log('\x1b[31m[components] ' + err1.message);

                process.exit(1);
            }

            console.log('\x1B[32m[components] all components compiled successfully');
        });
    });

    watcher.on('unlink', function(file){
        console.log('\x1B[33m[components] component ' + file + ' removed');

        var filePath = path.join(outputDir, path.basename(file, '.ejs') + '.js');

        fs.unlink(filePath, function(err1) {
            if(err1) {
                console.log('\x1b[31m[components] ' + err1.message);

                process.exit(1);
            }

            console.log('\x1B[32m[components] all components compiled successfully');
        });
    });
} else {
    initComponents(function(err1){
        if(err1) {
            console.log('\x1b[31m[components] ' + err1.message);

            process.exit(1);
        }

        console.log('\x1B[32m[components] all components compiled successfully');

        process.exit(0);
    });
}