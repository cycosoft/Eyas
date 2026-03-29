// export the config for the project
module.exports = {
	source: `demo`,

	domains: [
		{ url: `dev.eyas.cycosoft.com`, title: `Development`, key: `dev.` },
		{ url: `staging.eyas.cycosoft.com`, title: `Staging`, key: `staging.` },
		{ url: `eyas.cycosoft.com`, title: `Production` }
	],

	title: `Eyas App Demo`,

	// version: ``,

	viewports: [
		{ label: `Custom Size`, width: 1024, height: 768 }
	],

	links: [
		{ label: `Eyas Home`, url: `/` },
		{ label: `Environments Demo`, url: `/demo/environments` },
		{ label: `Dynamic Vars Demo`, url: `{_env.url}/demo/links?id={int}&msg={str}&go={bool}&theme={dark|light|}` },
		{ label: `Custom Auth Link`, url: `https://{_env.key}auth.eyas.cycosoft.com` },
		{ label: `External Browser Test`, url: `https://cycosoft.com`, external: true },
		{ label: `Upload Progress Demo`, url: `https://tus.io/demo` }
	],

	// defaults to current platform
	outputs: {
		// expires: 720
	}
};
