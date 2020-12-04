const OBSWebSocket = require('obs-websocket-js');
const readline = require('readline');

const obs = new OBSWebSocket();

const tmi = require('tmi.js');
const { throws } = require('assert');

const chat = new tmi.client({
    connection: {
        secure: true,
        reconnect: true
    },
    channels: [process.env['CHANNEL']]
})

let lastFlush = 0;

let obsConnected = false;
let twitchConnected = false;

chat.on('message', (channel, user, message, self) => {
    if(self) return; // ignore echo, but should not happen

    if(isModOrHigher(user, channel) && message == process.env['COMMAND']){
        if(isAfterTimeout()){
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
    if(!obsConnected){
        obs.connect().catch(err => {
            console.debug("Could not connect to OBS", err);
        });
    }

    if(!twitchConnected){
        chat.connect().catch(err => console.debug("Could not connect to twitch", err));
    }
}, 1000);

readline.createInterface(process.stdin, process.stdout);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name == 'c') {
        process.exit();
    }

    console.log();

    if(key.name == 'f'){
        fixTheStuff();
        return;
    }

    if(key.name == 's'){
        console.log("Status:\tTwitch " + (twitchConnected ? "connected" : "disconnected") + "\tOBS " + (obsConnected ? "connected" : "disconnected"))
        return;
    }

    console.log("s for status, f for fix, ctrl+c for exit");
});

function fixTheStuff(){
    obs.send('SetSceneItemProperties', { item: { name: process.env['ITEM_NAME'] }, visible: false }).then(() => {
        setTimeout(() => {
            obs.send('SetSceneItemProperties', { item: { name: process.env['ITEM_NAME'] }, visible: true }).then(() => {
                console.log("I fixed all the shiiiitz");
            }).catch(err => console.error("Could not set visibility true again", err));
        }, 200);
    }).catch(err => console.error("Could not flush", err));
    lastFlush = Date.now();
}

function isModOrHigher(user, channel){
    let isMod = user.mod || user['user-type'] === 'mod';
    let isBroad = channel.slice(1) === user.username
    return isMod || isBroad;
}

function isAfterTimeout(){
    return (Date.now() - lastFlush) > parseInt(process.env['TIMEOUT']);
}