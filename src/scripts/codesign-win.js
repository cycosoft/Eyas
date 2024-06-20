// via ( https://github.com/electron-userland/electron-builder/issues/4785#issuecomment-918243380 )

'use strict'

const util = require(`util`)
const exec = util.promisify(require(`child_process`).exec)

const OwnerName = process.env.CERT_OWNERNAME || `"Open Source Developer, Eric Higginson"`
const TimeStampServer = process.env.CERT_TIMESTAMPSERVER || `http://time.certum.pl/`
const Verbose = (process.env.CERT_VERBOSE && process.env.CERT_VERBOSE === `true`) || false
const Debug = (process.env.CERT_DEBUG && process.env.CERT_DEBUG === `true`) || false
const Skip = (process.env.CERT_SKIP && process.env.CERT_SKIP === `true`) || false

async function doSign (file, hash, owner) {
	const sha256 = hash === `sha256`
	const appendCert = sha256 ? `/as` : null
	const timestamp = sha256 ? `/tr` : `/t`
	const appendTd = sha256 ? `/td sha256` : null
	const debug = Debug ? `/debug` : null

	let args = [
		`signtool`,
		`sign`,
		debug,
		`/n`,
		owner,
		`/a`,
		appendCert,
		`/fd`,
		hash,
		timestamp,
		TimeStampServer,
		appendTd,
		`/v`,
		`"${file}"`
	]

	try {
		const { stdout } = await exec(args.join(` `))
		if (Verbose) {
		console.log(stdout)
		}
	} catch (error) {
		throw error
	}
}

exports.default = async function (config) {
	if (!Skip) {
		console.info(`Signing ${config.path} with ${config.hash} to ${OwnerName}`)
		await doSign(config.path, config.hash, OwnerName)
	}
}