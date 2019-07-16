node-bravia-ip-control-simple
===============

The node-bravia-ip-control-simple is a Node.js module which is a pure javascript implementation of the [Simple IP Control](https://pro-bravia.sony.net/develop/integrate/ssip/overview/index.html) for SONY BRAVIA Professional Displays.

The Simple IP Control is a TCP based low level (binary) protocol. You can control BRAVIA Professional Displays in local network easily using this module.

## Dependencies

* [Node.js](https://nodejs.org/en/) 10 +
* [node-dns-sd](https://github.com/futomi/node-dns-sd) 0.4.0 +

## Installation

```
$ cd ~
$ npm install node-dns-sd
$ npm install node-bravia-ip-control-simple
```

---------------------------------------
## Table of Contents

* [Setting BRAVIA](#Setting-BRAVIA)
* [Quick Start](#Quick-Start)
  * [Find BRAVIA](#Quick-Start-1)
  * [Retrieve status](#Quick-Start-2)
  * [Control status](#Quick-Start-3)
  * [Monitor events](#Quick-Start-4)
* [`BraviaIpControlSimple` object](#BraviaIpControlSimple-object)
  * [`discover()` method](#BraviaIpControlSimple-discover-method)
* [`BraviaIpControlSimpleDevice` object](#BraviaIpControlSimpleDevice-object)
  * [Properties](#BraviaIpControlSimpleDevice-properties)
  * [`connect()` method](#BraviaIpControlSimpleDevice-connect-method)
  * [`disconnect()` method](#BraviaIpControlSimpleDevice-disconnect-method)
  * [`getConnectionStatus`](#BraviaIpControlSimpleDevice-getConnectionStatus-method)
  * [`setIrccCode()` method](#BraviaIpControlSimpleDevice-setIrccCode-method)
  * [`getPowerStatus()` method](#BraviaIpControlSimpleDevice-getPowerStatus-method)
  * [`setPowerStatus()` method](#BraviaIpControlSimpleDevice-setPowerStatus-method)
  * [`powerOn()` method](#BraviaIpControlSimpleDevice-powerOn-method)
  * [`powerOff()` method](#BraviaIpControlSimpleDevice-powerOff-method)
  * [`togglePowerStatus()`](#BraviaIpControlSimpleDevice-togglePowerStatus-method)
  * [`getAudioVolume()`](#BraviaIpControlSimpleDevice-getAudioVolume-method)
  * [`setAudioVolume()`](#BraviaIpControlSimpleDevice-setAudioVolume-method)
  * [`volumeUp()`](#BraviaIpControlSimpleDevice-volumeUp-method)
  * [`volumeDown()`](#BraviaIpControlSimpleDevice-volumeDown-method)
  * [`getAudioMute()`](#BraviaIpControlSimpleDevice-getAudioMute-method)
  * [`setAudioMute()`](#BraviaIpControlSimpleDevice-setAudioMute-method)
  * [`muteAudio()`](#BraviaIpControlSimpleDevice-muteAudio-method)
  * [`unmuteAudio()`](#BraviaIpControlSimpleDevice-unmuteAudio-method)
  * [`getInput()`](#BraviaIpControlSimpleDevice-getInput-method)
  * [`setInput()`](#BraviaIpControlSimpleDevice-setInput-method)
  * [`getPictureMute()`](#BraviaIpControlSimpleDevice-getPictureMute-method)
  * [`setPictureMute()`](#BraviaIpControlSimpleDevice-setPictureMute-method)
  * [`togglePictureMute()`](#BraviaIpControlSimpleDevice-togglePictureMute-method)
  * [`mutePicture()`](#BraviaIpControlSimpleDevice-mutePicture-method)
  * [`unmutePicture()`](#BraviaIpControlSimpleDevice-unmutePicture-method)
  * [`getBroadcastAddress()`](#BraviaIpControlSimpleDevice-getBroadcastAddress-method)
  * [`getMacAddress()`](#BraviaIpControlSimpleDevice-getMacAddress-method)
  * [`getSceneSetting()`](#BraviaIpControlSimpleDevice-getSceneSetting-method)
  * [`setSceneSetting()`](#BraviaIpControlSimpleDevice-setSceneSetting-method)
  * [`onnotify` event handler](#BraviaIpControlSimpleDevice-onnotify-event-handler)
  * [`onclose` event handler](#BraviaIpControlSimpleDevice-onclose-event-handler)
* [Release Note](#Release-Note)
* [References](#References)
* [License](#License)

---------------------------------------
## <a id="Setting-BRAVIA">Setting BRAVIA</a>

The BRAVIA Simple IP Control is disabled by default. Before you use this module, you have to enable the BRAVIA Simple IP Control.

Visit the [official page](https://pro-bravia.sony.net/develop/integrate/ssip/overview/index.html), see the section "Enable Simple IP control" for details.

---------------------------------------
## <a id="Quick-Start">Quick Start</a>

### <a id="Quick-Start-1">Find BRAVIA</a>

If you don't know the IP address of your BRAVIA, you can discover BRAVIAs in the local network using this module:

```javascript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

BraviaIpControlSimple.discover().then((list) => {
  list.forEach((bravia) => {
    console.log('- ' + bravia.model + ' (' + bravia.address + ')');
  });
});
```

You can get a list of the [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object representing a BRAVIA. In the code above, the variable `bravia` is a [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object.

The code above will output the result as follows:

```
- KJ-43X8300D (192.168.11.12)
```

If you have already known the IP address of your BRAVIA, you can create a [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object manually:

```javascript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

const bravia = new BraviaIpControlSimple.BraviaDevice({
  address: '192.168.11.12'
});
```

At this moment, you can not control the BRAVIA yet. You have to establish a TCP connection using the `connect()` method:

```javascript
bravia.connect().then(() => {
  console.log('Connected.');
});
```

Once a TCP connection was established,  you can control the BRAVIA using this object as described in the sections blow.

### <a id="Quick-Start-2">Retrieve status</a>

Once you get a [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object and establish a TCP connection, you can retrieve various types of status from the BRAVIA. For example, you can retrieve the power status using the [`getPowerStatus()`](#BraviaIpControlSimpleDevice-getPowerStatus-method) method of the object:

```JavaScript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

let bravia = null;

// Discover a BRAVIA
BraviaIpControlSimple.discover({ quick: true }).then((list) => {
  if (list.length === 0) {
    throw new Error('No device was found.');
  }
  // BraviaIpControlSimpleDevice object
  bravia = list[0];
  // Establish a TCP connection
  return bravia.connect();
}).then(() => {
  // Retreive the power status
  return bravia.getPowerStatus();
}).then((res) => {
  // Show the result
  console.log(JSON.stringify(res, null, '  '));
  // Disconnect
  return bravia.disconnect();
}).then(() => {
  console.log('Disconnected.');
}).catch((error) => {
  console.error(error);
});
```

The code above will output the result as follows:

```
{
  "status": false
}
```

### <a id="Quick-Start-3">Control status</a>

Once you get a [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object and establish a TCP connection, you can change various types of status of the BRAVIA. For example, you can turn on the BRAVIA using the [`powerOn()`](#BraviaIpControlSimpleDevice-powerOn-method) method of the object:

```JavaScript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

let bravia = null;

// Discover a BRAVIA
BraviaIpControlSimple.discover({ quick: true }).then((list) => {
  if (list.length === 0) {
    throw new Error('No device was found.');
  }
  // BraviaIpControlSimpleDevice object
  bravia = list[0];
  // Establish a TCP connection
  return bravia.connect();
}).then(() => {
  // Turn on the BRAVIA
  return bravia.powerOn();
}).then((res) => {
  // Show the result
  console.log(JSON.stringify(res, null, '  '));
  // Disconnect
  return bravia.disconnect();
}).then(() => {
  console.log('Disconnected.');
}).catch((error) => {
  console.error(error);
});
```

The code above will output the result as follows:

```
{
  "status": true
}
```

### <a id="Quick-Start-4">Monitor Events</a>

During a TCP connection is established, the BRAVIA sends various types of event messages. You can listen to the event messages using the [`onnotify`](#BraviaIpControlSimpleDevice-onnotify-event-handler) event handler implemented in the [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object:

```javascript

const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

let bravia = null;

// Discover a BRAVIA
BraviaIpControlSimple.discover({ quick: true }).then((list) => {
  if (list.length === 0) {
    throw new Error('No device was found.');
  }
  // BraviaIpControlSimpleDevice object
  bravia = list[0];
  // Establish a TCP connection
  return bravia.connect();
}).then(() => {
  // Set a function on the onnotify event handler
  bravia.onnotify = (data) => {
    console.log(JSON.stringify(data, null, '  '));
  }
}).catch((error) => {
  console.error(error);
});
```

For example, when you turn on the BRAVIA using the remote (zapper), the code above will output the message as follows:

```
{
  "command": "POWR",
  "status": true
}
```

---------------------------------------
## <a id="BraviaIpControlSimple-object">`BraviaIpControlSimple` object</a>

In order to use this module , you have to load this module as follows:

```JavaScript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');
```

In the code snippet above, the variable `BraviaIpControlSimple` is a `BraviaIpControlSimple` object. The `BraviaIpControlSimple` object has methods as described in sections below.

### <a id="BraviaIpControlSimple-discover-method">discover() method</a>

The `discover()` method discovers BRAVIAs in the local network. This method returns a `Promise` object.

This method takes a hash object containing the properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:-------------------------
`wait`   | Integer | Optional | Duration of monitoring (sec). The default value is 3 sec. The value must be an integer in the range of 1 to 10.
`quick`  | Boolean | Optional | If `true`, this method returns immediately after a BRAVIA was found ignoring the value of the `wait`. The default value is `false`.

```javascript
mDnsSd.discover({
  quick: true
}).then((list) =>{
  list.forEach((bravia) => {
    console.log('- ' + bravia.model + ' (' + bravia.address + ')');
  });
});
```

The code above starts to discover BRAVIAs in the local network. When a BRAVIA is found, this method stops the discovery process and reports the found BRAVIAs because the `quick` property is set to `true`.

The code above will output the result as follows:

```
- KJ-43X8300D (192.168.11.12)
```

The variable `bravia` in the code above is a [`BraviaIpControlSimpleDevice`](#BraviaIpControlSimpleDevice-object) object which represents the BRAVIA.

---------------------------------------
## <a id="BraviaIpControlSimpleDevice-object">`BraviaIpControlSimpleDevice` object</a>

The `BraviaIpControlSimpleDevice` object represents a BRAVIA. This object has a variety of methods and properties. You can retrieve the status and settings of device and change them using this object.

This object can be obtained in two ways:

- Using the [`discover()`](#BraviaIpControlSimple-discover-method) method of the [`BraviaIpControlSimple`](#BraviaIpControlSimple-object) object
  - Use this approach if you don't know the IP address of your BRAVIA.
  - See the section "[`discover()` method](#BraviaIpControlSimple-discover-method)" for details.
- Newly creating a [`BraviaIpControlSimple`](#BraviaIpControlSimple-object) object manually
  - Use this approach if you know the IP address of your BRAVIA
  - You can create an object as follows:

```javascript
const BraviaIpControlSimple = require('node-bravia-ip-control-simple');

const bravia = new BraviaIpControlSimple.BraviaDevice({
  address: '192.168.11.12'
});
```

In the sections blow, the variable `bravia` in sample codes refers to the `BraviaIpControlSimpleDevice` object.

### <a id="BraviaIpControlSimpleDevice-properties">Properties</a>

The `BraviaIpControlSimpleDevice` object has the properties as follows:

Property   | Type   | Description
:----------|:-------|:------------------------------------
`address`  | String | IPv4 address (e.g., `"192.168.11.12"`).
`model`    | String | Model name (e.g., `"KJ-43X8300D"`). Note that this property is set to an empty string if you created this object from the constructor directly.
`onnotify` | Function | Event handler called when a notification message comes from the BRAVIA. See the section "[`onnotify` event hander](#BraviaIpControlSimpleDevice-onnotify-event-handler)" for details.
`onclose`  | Function | Event handler called when the TCP connection was closed (disconnected). See the section "[`onclose` event hander](#BraviaIpControlSimpleDevice-onclose-event-handler)" for details.

### <a id="BraviaIpControlSimpleDevice-connect-method">`connect()` method</a>

The `connect` method establishes a TCP connection with the BRAVIA. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.connect().then(() => {
  console.log('Connected.');
});
```

Note that you have to establish a TCP connection with the BRAVIA before using methods described in the sections below except the [`getConnectionStatus()`](#BraviaIpControlSimpleDevice-getConnectionStatus-method) method.

If a TCP connection has been established with the BRAVIA, this method does nothing and calls the `resolve()`.

### <a id="BraviaIpControlSimpleDevice-disconnect-method">`disconnect()` method</a>

The `disconnect` method disconnects the TCP connection with the BRAVIA. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.disconnect().then(() => {
  console.log('Disconnected.');
});
```

If no TCP connection is active, this method does nothing and calls the `resolve()`.

### <a id="BraviaIpControlSimpleDevice-getConnectionStatus-method">`getConnectionStatus()` method</a>

The `getConnectionStatus()` method returns the status of the TCP connection with the BRAVIA. This method can be used even if no TCP connection is established unlike the other methods.

The meanings of the return values are as follows:

Value | Meanings
:-----|:-----------------------------
`0`   | Disconnected
`1`   | Now connecting
`2`   | Connected
`3`   | Now disconnecting

```javascript
const BraviaIpControlSimple = require('../lib/bravia-ip-control-simple.js');

const bravia = new BraviaIpControlSimple.BraviaDevice({
  address: '192.168.11.12'
});

console.log(bravia.getConnectionStatus()); // 0
bravia.connect().then(() => {
  console.log('Connected.');
  console.log(bravia.getConnectionStatus()); // 2
  return bravia.disconnect();
}).then(() => {
  console.log('Disconnected.');
  console.log(bravia.getConnectionStatus()); // 0
}).catch((error) => {
  console.error(error);
});
```

### <a id="BraviaIpControlSimpleDevice-setIrccCode-method">`setIrccCode()` method</a>

The `setIrccCode()` method sends codes to the BRAVIA like IR commands of remote controller. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

This method takes a hash object containing the properties as follows:

Property | Type   | Required | Description
:--------|:-------|:---------|:--------------------------
`name`   | String | Required | Command name (e.g., `"tvPower"`)

```javascript
bravia.setIrccCode({ name: 'tvPower' }).then(() => {
  console.log('Done.');
});
```

The names as follows can be set to the `name` property:

* `display`
* `home`
* `options`
* `return`
* `up`
* `down`
* `right`
* `left`
* `confirm`
* `red`
* `green`
* `yellow`
* `blue`
* `num1`
* `num2`
* `num3`
* `num4`
* `num5`
* `num6`
* `num7`
* `num8`
* `num9`
* `num0`
* `volumeUp`
* `volumeDown`
* `mute`
* `channelUp`
* `channelDown`
* `subtitle`
* `dot`
* `pictureOff`
* `wide`
* `jump`
* `syncMenu`
* `forward`
* `play`
* `rewind`
* `prev`
* `stop`
* `next`
* `pause`
* `flashPlus`
* `flashMinus`
* `tvPower`
* `audio`
* `input`
* `sleep`
* `sleepTimer`
* `video2`
* `pictureMode`
* `demoSurround`
* `hdmi1`
* `hdmi2`
* `hdmi3`
* `hdmi4`
* `actionMenu`
* `help`

### <a id="BraviaIpControlSimpleDevice-getPowerStatus-method">`getPowerStatus()` method</a>

The `getPowerStatus()` method retrieves the power status of the BRAVIA. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | `true`: Active (On), `false`: Standby (Off)

```javascript
bravia.getPowerStatus().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "status": true
}
```

### <a id="BraviaIpControlSimpleDevice-setPowerStatus-method">`setPowerStatus()` method</a>

The `getPowerStatus()` method changes the power status of the BRAVIA. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`status` | Boolean | Required | `true`: Active (On), `false`: Standby (Off)


```javascript
bravia.setPowerStatus({ status: false }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | `true`: Active (On), `false`: Standby (Off)

The code above will output the result as follows:

```json
{
  "status": false
}
```

### <a id="BraviaIpControlSimpleDevice-powerOn-method">`powerOn()` method</a>

The `powerOn()` method turns on the BRAVIA. This method returns a `Promise` object.

```javascript
bravia.powerOn().then(() => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | This property always returns `true` which means Active (On).

The code above will output the result as follows:

```json
{
  "status": true
}
```

This method is equivalent to the code below:

```javascript
bravia.setPowerStatus({ status: true })
```

### <a id="BraviaIpControlSimpleDevice-powerOff-method">`powerOff()` method</a>

The `powerOff()` method turns off the BRAVIA. This method returns a `Promise` object.

```javascript
bravia.powerOff().then(() => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | This property always returns `false` which means Standby (Off).

The code above will output the result as follows:

```json
{
  "status": false
}
```

This method is equivalent to the code below:

```javascript
bravia.setPowerStatus({ status: false })
```

### <a id="BraviaIpControlSimpleDevice-togglePowerStatus-method">`togglePowerStatus()` method</a>

The `togglePowerStatus()` method toggles the power status of the BRAVIA like the power button on the remote. That is, if the BRAVIA is turned on, this method turns it off, and vice versa. This method returns a `Promise` object.

```javascript
bravia.togglePowerStatus().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | `true`: Active (On), `false`: Standby (Off)

The code above will output the result as follows:

```json
{
  "status": false
}
```

### <a id="BraviaIpControlSimpleDevice-getAudioVolume-method">`getAudioVolume()` method</a>

The `getAudioVolume()` method retrieves the level of the audio volume. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`volume` | Integer | Current audio volume level (0 - 100)

```javascript
bravia.getAudioVolume().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "volume": 20
}
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

### <a id="BraviaIpControlSimpleDevice-setAudioVolume-method">`setAudioVolume()` method</a>

The `setAudioVolume()` method changes the level of the audio volume. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`volume` | Integer | Required | Audio volume level (1 - 100)


```javascript
bravia.setAudioVolume({ volume: 20 }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`volume` | Integer | Audio volume level after this method was executed. (0 - 100)

The code above will output the result as follows:

```json
{
  "volume": 20
}
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

### <a id="BraviaIpControlSimpleDevice-volumeUp-method">`volumeUp()` method</a>

The `volumeUp()` method turns up the audio volume the specified steps. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`step`   | Integer | Optional | Volume step (1 - 100). The default value is `1`.


```javascript
bravia.volumeUp({ step: 5 }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`volume` | Integer | Audio volume level after this method was executed. (0 - 100)

The code above will output the result as follows:

```json
{
  "volume": 25
}
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

If the sum of the current level and the specified step is grater than 100, this method sets the volume level to 100.

### <a id="BraviaIpControlSimpleDevice-volumeDown-method">`volumeDown()` method</a>

The `volumeDown()` method turns down the audio volume the specified steps. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`step`   | Integer | Optional | Volume step (1 - 100). The default value is `1`.


```javascript
bravia.volumeDown({ step: 5 }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`volume` | Integer | Audio volume level after this method was executed. (0 - 100)

The code above will output the result as follows:

```json
{
  "volume": 25
}
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

If the current level minus the specified step is less than 0, this method sets the volume level to 0.

### <a id="BraviaIpControlSimpleDevice-getAudioMute-method">`getAudioMute()` method</a>

The `getAudioMute()` method retrieves the audio mute status. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | `true`: Muted, `false`: Unmuted

```javascript
bravia.getAudioMute().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "status": false
}
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

### <a id="BraviaIpControlSimpleDevice-setAudioMute-method">`setAudioMute()` method</a>

The `setAudioMute()` method changes the audio mute status of the BRAVIA. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`status` | Boolean | Required | `true`: Mute, `false`: Unmute


```javascript
bravia.setAudioMute({ status: true }).then((res) => {
  console.log('Done.');
});
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

### <a id="BraviaIpControlSimpleDevice-muteAudio-method">`muteAudio()` method</a>

The `muteAudio()` method mutes audio. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.muteAudio().then(() => {
  console.log('Done.');
});
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

This method is equivalent to the code below:

```javascript
bravia.setAudioMute({ status: true })
```

### <a id="BraviaIpControlSimpleDevice-unmuteAudio-method">`unmuteAudio()` method</a>

The `unmuteAudio()` method unmutes audio. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.unmuteAudio().then(() => {
  console.log('Done.');
});
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

This method is equivalent to the code below:

```javascript
bravia.setAudioMute({ status: false })
```

### <a id="BraviaIpControlSimpleDevice-getInput-method">`getInput()` method</a>

The `getInput()` method retrieves the current selected external input. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`type`   | String  | `"hdmi"`, `"component"`, `"mirroring"`, or empty string (`""`)
`port`   | Integer | Port number

```javascript
bravia.getInput().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "type": "hdmi",
  "port": 1
}
```

If any external input is not active, the result will be as follows:

```json
{
  "type": "",
  "port": 0
}
```

### <a id="BraviaIpControlSimpleDevice-setInput-method">`setInput()` method</a>

The `setInput()` method changes the current selected external input. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`type`   | String  | Required | `"hdmi"`, `"component"`, or `"mirroring"`
`port`   | Integer | Required | 1 - 999


```javascript
bravia.setInput({ type: 'hdmi', port: 1 }).then((res) => {
  console.log('Done.');
});
```

Note that the BRAVIA returns an error when the power status is in the stand-by mode (Off).

### <a id="BraviaIpControlSimpleDevice-getPictureMute-method">`getPictureMute()` method</a>

The `getPictureMute()` method retrieves the status of the picture mute. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | `true`: Muted, `false`: Unmuted

```javascript
bravia.getPictureMute().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "status": false
}
```

### <a id="BraviaIpControlSimpleDevice-setPictureMute-method">`setPictureMute()` method</a>

The `setPictureMute()` method changes the status of the picture mute. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`status` | Boolean | Required | `true`: Mute, `false`: Unmute


```javascript
bravia.setPictureMute({ status: true }).then((res) => {
  console.log('Done.');
});
```

### <a id="BraviaIpControlSimpleDevice-togglePictureMute-method">`togglePictureMute()` method</a>

The `togglePictureMute()` method toggles the status of the picture mute. That is, if the picture mute is active, this method unmutes picture, and vice versa. This method returns a `Promise` object.

```javascript
bravia.togglePictureMute().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`status` | Boolean | The status of the picture mute after this method was executed. (`true`: Muted, `false`: Unmuted)

The code above will output the result as follows:

```json
{
  "status": false
}
```

### <a id="BraviaIpControlSimpleDevice-mutePicture-method">`mutePicture()` method</a>

The `mutePicture()` method mutes picture. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.mutePicture().then(() => {
  console.log('Done.');
});
```

This method is equivalent to the code below:

```javascript
bravia.setPictureMute({ status: true })
```

### <a id="BraviaIpControlSimpleDevice-unmutePicture-method">`unmutePicture()` method</a>

The `unmutePicture()` method unmutes picture. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

```javascript
bravia.unmutePicture().then(() => {
  console.log('Done.');
});
```

This method is equivalent to the code below:

```javascript
bravia.unmutePicture({ status: false })
```

### <a id="BraviaIpControlSimpleDevice-getBroadcastAddress-method">`getBroadcastAddress()` method</a>

The `getBroadcastAddress()` method retrieves the broadcast IPv4 address of the specified interface. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`netif`  | String  | Required | "`eth0`" or "`wlan0`"

```javascript
bravia.getBroadcastAddress({ netif: 'eth0' }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property   | Type    | Description
:----------|:--------|:------------------------
`bcAddrV4` | String  | The broadcast IPv4 address of the specified interface

The code above will output the result as follows:

```json
{
  "bcAddrV4": "192.168.11.255"
}
```

### <a id="BraviaIpControlSimpleDevice-getMacAddress-method">`getMacAddress()` method</a>

The `getMacAddress()` method retrieves the MAC address of the specified interface. This method returns a `Promise` object.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`netif`  | String  | Required | "`eth0`" or "`wlan0`"

```javascript
bravia.getMacAddress({ netif: 'eth0' }).then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property   | Type    | Description
:----------|:--------|:------------------------
`hwAddr`   | String  | The MAC address of the specified interface

The code above will output the result as follows:

```json
{
  "hwAddr": "10-4F-A8-BA-2A-EB"
}
```

### <a id="BraviaIpControlSimpleDevice-getSceneSetting-method">`getSceneSetting()` method</a>

The `getSceneSetting()` method retrieves the current Scene Setting. This method returns a `Promise` object.

If the information is fetched successfully, a hash object containing the information will be passed to the `resolve()` function. The hash object has the properties as follows:

Property | Type    | Description
:--------|:--------|:------------------------
`value`  | String  | `"auto"`, `"auto24pSync"`, `"general"`, or empty string (`""`)

```javascript
bravia.getSceneSetting().then((res) => {
  console.log(JSON.stringify(res, null, '  '));
});
```

The code above will output the result as follows:

```json
{
  "value": "general"
}
```

When the BRAVIA is not in the tv mode (when you are not watching a TV program), the value of the `value` property will be set to an empty string:

```json
{
  "value": ""
}
```

### <a id="BraviaIpControlSimpleDevice-setSceneSetting-method">`setSceneSetting()` method</a>

The `setSceneSetting()` method changes the current Scene Setting. This method returns a `Promise` object. Nothing will be passed to the `resolve()`.

This method takes a hash object as an argument containing properties as follows:

Property | Type    | Required | Description
:--------|:--------|:---------|:----------------------
`value`  | String  | Required | `"auto"`, `"auto24pSync"`, or `"general"`

```javascript
bravia.setSceneSetting({ value: 'auto' }).then((res) => {
  console.log('Done.');
});
```

If this method was executed successfully, a hash object will be passed to the `resolve()` function. The hash object has the properties as follows:

Property   | Type    | Description
:----------|:--------|:------------------------
`value`    | String  | `"auto"`, `"auto24pSync"`, or `"general"`

The code above will output the result as follows:

```json
{
  "value": "auto"
}
```

### <a id="BraviaIpControlSimpleDevice-onnotify-event-handler">`onnotify` event handler</a>

The `onnotify` event handler will be called when an event message comes from the BRAVIA. During a TCP connection is established, the BRAVIA sends various types of event messages. You can listen to the event messages using the `onnotify` event handler.

```javascript
bravia.onnotify = (data) => {
  console.log(JSON.stringify(data, null, '  '));
}
```

An object containing the information of the event will be passed to the callback function as follows:

* When the power status was changed:

```json
{
  "command": "POWR",
  "status": true
}
```

* When the current external input was changed:

```json
{
  "command": "INPT",
  "type": "hdmi",
  "port": 1
}
```

* When the audio volume level was changed:

```json
{
  "command": "VOLU",
  "volume": 4
}
```

* When the status of the audio mute was changed:

```json
{
  "command": "VOLU",
  "volume": 0
}
{
  "command": "AMUT",
  "status": true
}
```

Note that changing the status of the audio mute causes two events shown as above.

* When the status of the picture mute was changed:

```json
{
  "command": "PMUT",
  "status": true
}
```

### <a id="BraviaIpControlSimpleDevice-onclose-event-handler">`onclose` event handler</a>

The `onclose` event handler will be called when the TCP connection was closed. 

```javascript
bravia.onclose = (event) => {
  console.log(JSON.stringify(event, null, '  '));
};
```

An object containing the information of the event will be passed to the callback function as follows:

* When the TCP connection was disconnected by the [`disconnect()`](#BraviaIpControlSimpleDevice-disconnect-method) method:

```json
{
  "intentional": true
}
```

* When the TCP connection was disconnected unexpectedly:

```json
{
  "intentional": false
}
```

---------------------------------------
## <a id="Release-Note">Release Note</a>

* v0.0.1 (2018-07-16)
  * First public release

---------------------------------------
## <a id="References">References</a>

* [BRAVIA Professional Display Simple IP control specification](https://pro-bravia.sony.net/develop/integrate/ssip/overview/index.html5)

---------------------------------------
## <a id="License">License</a>

The MIT License (MIT)

Copyright (c) 2019 Futomi Hatano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
