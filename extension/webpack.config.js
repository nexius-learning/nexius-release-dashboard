const path = require('path')
const fs = require('fs')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    target: 'web',
    entry: { dashboard: './src/dashboard/Dashboard', settings: './src/settings/Settings' },
    output: {
        filename: '[name]/[name].js',
        publicPath: '/dist/',
    },
    devtool: 'inline-source-map',
    devServer: {
        port: 3000,
        server: 'https',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            'azure-devops-extension-sdk': path.resolve('node_modules/azure-devops-extension-sdk'),
            // azure-devops-extension-api v5 added an "exports" map listing only the package root and
            // one entry per API area, which stops Common/RestClientBase — the base class our custom
            // Approvals client extends — from resolving. The file still ships unchanged and is still
            // what every generated client derives from; only its subpath export is missing. Point at
            // the CommonJS build so it stays a single copy alongside the rest of the package, which
            // resolves through the "require" condition because ts-loader emits AMD.
            // Upstream: https://github.com/microsoft/azure-devops-extension-api/issues/210 — remove
            // this alias once that exports entry ships.
            'azure-devops-extension-api/Common/RestClientBase': path.resolve(
                'node_modules/azure-devops-extension-api/Common/RestClientBase.js'
            ),
        },
    },
    stats: {
        warnings: false,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                type: 'asset/inline',
            },
            {
                test: /\.html$/,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [new CopyWebpackPlugin([{ from: '**/*.html', context: 'src' }])],
}
