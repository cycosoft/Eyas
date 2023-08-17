//imports
const path = require(`path`);
const TerserPlugin = require('terser-webpack-plugin');

//output the config to webpack
module.exports = {
	mode: `production`,
	target: `electron-main`,

	//the main file that runs the application
	entry: `./src/index.js`,

	//where to put the built files
	output: {
		path: path.resolve(__dirname),
		filename: `eyas-dist.js`
	},

	stats: {
		//give more detauls on build warnings/errors
		errorDetails: true
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
