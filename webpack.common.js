const ExtractTextPlugin = require("extract-text-webpack-plugin");

const extractScss = new ExtractTextPlugin({
    filename: "condensedinlinepanel.css"
});

module.exports = {
    entry: "./condensedinlinepanel/static/condensedinlinepanel/src/condensedinlinepanel.tsx",
    output: {
        libraryTarget: "var",
        library: "CondensedInlinePanel",
        filename: "condensedinlinepanel.bundle.js",
        path: __dirname + "/condensedinlinepanel/static/condensedinlinepanel/dist"
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js"]
    },

    module: {
        rules: [
            {
                enforce: "pre",
                test: /\.tsx?$/,
                exclude: ["node_modules"],
                use: ["ts-loader", "source-map-loader"]
            },
            {
                test: /\.scss$/,
                use: extractScss.extract({
                    use: [
                        {
                            loader: "css-loader"
                        },
                        {
                            loader: "sass-loader"
                        }
                    ],
                })
            },
        ]
    },

    plugins: [
        extractScss,
    ],
};
