const OBSWebSocket = require('obs-websocket-js');
const readline = require('readline');
const rlSync = require('readline-sync');
const fs = require('fs');
const path = require('path');
const obs = new OBSWebSocket();
const tmi = require('tmi.js');

var config;

try {
    config = require('./conf.json')
} catch (e) { }

if (config === undefined || hasMissingConfig(config)) {
    config = config ? config : {};
    config.timeout = config && config.timeout ? config.timeout : rlSync.question("Timeout: ");
    config.command = config && config.command ? config.command : rlSync.question("Command: ");
    config.channel = config && config.channel ? config.channel : rlSync.question("Channel: ");
    config.item_name = config && config.item_name ? config.item_name : rlSync.question("Item name in OBS: ");

    fs.writeFileSync(path.join(__dirname, "conf.json"), JSON.stringify(config));
}


const chat = new tmi.client({
    connection: {
        secure: true,
        reconnect: true
    },
    channels: [config.channel]
})

let lastFlush = 0;

let obsConnected = false;
let twitchConnected = false;

chat.on('message', (channel, user, message, self) => {
    if (self) return; // ignore echo, but should not happen

    if (isModOrHigher(user, channel) && message == config.command) {
        if (isAfterTimeout()) {
            fixTheStuff();
        }
    }
});

obs.on('ConnectionClosed', () => {
    obsConnected = false;
    console.log("OBS DISCONNECTED");
});

obs.on('ConnectionOpened', () => {
    obsConnected = true;
    console.log("OBS CONNECTED");
});

chat.on('disconnected', () => {
    console.log("TWITCH DISCONNECTED");
    twitchConnected = false;
});

chat.on('connected', () => {
    console.log("TWITCH CONNECTED");
    twitchConnected = true;
});

setInterval(() => {
    if (!obsConnected) {
        obs.connect().catch(err => {
            console.debug("Could not connect to OBS", err);
        });
    }

    if (!twitchConnected) {
        chat.connect().catch(err => console.debug("Could not connect to twitch", err));
    }
}, 1000);

readline.createInterface(process.stdin, process.stdout);
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name == 'c') {
        process.exit();
    }

    console.log();

    if (key.name == 'f') {
        fixTheStuff();
        return;
    }

    if (key.name == 's') {
        console.log("Status:\tTwitch " + (twitchConnected ? "connected" : "disconnected") + "\tOBS " + (obsConnected ? "connected" : "disconnected"))
        return;
    }

    console.log("s for status, f for fix, ctrl+c for exit");
});

function fixTheStuff() {
    obs.send('SetSceneItemProperties', { item: { name: config.item_name }, visible: false }).then(() => {
        setTimeout(() => {
            obs.send('SetSceneItemProperties', { item: { name: config.item_name }, visible: true }).then(() => {
                console.log("I fixed all the shiiiitz");
            }).catch(err => console.error("Could not set visibility true again", err));
        }, 200);
    }).catch(err => console.error("Could not flush", err));
    lastFlush = Date.now();
}

function isModOrHigher(user, channel) {
    let isMod = user.mod || user['user-type'] === 'mod';
    let isBroad = channel.slice(1) === user.username
    return isMod || isBroad;
}

function isAfterTimeout() {
    return (Date.now() - lastFlush) > parseInt(config.timeout);
}

function hasMissingConfig(conf){
    return !conf.timeout || !conf.command || !conf.channel || !conf.item_name;
}