/* ------------------------------------------------------------------
* node-bravia-ip-control-simple - bravia-ip-control-simple-packet.js
*
* Copyright (c) 2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-07-16
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* BraviaIpControlSimplePacket()
* - Constructor
*
* [Arguments]
* - none
* ---------------------------------------------------------------- */
const BraviaIpControlSimplePacket = function () {

};

/* ------------------------------------------------------------------
* create(p)
* - Create a Buffer object for a request
*
* [Arguments]
* - p            | Object | Required |
*   - type       | String | Required | "C": Control, "E": Enquiry
*   - command    | String | Required | Command name
*                |        |          | Exactly 4 upper case characters. (e.g., "POWR")
*   - parameters | String | Optional | Parameter data
*                |        |          | Exactly 16 characters. (e.g., "auto24pSync#####")
*
* [Return value]
* - A Buffer object
* - If the specified parameters were invalid, this method throws
*   an exeption.
* ---------------------------------------------------------------- */
BraviaIpControlSimplePacket.prototype.create = function (p) {
	// Header
	let hdr = Buffer.from([0x2A, 0x53]);
	// Message Type
	let typ = null;
	if (p['type'] === 'C') {
		typ = Buffer.from([0x43]);
	} else if (p['type'] === 'E') {
		typ = Buffer.from([0x45]);
	} else {
		throw new Error('The `type` must be "C" or "E".');
	}
	// Command
	if (typeof (p['command']) !== 'string' || !/^[A-Z]{4}$/.test(p['command'])) {
		throw new Error('The `command` must be exactly 4 upper case characters.');
	}
	let cmd = Buffer.from(p['command'], 'utf8');
	// Parameters
	let pstr = '################';
	if ('parameters' in p) {
		pstr = p['parameters'];
		if (typeof (pstr) !== 'string' || pstr.length !== 16 || /[^a-zA-Z0-9\#]/.test(pstr)) {
			throw new Error('The `parameters` must be exactly 16 alphabets.');
		}
	}
	let prm = Buffer.from(pstr, 'utf8');
	// Footer
	let ftr = Buffer.from([0x0A]);

	let buf = Buffer.concat([hdr, typ, cmd, prm, ftr]);
	return buf;
};

/* ------------------------------------------------------------------
* parse(buf)
* - Parse a Buffer object representing an incoming packet
*
* [Arguments]
* - buf          | Buffer | Required | Buffer object representing an incoming packet
*
* [Return value]
* - A parsed data object
* - If the specified Buffer object failed to be parsed , this method
*   returns `null`.
* ---------------------------------------------------------------- */
BraviaIpControlSimplePacket.prototype.parse = function (buf) {
	// Check the byte length
	if (buf.length !== 24) {
		return null;
	}
	// Check the header
	let hdr1 = buf.readUInt8(0);
	let hdr2 = buf.readUInt8(1);
	if (hdr1 !== 0x2A || hdr2 !== 0x53) {
		return null;
	}
	// Check the footer
	let ftr = buf.readUInt8(23);
	if (ftr !== 0x0A) {
		return null;
	}
	// Message Type
	let typ = buf.readUInt8(2);
	let type = '';
	if (typ === 0x43) {
		type = 'C'; // Control
	} else if (typ === 0x45) {
		type = 'E'; // Encuiry
	} else if (typ === 0x41) {
		type = 'A'; // Answer
	} else if (typ === 0x4E) {
		type = 'N'; // Notify
	} else {
		return null;
	}
	// Command
	let command = buf.slice(3, 7).toString('utf8');
	// Parameters
	let parameters = buf.slice(7, 23).toString('utf8');

	let parsed = {
		type: type,
		command: command,
		parameters: parameters
	};
	return parsed;
};

module.exports = new BraviaIpControlSimplePacket();