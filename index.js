'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var tpl = require('lodash.template');
var PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-template-compile';

var getNamespaceDeclaration = function(ns) {
    var output = [];
    var curPath = 'window';
    if (ns !== 'window') {
        var nsParts = ns.split('.');
        nsParts.forEach(function(curPart, index) {
            if (curPart !== 'window') {
                curPath += '[' + JSON.stringify(curPart) + ']';
                output.push(curPath + ' = ' + curPath + ' || {};');
            }
        });
    }

    return {
        namespace: curPath,
        declaration: output.join('\n')
    };
};

module.exports = function (options) {
    options = options || {};

    function compiler (file) {
        var name = typeof options.name === 'function' && options.name(file) || file.relative;
        var namespace = getNamespaceDeclaration(options.namespace || 'JST');
        var templateHeader = '(function() {\n' + namespace.declaration;

        var NSwrapper = '\n\n' + namespace.namespace + '["'+ name.replace(/\\/g, '/') +'"] = ';

        var template = tpl(file.contents.toString(), false, options.templateSettings).source;

        return options.proplike ? (name.replace(/\\/g, '/') + ': '+template) : (templateHeader + NSwrapper + template + '})();');
    }

    var stream = through.obj(function (file, enc, callback) {

        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return callback();
        }

        var filePath = file.path;

        try {
            var compiled = compiler(file);

            file.contents = new Buffer(compiled);
            file.path = gutil.replaceExtension(file.path, '.js');
        } catch (err) {
            this.emit('error', new PluginError(PLUGIN_NAME, err, {fileName: filePath}));
            return callback();
        }

        this.push(file);
        callback();
    });

    return stream;
};
