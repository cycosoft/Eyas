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
		{ label: `Variable Test`, url: `https://landing.{_env.key}cycosoft.com` },
		{ url: `https://tus.io/demo`, label: `Blob Upload Progress Demo` },
		{ url: `https://blueimp.github.io/jQuery-File-Upload/`, label: `FormData Upload Progress Demo` },
		{ url: `sub.domain.com:44301/`, label: `EYAS-253 Test` },
		{ label: `Options Demo`, url: `https://{dev.|staging.|}cycosoft.com` },
		{ label: `Int Demo`, url: `https://eyas.cycosoft.com?id={int}` },
		{ label: `String Demo`, url: `https://eyas.cycosoft.com?message={str}` },
		{ label: `Boolean Demo`, url: `https://eyas.cycosoft.com?enabled={bool}` },
		{ label: `Test Domain Demo`, url: `{_env.url}?go` },
		{ label: `Test Domain Demo w/Bool`, url: `{_env.url}?enabled={bool}` },
		{ label: `Combo Demo`, url: `https://{_env.key}cycosoft.com?id={int}&message={str}&enabled={bool}` },
		{ label: `Cycosoft.com (browser)`, url: `https://cycosoft.com`, external: true },
		{ label: `Cycosoft.com (electron)`, url: `https://cycosoft.com` },
		{ url: `server` },
		{ url: `https://142.250.217.142` },
		{ url: `142.250.217.142` },
		{ url: `142.250.217.142/` },
		{ url: `142.250.217.142:80` },
		{ url: `142.250.217.142:80/` },
		{ url: `www.test.google.com` },
		{ url: `google.com` },
		{ url: `test.google.com` },
		{ url: `demo.google.com` },
		{ url: `test.google.com/` },
		{ url: `test.google.com:80` },
		{ url: `https://test.google.com` },
		{ url: `https://test.google.com:80` },
		{ url: `https://www.google.com` },
		{ url: `https://www.google.com/` },
		{ url: `https://localhost:3000`, external: false }
	],

	// defaults to current platform
	outputs: {
		// expires: 720
	}
};
