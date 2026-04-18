// via ( https://github.com/electron-userland/electron-builder/issues/4785#issuecomment-918243380 )

import util from "node:util";
import { exec as childProcessExec } from "node:child_process";

const exec = util.promisify(childProcessExec);


const OwnerName = `"Open Source Developer, Eric Higginson"`;
const TimeStampServer = `http://time.certum.pl/`;

type SignConfig = {
	path: string;
	hash: string;
}

async function doSign(file: string, hash: string, owner: string): Promise<void> {
	const Debug = (process.env.CERT_DEBUG && process.env.CERT_DEBUG === `true`) || false;
	const Verbose = (process.env.CERT_VERBOSE && process.env.CERT_VERBOSE === `true`) || false;
	const sha256 = hash === `sha256`;
	const appendCert = sha256 ? `/as` : null;
	const timestamp = sha256 ? `/tr` : `/t`;
	const appendTd = sha256 ? `/td sha256` : null;
	const debug = Debug ? `/debug` : null;

	const args = [
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
	];

	const { stdout } = await exec(args.filter(Boolean).join(` `));
	if (Verbose) {
		console.log(stdout);
	}
}

export default async function (config: SignConfig): Promise<void> {
	const Skip = (process.env.CERT_SKIP && process.env.CERT_SKIP === `true`) || false;
	if (!Skip) {
		console.info(`Signing ${config.path} with ${config.hash} to ${OwnerName}`);
		await doSign(config.path, config.hash, OwnerName);
	}
}