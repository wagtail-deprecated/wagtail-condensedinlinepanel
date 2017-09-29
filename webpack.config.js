module.exports = {
    entry: "./condensedinlinepanel/static/condensedinlinepanel/src/condensedinlinepanel.tsx",
    output: {
        libraryTarget: "var",
        library: "CondensedInlinePanel",
        filename: "condensedinlinepanel.bundle.js",
        path: __dirname + "/condensedinlinepanel/static/condensedinlinepanel/dist"
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

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
        ]
    },
};
