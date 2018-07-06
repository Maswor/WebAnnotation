module.exports = {
	mode: 'production',
	entry: {
		app: './app.ts',
		retriever: './retriever.ts'
	},
	output: {
		filename: '[name].js',
		path: `${__dirname}/build`,
		publicPath: '/build/',
	},
	watchOptions: {
		ignored: ['/**/*.js', 'node_modules']
	},

	// Enable sourcemaps for debugging webpack's output.
	devtool: 'source-map',

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: ['.ts', '.js', '.json'],
	},

	module: {
		rules: [{
			test: /\.ts?$/,
			use: 'ts-loader',
			exclude: /node_modules/
		}, ],
	},

	devServer: {
		host: '0.0.0.0',
		port: 8080,
		open: true,
	},

};
