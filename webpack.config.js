//imports
const webpack = require('webpack');
const path = require(`path`);
const TerserPlugin = require('terser-webpack-plugin');

//output the config to webpack
module.exports = {
	mode: `production`,
	target: `electron-renderer`,

	//the main file that runs the application
	entry: {
		eyas: `./src/index.js`
	},

	//where to put the built files
	output: {
		path: path.resolve(__dirname),
		filename: `[name].min.js`
	},

	stats: {
		//give more detauls on build warnings/errors
		errorDetails: true
	},

	// plugins: [
	// 	//add a shebang to the top of the file so script doesn't just open in IDE
	// 	new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true })
	// ],

	//don't bundle these modules
	externals: {
		express: `commonjs express`,
		https: `commonjs https`,
		mkcert: `commonjs mkcert`,
		electron: `commonjs electron`,
		path: `commonjs path`,
		'./eyas.config.js': `commonjs ./eyas.config.js`
	},

	optimization: {
		minimizer: [new TerserPlugin({
			//don't output LICENSE.txt
			extractComments: false,
			terserOptions: {
				format: {
					//remove comments from the output
					comments: false
				}
			}
		})]
	}
};
