/* ------------------------------------------------------------------
* node-bravia-ip-control-simple - bravia-ip-control-simple.js
*
* Copyright (c) 2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-07-16
* ---------------------------------------------------------------- */
'use strict';
const mDnsSd = require('node-dns-sd');

/* ------------------------------------------------------------------
* Constructor: Bravia()
* ---------------------------------------------------------------- */
const BraviaIpControlSimple = function () {
	// Public
	this.BraviaDevice = require('./bravia-ip-control-simple-device.js');

	// Provate
	this._DNSSD_SERVICE_NAME = '_googlecast._tcp.local';
};

/* ------------------------------------------------------------------
* discover(params)
* - Start to scan BRAVIAs in the local network
*
* [Arguments]
* - params  | Object  | Optional |
*   - quick | Boolean | Optional | If true, this method returns immediately
*           |         |          | after a device was found ignoring
*           |         |          | the value of the wait.
*           |         |          | The default value is false.
*   - wait  | Integer | Optional | Wait time of the discovery process. 
*           |         |          | The unit is second.
*           |         |          | The value must be between 1 and 10.
*           |         |          | The default value is 3.
*
* [Return value]
* - A promise object
*
* A list of `BraviaDevice` object will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimple.prototype.discover = function (params) {
	let promise = new Promise((resolve, reject) => {
		let quick = false;
		let wait = 3;
		if (params) {
			if (typeof (params) !== 'object') {
				reject(new Error('The `params` must be an object.'));
				return;
			}
			if (`quick` in params) {
				quick = params['quick'];
				if (typeof (quick) !== 'boolean') {
					reject(new Error('The `quick` must be `true` or `false`'));
					return;
				}
			}
			if (`wait` in params) {
				wait = params['wait'];
				if (typeof (w) !== 'number' || w < 1 || w > 10) {
					reject(new Error('The `wait` must be an integer in the range of 1 to 10.'));
					return;
				}
			}
		}

		mDnsSd.discover({
			name: this._DNSSD_SERVICE_NAME,
			key: 'fqdn',
			quick: quick,
			wait: wait,
			filter: (d) => {
				return (/BRAVIA/.test(d['fqdn']) || /BRAVIA/.test(d['modeName']));
			}
		}).then((list) => {
			let devs = {};
			list.forEach((d) => {
				let adr = d['address'];
				if (!devs[adr]) {
					let dev = new this.BraviaDevice({
						address: adr,
						model: d['familyName']
					});
					devs[adr] = dev;
				}
			});
			let dev_list = [];
			for (let adr in devs) {
				dev_list.push(devs[adr]);
			}
			resolve(dev_list);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

module.exports = new BraviaIpControlSimple();
