var path = require("path");
var node_modules = path.resolve(__dirname, "node_modules");
const core = require("./webpack.core.js");
const merge = require("webpack-merge");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
var outputDir = "dist";

// From Bloom's webpack, it seems this is needed
// if ever our output directory does not have the same parent as our node_modules. We then
// need to resolve the babel related presets (and plugins).  This mapping function was
// suggested at https://github.com/babel/babel-loader/issues/166.
// Since our node_modules DOES have the same parent, maybe we could do without it?
function localResolve(preset) {
    return Array.isArray(preset)
        ? [require.resolve(preset[0]), preset[1]]
        : require.resolve(preset);
}
module.exports = merge(core, {
    // mode must be set to either "production" or "development" in webpack 4.
    // Webpack-common is intended to be 'required' by something that provides that.
    context: __dirname,
    entry: {
        bloomPlayer: "./src/bloom-player-root.ts"
    },

    output: {
        path: path.join(__dirname, outputDir),
        filename: "[name].js",

        libraryTarget: "window",

        //makes the exports of bloom-player-root.ts accessible via window.BloomPlayer.X,
        // e.g., window.BloomPlayer.BloomPlayerCore.
        library: "BloomPlayer"
    },

    resolve: {
        // For some reason, webpack began to complain about being given minified source.
        // alias: {
        //   "react-dom": pathToReactDom,
        //   react: pathToReact // the point of this is to use the minified version. https://christianalfoni.github.io/react-webpack-cookbook/Optimizing-rebundling.html
        // },
        modules: [".", node_modules],
        extensions: [".js", ".jsx", ".ts", ".tsx"] //We may need to add .less here... otherwise maybe it will ignore them unless they are require()'d
    },

    plugins: [
        // Inserts the script tag for the main JS bundle (in production builds, with a hash
        // in the name) into the template bloomplayer.htm, while copying it to the output.
        new HtmlWebpackPlugin({
            title: "Bloom Player",
            filename: "bloomplayer.htm",
            template: "src/bloomplayer.htm"
        }),
        // Note: CopyPlugin says to use forward slashes.
        // Note: the empty "to" options mean to just go to the output folder, which is "dist/"
        // We're not actually using this any more...keeping in case we resurrect
        // simpleComprehensionQuiz.js.
        new CopyPlugin([
            // These are more-or-less obsolete. If they're needed at all it's for json
            // comprehension questions from pre-4.6 Bloom. If we decide to reinstate this
            // using the same mechanism, we have to uncomment the content of simpleComprehensionQuiz.js
            // and figure out what to do about hashing names.
            // {
            //     from:
            //         "src/activities/legacyQuizHandling/simpleComprehensionQuiz.js",
            //     to: "",
            //     flatten: true
            // },
            // {
            //     from: "src/activities/legacyQuizHandling/Special.css",
            //     to: "",
            //     flatten: true
            // },
        ])
    ],

    optimization: {
        minimize: false,
        namedModules: true,
        splitChunks: {
            cacheGroups: {
                default: false
            }
        }
    },
    module: {
        rules: [
            // Note: typescript handling is imported from webpack.core.js
            {
                // For the most part, we're using typescript and ts-loader handles that.
                // But for things that are still in javascript, the following babel setup allows newer
                // javascript features by compiling to the version JS feature supported by the specific
                // version of FF we currently ship with.
                test: /\.(js|jsx)$/,
                exclude: [
                    // We need babel to transpile parts of swiper (swiper and dom7) because they require JS that GeckofX 45 doesn't support.
                    // We can remove this exception when we are fully in gfx60.
                    // See https://github.com/kidjp85/react-id-swiper/issues/332
                    /node_modules\/(?!(swiper|dom7)\/).*/,
                    /ckeditor/,
                    /jquery-ui/,
                    /-min/,
                    /qtip/,
                    /xregexp-all-min.js/
                ],
                use: [
                    {
                        loader: "babel-loader",
                        query: {
                            presets: [
                                // Target Bloom Desktop's current version of geckofx
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            browsers: [
                                                "last 3 ChromeAndroid versions", // this is kind of bogus, it ignores the number
                                                "Firefox >= 45", // what Bloom Desktop 4.7 needs
                                                ">1%" //don't support if the browser is <= 1% use
                                            ]
                                        }
                                    }
                                ]
                                //"babel-preset-react" this leads to an error if we export from raw .js, and we aren't doing react with js
                            ].map(localResolve)
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                loader: "style-loader!css-loader"
            },
            // WOFF Font--needed?
            {
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: "url-loader",
                    options: {
                        limit: 10000,
                        mimetype: "application/font-woff"
                    }
                }
            },
            {
                // this allows things like background-image: url("myComponentsButton.svg") and have the resulting path look for the svg in the stylesheet's folder
                // the last few seem to be needed for (at least) slick-carousel to build. We're no longer using that, so maybe we could shorten it...
                // it also allows us to import mp3s files and get them copied to output with a hashed name
                // that we can safely put a long cache control time on, because a later version of the player will use a different hash.
                test: /\.(svg|jpg|png|ttf|eot|gif|mp3)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name]-[contenthash].[ext]"
                    }
                }
            }
        ]
    }
});
