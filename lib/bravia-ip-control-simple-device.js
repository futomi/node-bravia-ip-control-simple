/* ------------------------------------------------------------------
* node-bravia-ip-control-simple - bravia-ip-control-simple-device.js
*
* Copyright (c) 2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-07-16
* ---------------------------------------------------------------- */
'use strict';
const mNet = require('net');
const mBraviaPacket = require('./bravia-ip-control-simple-packet.js');

/* ------------------------------------------------------------------
* BraviaIpControlSimpleDevice(params)
* - Constructor
*
* [Arguments]
* - params    | Object | Required |
*   - address | String | Required | IPv4 address
*   - model   | String | Optional | Model name (e.g., "BRAVIA 4K GB KJ-43X8300D")
* ---------------------------------------------------------------- */
const BraviaIpControlSimpleDevice = function (params) {
	if (!params || typeof (params) !== 'object') {
		throw new Error('The `params` must be an object.');
	}

	// Check the `address`
	let addr = params['address'];
	if (!addr) {
		throw new Error('The `address` is required.');
	} else if (typeof (addr) !== 'string') {
		throw new Error('The `address` must be a string.');
	} else {
		let m = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
		if (!m) {
			throw new Error('The `address` must be an IPv4 address.');
		}
		[RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$4].forEach((n) => {
			n = parseInt(n, 10);
			if (n <= 0 || n >= 255) {
				throw new Error('The `address` is invalid ad an IPv4 address.');
			}
		});
	}

	// Check the `model`
	let model = '';
	if ('model' in params) {
		model = params['model'];
		if (typeof (model) !== 'string' || model.length > 100) {
			throw new Error('The length of the `model` must be less than or equal to 100 characters.');
		}
	}

	// Public
	this.address = addr;
	this.model = model;
	this.onclose = null;
	this.onnotify = null;

	// Private
	this._address = addr;
	this._model = model;
	this._tcp = null;
	this._TCP_PORT = 20060;
	this._TCP_RES_TIMEOUT_MSEC = 5000; // msec
	this._tcp_connection_status = 0; // 0: dsconnected, 1: connecting, 2: connected, 3: disconnecting
	this._tcp_connection_closed_intentionally = false;
	this._current_request = null;
	this._onresponse = () => { };
	this._ircc = require('./bravia-ip-control-simple-ircc.json');
};

