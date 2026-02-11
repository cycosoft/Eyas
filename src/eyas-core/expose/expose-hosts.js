'use strict';

const IP = `127.0.0.1`;
const autoAddedHosts = new Set();

function getHostile() {
	return require(`hostile`);
}

function addHostEntry(hostname, hostileImpl) {
	const h = hostileImpl || getHostile();
	try {
		h.set(IP, hostname);
		autoAddedHosts.add(hostname);
	} catch (err) {
		console.error(`expose-hosts: add failed for ${hostname}:`, err.message);
	}
}

function removeHostEntry(hostname, hostileImpl) {
	const h = hostileImpl || getHostile();
	try {
		h.remove(IP, hostname);
		autoAddedHosts.delete(hostname);
	} catch (err) {
		console.error(`expose-hosts: remove failed for ${hostname}:`, err.message);
	}
}

function removeAutoAdded(hostileImpl) {
	const h = hostileImpl || getHostile();
	for (const hostname of autoAddedHosts) {
		try {
			h.remove(IP, hostname);
		} catch (err) {
			console.error(`expose-hosts: remove failed for ${hostname}:`, err.message);
		}
	}
	autoAddedHosts.clear();
}

function wasAutoAdded(hostname) {
	return autoAddedHosts.has(hostname);
}

module.exports = {
	addHostEntry,
	removeHostEntry,
	removeAutoAdded,
	wasAutoAdded
};
