/*jshint expr: true*/

var path = require('path');
var fs = require('fs');
// var mocha = require('mocha');
var chai = require('chai');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var rm_rf = require('rimraf');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var Plugin = require('../index.js');
var expect = chai.expect;

var OUTPUT_DIR = path.join(__dirname, '../tmp');


function expectOutput(args, done) {
    if (!args.config) {
        throw new Error('Expected args.config');
    }
    if (!args.expected) {
        throw new Error('Expected args.expected');
    }
    if (!done) {
        throw new Error('Expected done');
    }

    var webpackConfig  = args.config;
    var expectedResult = args.expected;
    var outputFile     = args.outputFile;

    // Create output folder
    mkdirp(OUTPUT_DIR, function(err) {
        expect(err).to.be.null;

        outputFile = outputFile || 'webpack-assets.json';

        webpack(webpackConfig, function(err, stats) {
            expect(err).to.be.null;
            expect(stats.hasErrors()).to.be.false;

            var content = fs.readFileSync(path.join(OUTPUT_DIR, outputFile)).toString();

            if (_.isRegExp(expectedResult)) {
                expect(content).to.match(expectedResult);
            } else if(_.isString(expectedResult)) {
                expect(content).to.contain(expectedResult);
            } else {
                // JSON object provided
                var actual = JSON.parse(content);
                expect(actual).to.eql(expectedResult);
            }

            done();
        });

    });
}

describe('Plugin', function() {

    beforeEach(function(done) {
        rm_rf(OUTPUT_DIR, done);
    });

    it('generates a default file for a single entry point', function(done) {
        var webpackConfig = {
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: 'index-bundle.js'
            },
            plugins: [new Plugin({
                path: 'tmp'
            })]
        };

        var expected = {
            main: {
                js: 'index-bundle.js'
            }
        };
        expected = JSON.stringify(expected);

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('generates a default file with multiple entry points', function(done) {
        var webpackConfig = {
            entry: {
                one: path.join(__dirname, 'fixtures/one.js'),
                two: path.join(__dirname, 'fixtures/two.js')
            },
            output: {
                path: OUTPUT_DIR,
                filename: '[name]-bundle.js'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = {
            one: {
                js: 'one-bundle.js'
            },
            two: {
                js: 'two-bundle.js'
            }
        };

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('allows you to specify your own filename', function(done) {

        var webpackConfig = {
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: 'index-bundle.js'
            },
            plugins: [new Plugin({
                filename: 'foo.json',
                path: 'tmp'
            })]
        };

        var expected = {
            main: {
                js: 'index-bundle.js'
            }
        };

        var args = {
            config: webpackConfig,
            expected: expected,
            outputFile: 'foo.json'
        };

        expectOutput(args, done);
    });

    it('works with source maps', function(done) {

        var webpackConfig = {
            devtool: 'sourcemap',
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: 'index-bundle.js'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = {
            main: {
                js: 'index-bundle.js',
                jsSourceMap: 'index-bundle.js.map'
            }
        };

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('works with source maps and hash', function(done) {
        var webpackConfig = {
            devtool: 'sourcemap',
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: 'index-bundle-[hash].js'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = /{"main":{"js":"index-bundle-[0-9a-f]+\.js","jsSourceMap":"index-bundle-[0-9a-f]+\.js\.map"}}/;

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('handles hashes in bundle filenames', function(done) {

        var webpackConfig = {
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: 'index-bundle-[hash].js'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = /{"main":{"js":"index-bundle-[0-9a-f]+\.js"}}/;

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('handles hashes in a different position', function(done) {

        var webpackConfig = {
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                filename: '[name].js?[hash]'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = /{"main":{"js":"main\.js\?[0-9a-f]+"}}/;

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('works with ExtractTextPlugin for stylesheets', function(done) {

        var webpackConfig = {
            entry: {
                one: path.join(__dirname, 'fixtures/one.js'),
                two: path.join(__dirname, 'fixtures/two.js'),
                styles: path.join(__dirname, 'fixtures/styles.js')
            },
            output: {
                path: OUTPUT_DIR,
                filename: '[name]-bundle.js'
            },
            module: {
                loaders: [
                {test: /\.css$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader')}
                ]
            },
            plugins: [
                new ExtractTextPlugin('[name]-bundle.css', {allChunks: true}),
                new Plugin({
                    path: 'tmp'
                })
            ]
        };

        var expected = {
            one: {
                js: "one-bundle.js"
            },
            two: {
                js: "two-bundle.js"
            },
            styles: {
                js:  "styles-bundle.js",
                css: "styles-bundle.css"
            }
        };

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it.skip('generates a default file with multiple compilers', function(done) {
        var webpackConfig = [
            {
                entry: {
                    one: path.join(__dirname, 'fixtures/one.js')
                },
                output: {
                    path: OUTPUT_DIR,
                    filename: 'one-bundle.js'
                },
                plugins: [new Plugin({
                    multiCompiler: true,
                    path: 'tmp'
                })]
            },
            {
                entry: {
                    two: path.join(__dirname, 'fixtures/two.js')
                },
                output: {
                    path: OUTPUT_DIR,
                    filename: 'two-bundle.js'
                },
                plugins: [new Plugin({
                    multiCompiler: true,
                    path: 'tmp'
                })]
            }
        ];

        var expected = {
            one: {
                js: "one-bundle.js"
            },
            two: {
                js: "two-bundle.js"
            }
        };

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('includes full publicPath', function(done) {

        var webpackConfig = {
            entry: path.join(__dirname, 'fixtures/one.js'),
            output: {
                path: OUTPUT_DIR,
                publicPath: '/public/path/[hash]/',
                filename: 'index-bundle.js'
            },
            plugins: [new Plugin({path: 'tmp'})]
        };

        var expected = new RegExp('/public/path/[0-9a-f]+/index-bundle.js', 'i');

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);
    });

    it('works with CommonChunksPlugin', function (done) {
        var webpackConfig = {
            entry: {
                one: path.join(__dirname, 'fixtures/common-chunks/one.js'),
                two: path.join(__dirname, 'fixtures/common-chunks/two.js')
            },
            output: {
                path: OUTPUT_DIR,
                filename: '[name].js'
            },
            plugins: [
                new webpack.optimize.CommonsChunkPlugin({name: "common"}),
                new Plugin({path: 'tmp'})
            ]
        };

        var expected = {
            one: {js: 'one.js'},
            two: {js: 'two.js'},
            common: {js: 'common.js'}
        };

        var args = {
            config: webpackConfig,
            expected: expected
        };

        expectOutput(args, done);

    });

});