/* ------------------------------------------------------------------
* connect()
* - Establish a TCP connection with the BRAVIA device.
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.connect = function () {
	let promise = new Promise((resolve, reject) => {
		if (this._tcp_connection_status === 2) {
			resolve();
			return;
		} else if (this._tcp_connection_status === 1) {
			reject(new Error('A TCP connection is now establishing.'));
			return;
		}
		this._tcp = new mNet.Socket();

		let cleanListeners = () => {
			this._tcp.removeAllListeners('connect');
			this._tcp.removeAllListeners('error');
		}

		this._tcp.on('connect', () => {
			cleanListeners();
			this._tcp_connection_status = 2;

			this._tcp.on('data', (buf) => {
				this._receivedData(buf);
			});

			this._tcp.on('close', () => {
				this._closedConnection();
			});

			resolve();
		});
		this._tcp.on('error', (error) => {
			cleanListeners();
			this._destroyConnection(() => {
				reject(error);
			});
		});

		this._tcp_connection_status = 1;
		this._tcp.connect(this._TCP_PORT, this._address);
	});
	return promise;
};

BraviaIpControlSimpleDevice.prototype._closedConnection = function () {
	this._destroyConnection(() => {
		if (this.onclose && typeof (this.onclose) === 'function') {
			this.onclose({
				intentional: this._tcp_connection_closed_intentionally
			});
		}
		this._tcp_connection_closed_intentionally = false;
	});
};

BraviaIpControlSimpleDevice.prototype._receivedData = function (buf) {
	let parsed = mBraviaPacket.parse(buf);
	if (!parsed) {
		return;
	}

	if (parsed['type'] === 'N') {
		if (this.onnotify && typeof (this.onnotify) === 'function') {
			let data = this._createNotifyData(parsed);
			if (data) {
				this.onnotify(data);
			}
		}
	}

	let req = this._current_request;
	if (!req) {
		return;
	}
	if (this._onresponse && typeof (this._onresponse) === 'function') {
		if (req['command'] === parsed['command'] && parsed['type'] === 'A') {
			this._onresponse(parsed);
		}
	}
};

BraviaIpControlSimpleDevice.prototype._createNotifyData = function (parsed) {
	// ----------------------------------------------
	// parsed = {
	//   "type": "N",
	//   "command": "POWR",
	//   "parameters": "0000000000000001"
	// }
	// ----------------------------------------------
	let cmd = parsed['command'];
	let p = parsed['parameters'];
	let res = {
		command: cmd
	};

	if (cmd === 'POWR') {
		if (p === '0000000000000001') {
			res['status'] = true;
			return res;
		} else if (p === '0000000000000000') {
			res['status'] = false;
			return res;
		} else {
			return null;
		}
	} else if (cmd === 'INPT') {
		let type = parseInt(p.substring(7, 8), 10);
		let port = parseInt(p.substring(12), 10);
		if (p === '0000000000000000') {
			res['type'] = '';
			res['port'] = 0;
			return res;
		} else if (type === 1) {
			res['type'] = 'hdmi';
			res['port'] = port;
			return res;
		} else if (type === 4) {
			res['type'] = 'component';
			res['port'] = port;
			return res;
		} else if (type === 5) {
			res['type'] = 'mirroring';
			res['port'] = port;
			return res;
		} else {
			return null;
		}
	} else if (cmd === 'VOLU') {
		if (/^\d+$/.test(p)) {
			res['volume'] = parseInt(p, 10);
			return res;
		} else {
			return null;
		}
	} else if (cmd === 'AMUT') {
		if (p === '0000000000000001') {
			res['status'] = true;
			return res;
		} else if (p === '0000000000000000') {
			res['status'] = false;
			return res;
		} else {
			return null;
		}
	} else if (cmd === 'PMUT') {
		if (p === '0000000000000001') {
			res['status'] = true;
			return res;
		} else if (p === '0000000000000000') {
			res['status'] = false;
			return res;
		} else {
			return null;
		}
	} else {
		return null;
	}
};

/* ------------------------------------------------------------------
* disconnect()
* - Disconnect the TCP connection with the BRAVIA device.
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.disconnect = function () {
	let promise = new Promise((resolve, reject) => {
		if (this._tcp_connection_status === 0) {
			resolve();
			return;
		} else if (this._tcp_connection_status === 1) {
			reject(new Error('A TCP connection is now establishing.'));
			return;
		}

		this._tcp_connection_status = 3;
		let timer = null;
		this._tcp_connection_closed_intentionally = true;

		this._tcp.end(() => {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			setTimeout(() => {
				this._destroyConnection(() => {
					resolve();
				});
			}, 500);
		});

		timer = setTimeout(() => {
			this._destroyConnection(() => {
				resolve();
			});
		}, this._TCP_RES_TIMEOUT_MSEC);
	});
	return promise;
};

BraviaIpControlSimpleDevice.prototype._destroyConnection = function (callback) {
	if (this._tcp) {
		this._tcp.removeAllListeners('data');
		this._tcp.removeAllListeners('close');
		this._tcp.destroy();
		this._tcp.unref();
		this._tcp = null;
	}
	this._tcp_connection_status = 0;
	setTimeout(() => {
		callback();
	}, 500);
};

/* ------------------------------------------------------------------
* getConnectionStatus()
* - Get the status of the TCP connection
*
* [Arguments]
* - None
*
* [Return value]
* - 0: Not connected
* - 1: Now connecting
* - 2: Connected
* - 3: Now disconnecting
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getConnectionStatus = function () {
	return this._tcp_connection_status;
};

/* ------------------------------------------------------------------
* setIrccCode(params)
* - Sends codes like IR commands of remote controlle
*
* [Arguments]
* - params | Object | Required |
*   - name | String | Required | IR command name
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setIrccCode = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let name = '';
		if ('name' in params) {
			name = params['name'];
			if (typeof (name) !== 'string') {
				reject(new Error('The `name` must be a string.'));
				return;
			}
		} else {
			reject(new Error('The `status` is required.'));
			return;
		}

		if (!this._ircc[name]) {
			reject(new Error('The `name` is unknown.'));
			return;
		}

		this._request({
			type: 'C',
			command: 'IRCC',
			parameters: this._ircc[name]
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve();
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getPowerStatus()
* - Get the power status
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true // true: Active (On), false: Standby (Off)
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getPowerStatus = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'POWR'
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve({ status: false });
			} else if (p === '0000000000000001') {
				resolve({ status: true });
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setPowerStatus(params)
* - Set the power status
*
* [Arguments]
* - params   | Object  | Required |
*   - status | Boolean | Required | true: Active (On), false: Standby (Off)
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true // true: Active (On), false: Standby (Off)
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setPowerStatus = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		if ('status' in params) {
			if (typeof (params['status']) !== 'boolean') {
				reject(new Error('The `status` must be true or false.'));
				return;
			}
		} else {
			reject(new Error('The `status` is required.'));
			return;
		}

		let pstr = '';
		if (params['status'] === true) {
			pstr = '0000000000000001';
		} else {
			pstr = '0000000000000000';
		}

		this._request({
			type: 'C',
			command: 'POWR',
			parameters: pstr
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				return this.getPowerStatus();
			} else {
				throw new Error('The device returned an unknown response.');
			}
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* powerOn()
* - Turn on the device
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.powerOn = function () {
	return this.setPowerStatus({ status: true });
};

/* ------------------------------------------------------------------
* powerOff()
* - Turn off the device
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": false
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.powerOff = function () {
	return this.setPowerStatus({ status: false });
};

/* ------------------------------------------------------------------
* togglePowerStatus()
* - Toggle the power status
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true // true: Active (On), false: Standby (Off)
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.togglePowerStatus = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'C',
			command: 'TPOW'
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				return this.getPowerStatus();
			} else {
				throw new Error('The device returned an unknown response.');
			}
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getAudioVolume()
* - Get the volume
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "volume": 20
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getAudioVolume = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'VOLU'
		}).then((res) => {
			let p = res['parameters'];
			let vol = parseInt(p, 10);
			resolve({
				volume: vol
			});
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setAudioVolume(params)
* - Set the volume
*
* [Arguments]
* - params   | Object  | Required |
*   - volume | Integer | Required | 0 - 100
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "volume": 20
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setAudioVolume = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let vol = 0;
		if ('volume' in params) {
			vol = params['volume'];
			if (typeof (vol) !== 'number' || vol % 1 > 0 || vol < 0 || vol > 100) {
				reject(new Error('The `volume` must be an integer between 0 and 100.'));
				return;
			}
		} else {
			reject(new Error('The `volume` is required.'));
			return;
		}

		this._request({
			type: 'C',
			command: 'VOLU',
			parameters: ('0000000000000000' + vol.toString()).slice(-16)
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				return this.getAudioVolume();
			} else {
				throw new Error('The device returned an unknown response.');
			}
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* volumeUp(params)
* - Increment the volume level by the specified steps
*
* [Arguments]
* - params  | Object  | Optional |
*   - step  | Integer | Optional | 1 - 100 (Default: 1)
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "volume": 20
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.volumeUp = function (params) {
	let promise = new Promise((resolve, reject) => {
		let step = 1;
		if (params) {
			if (typeof (params) !== 'object') {
				reject(new Error('The `params` must be an object.'));
				return;
			}
			if ('step' in params) {
				step = params['step'];
				if (typeof (step) !== 'number' || step % 1 > 0 || step < 1 || step > 100) {
					reject(new Error('The `step` must be an integer between 1 and 100.'));
					return;
				}
			}
		}

		this.getAudioVolume().then((res) => {
			let vol = res['volume'] + step;
			if (vol > 100) {
				vol = 100;
			}
			return this.setAudioVolume({ volume: vol });
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* volumeDown(params)
* - Decrement the volume level by the specified steps
*
* [Arguments]
* - params   | Object  | Optional |
*   - steps  | Integer | Optional | 1 - 100 (Default: 1)
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "volume": 20
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.volumeDown = function (params) {
	let promise = new Promise((resolve, reject) => {
		let step = 1;
		if (params) {
			if (typeof (params) !== 'object') {
				reject(new Error('The `params` must be an object.'));
				return;
			}
			if ('step' in params) {
				step = params['step'];
				if (typeof (step) !== 'number' || step % 1 > 0 || step < 1 || step > 100) {
					reject(new Error('The `step` must be an integer between 1 and 100.'));
					return;
				}
			}
		}

		this.getAudioVolume().then((res) => {
			let vol = res['volume'] - step;
			if (vol <= 0) {
				vol = 0;
			}
			return this.setAudioVolume({ volume: vol });
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getAudioMute()
* - Retrieve the audio mute status
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getAudioMute = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'AMUT'
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve({ status: false });
			} else if (p === '0000000000000001') {
				resolve({ status: true });
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setAudioMute(params)
* - Set the audio mute status
*
* [Arguments]
* - params   | Object  | Required |
*   - status | Boolean | Required | true: Mute, false: Unmute
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setAudioMute = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		if ('status' in params) {
			if (typeof (params['status']) !== 'boolean') {
				reject(new Error('The `status` must be true or false.'));
				return;
			}
		} else {
			reject(new Error('The `status` is required.'));
			return;
		}

		let pstr = '';
		if (params['status'] === true) {
			pstr = '0000000000000001';
		} else {
			pstr = '0000000000000000';
		}

		this._request({
			type: 'C',
			command: 'AMUT',
			parameters: pstr
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve();
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* muteAudio()
* - Mute
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.muteAudio = function () {
	return this.setAudioMute({ status: true });
};

/* ------------------------------------------------------------------
* unmuteAudio()
* - Unmute
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.unmuteAudio = function () {
	return this.setAudioMute({ status: false });
};

/* ------------------------------------------------------------------
* getInput()
* - Get current input
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "type": "hdmi",
*   "port": 1
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getInput = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'INPT',
			ignore_error: true
		}).then((res) => {
			let p = res['parameters'];
			let type = parseInt(p.substring(7, 8), 10);
			let port = parseInt(p.substring(12), 10);
			if (p === '0000000000000000' || p === 'FFFFFFFFFFFFFFFF') {
				resolve({ type: '', port: 0 });
			} else if (type === 1) {
				resolve({ type: 'hdmi', port: port });
			} else if (type === 4) {
				resolve({ type: 'component', port: port });
			} else if (type === 5) {
				resolve({ type: 'mirroring', port: port });
			} else {
				reject(new Error('The device returned an unknown response: ' + p));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setInput(params)
* - Change the external input 
*
* [Arguments]
* - params   | Object  | Required |
*   - type   | String  | Required | "hdmi", "component", or "mirroring"
*   - port   | Integer | Required | 1 - 9999
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setInput = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let type = '';
		if ('type' in params) {
			type = params['type'];
			if (typeof (type) !== 'string' || !/^(hdmi|component|mirroring)$/.test(type)) {
				reject(new Error('The `type` must be "hdmi", "component", or "mirroring".'));
				return;
			}
		} else {
			reject(new Error('The `type` is required.'));
			return;
		}

		let port = 0;
		if ('port' in params) {
			port = params['port'];
			if (typeof (port) !== 'number' || port % 1 > 0 || port < 1 || port > 9999) {
				reject(new Error('The `port` must be an integer between 1 and 9999.'));
				return;
			}
		} else {
			reject(new Error('The `port` is required.'));
			return;
		}

		let pstr = '';
		type = type.toLowerCase();
		if (type === 'hdmi') {
			pstr = '000000010000';
		} else if (type === 'component') {
			pstr = '000000040000';
		} else if (type === 'mirroring') {
			pstr = '000000050000';
		}
		pstr += ('0000' + port).slice(-4);

		this._request({
			type: 'C',
			command: 'INPT',
			parameters: pstr
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve({ type: type, port: port });
			} else if (p === 'NNNNNNNNNNNNNNNN') {
				resolve({ type: '', port: 0 });
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getPictureMute()
* - Get the status of the picture mute
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getPictureMute = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'PMUT'
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve({ status: false });
			} else if (p === '0000000000000001') {
				resolve({ status: true });
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setPictureMute(params)
* - Set the power status
*
* [Arguments]
* - params   | Object  | Required |
*   - status | Boolean | Required | true: Turn the screen black (picture mute)
*            |         |          | false: Disable the picture mute state
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setPictureMute = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		if ('status' in params) {
			if (typeof (params['status']) !== 'boolean') {
				reject(new Error('The `status` must be true or false.'));
				return;
			}
		} else {
			reject(new Error('The `status` is required.'));
			return;
		}

		let pstr = '';
		if (params['status'] === true) {
			pstr = '0000000000000001';
		} else {
			pstr = '0000000000000000';
		}

		this._request({
			type: 'C',
			command: 'PMUT',
			parameters: pstr
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve();
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* togglePictureMute()
* - Toggle the picture mode
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "status": true
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.togglePictureMute = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'C',
			command: 'TPMU'
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				return this._wait(4000);
			} else {
				throw new Error('The device returned an unknown response.');
			}
		}).then(() => {
			return this.getPictureMute();
		}).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

BraviaIpControlSimpleDevice.prototype._wait = function (msec) {
	let promise = new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, msec);
	});
	return promise;
};

/* ------------------------------------------------------------------
* mutePicture()
* - Mute picture
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.mutePicture = function () {
	return this.setPictureMute({ status: true });
};

/* ------------------------------------------------------------------
* unmutePicture()
* - Unmute picture
*
* [Arguments]
* - None
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.unmutePicture = function () {
	return this.setPictureMute({ status: false });
};

/* ------------------------------------------------------------------
* getBroadcastAddress()
* - Retrieve the broadcast IPv4 address of the specified interface
*
* [Arguments]
* - params  | Object  | Required |
*   - netif | String  | Required | "eth0", "wlan0"
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "bcAddrV4": "192.168.11.255"
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getBroadcastAddress = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let netif = '';
		if ('netif' in params) {
			netif = params['netif'];
			if (typeof (netif) !== 'string' || netif.length > 16) {
				reject(new Error('The `netif` must be a string.'));
				return;
			}
		} else {
			reject(new Error('The `netif` is required.'));
			return;
		}

		this._request({
			type: 'E',
			command: 'BADR',
			parameters: (netif + '################').slice(0, 16)
		}).then((res) => {
			let p = res['parameters'];
			p = p.replace(/\#/g, '');
			resolve({
				bcAddrV4: p
			});
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getMacAddress()
* - Retrieve the MAC address of the specified interface
*
* [Arguments]
* - params  | Object  | Required |
*   - netif | String  | Required | "eth0", "wlan0"
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "hwAddr": "10-4F-A8-BA-2A-EB"
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getMacAddress = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let netif = '';
		if ('netif' in params) {
			netif = params['netif'];
			if (typeof (netif) !== 'string' || netif.length > 16) {
				reject(new Error('The `netif` must be a string.'));
				return;
			}
		} else {
			reject(new Error('The `netif` is required.'));
			return;
		}

		this._request({
			type: 'E',
			command: 'MADR',
			parameters: (netif + '################').slice(0, 16)
		}).then((res) => {
			let p = res['parameters'];
			p = p.replace(/\#/g, '');
			let mac = p.replace(/([A-F\d]{2})/g, '$1-').replace(/\-$/, '');
			resolve({
				hwAddr: mac
			});
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* getSceneSetting()
* - Retrieve the current Scene Setting
*
* [Arguments]
* - none
*
* [Return value]
* - A promise object
*
* The object blow will be passed to the resolve() function. 
*
* {
*   "value": "general"
* }
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.getSceneSetting = function () {
	let promise = new Promise((resolve, reject) => {
		this._request({
			type: 'E',
			command: 'SCEN'
		}).then((res) => {
			let p = res['parameters'];
			if (p === 'NNNNNNNNNNNNNNNN') {
				resolve({
					value: ''
				});
			} else {
				p = p.replace(/\#/g, '');
				resolve({
					value: p
				});
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* setSceneSetting(params)
* - Set the current Scene Setting
*
* [Arguments]
* - params    | Object | Required |
*   - value   | String | Required | "auto", "auto24pSync", or "general"
*
* [Return value]
* - A promise object
*
* Nothing will be passed to the resolve() function. 
* ---------------------------------------------------------------- */
BraviaIpControlSimpleDevice.prototype.setSceneSetting = function (params) {
	let promise = new Promise((resolve, reject) => {
		if (!params || typeof (params) !== 'object') {
			reject(new Error('The `params` must be an object.'));
			return;
		}
		let value = '';
		if ('value' in params) {
			value = params['value'];
			if (typeof (value) !== 'string' || !/^(auto|auto24pSync|general)$/.test(value)) {
				reject(new Error('The `value` must be true or false.'));
				return;
			}
		} else {
			reject(new Error('The `value` is required.'));
			return;
		}

		this._request({
			type: 'C',
			command: 'SCEN',
			parameters: (value + '################').slice(0, 16)
		}).then((res) => {
			let p = res['parameters'];
			if (p === '0000000000000000') {
				resolve({
					value: value
				});
			} else if (p === 'NNNNNNNNNNNNNNNN') {
				resolve({
					value: ''
				});
			} else {
				reject(new Error('The device returned an unknown response.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

BraviaIpControlSimpleDevice.prototype._request = function (p) {
	let promise = new Promise((resolve, reject) => {
		if (this._tcp_connection_status !== 2) {
			reject(new Error('The TCP connection has not been established.'));
			return;
		}

		let req_buf = null;
		try {
			req_buf = mBraviaPacket.create(p);
		} catch (e) {
			reject(e);
			return;
		}

		let timer = null;
		this._current_request = p;

		this._onresponse = (res) => {
			this._onresponse = () => { };
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			this._current_request = null;
			if (res['parameters'] === 'FFFFFFFFFFFFFFFF') {
				if (p['ignore_error']) {
					resolve(res);
				} else {
					reject(new Error('The device returned an error.'));
				}
			} else {
				resolve(res);
			}
		};

		let wrote = this._tcp.write(req_buf);
		if (!wrote) {
			this._onresponse = () => { };
			this._current_request = null;
			reject(new Error('The entire data was not flushed successfully to the kernel buffer.'));
		}

		timer = setTimeout(() => {
			this._onresponse = () => { };
			this._current_request = null;
			reject('TIMEOUT');
		}, this._TCP_RES_TIMEOUT_MSEC);
	});
	return promise;
};

module.exports = BraviaIpControlSimpleDevice;
