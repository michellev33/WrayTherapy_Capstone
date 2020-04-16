module.exports = {
    mode: "development", // vs. "production"
    entry: './src/game/launch.ts',
    output: {
        filename: 'bundle.js',
        path: __dirname
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    devServer: {
        compress: true,
        inline: true,
        host: '0.0.0.0',
        port: '8080',
        allowedHosts: ['.amazonaws.com', 'localhost']
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    }
};
