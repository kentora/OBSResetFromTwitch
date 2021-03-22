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
    config.command_refresh = config && config.command_refresh ? config.command_refresh : rlSync.question("Refresh Command: ");
    config.command_IRL = config && config.command_IRL ? config.command_IRL : rlSync.question("IRL scene Command: ");
    config.command_privacy = config && config.command_privacy ? config.command_privacy : rlSync.question("Privacy scene Command: ");
    config.channel = config && config.channel ? config.channel : rlSync.question("Channel: ");
    config.item_name = config && config.item_name ? config.item_name : rlSync.question("IRL media name in OBS: ");
    config.irl_scene = config && config.irl_scene ? config.irl_scene : rlSync.question("IRL scene name in OBS: ");
    config.privacy_scene = config && config.privacy_scene ? config.privacy_scene : rlSync.question("Privacy scene name in OBS: ");

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

    if (isModOrHigher(user, channel) && commandIs(message, config.command_refresh)) {
        if (isAfterTimeout()) {
            fixTheStuff();
        }
    }

    if(isModOrHigher(user, channel) && commandIs(message, config.command_IRL)){
        if(isAfterTimeout()) {
            showIrl();
        }
    }

    if(isModOrHigher(user, channel) && commandIs(message, config.command_privacy)){
        if(isAfterTimeout()) {
            showPrivacy();
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
    
    if (key.name == 'p'){
        showPrivacy();
        return;
    }

    if(key.name == 'i'){
        showIrl();
        return;
    }

    if (key.name == 's') {
        console.log("Status:\tTwitch " + (twitchConnected ? "connected" : "disconnected") + "\tOBS " + (obsConnected ? "connected" : "disconnected"))
        return;
    }

    console.log("s for status, f for fix, i for irl scene, p for privacy scene, ctrl+c for exit");
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

function showPrivacy(){
    showScene(config.privacy_scene);
}

function showIrl(){
    showScene(config.irl_scene)
}

function showScene(sceneToShow){
    console.log("Showing scene: " + sceneToShow);
    obs.send('SetCurrentScene', {"scene-name": sceneToShow}).then(() => {
        console.log("Switched the scene");
    }).catch(err => console.error("Could not switch scene", err));
}

function isModOrHigher(user, channel) {
    let isMod = user.mod || user['user-type'] === 'mod';
    let isBroad = channel.slice(1) === user.username
    return isMod || isBroad;
}

function commandIs(message, cmd){
    return message.toUpperCase() == cmd.toUpperCase();
}

function isAfterTimeout() {
    return (Date.now() - lastFlush) > parseInt(config.timeout);
}

function hasMissingConfig(conf){
    return !conf.timeout || !conf.command_refresh || !conf.command_IRL || !conf.command_privacy || !conf.channel || !conf.item_name || !conf.irl_scene || ! conf.privacy_scene;
}