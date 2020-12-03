const OBSWebSocket = require('obs-websocket-js');
const readline = require('readline');

const obs = new OBSWebSocket();

const tmi = require('tmi.js');

const chat = new tmi.client({
    connection: {
        secure: true,
        reconnect: true
    },
    channels: ['1kentora']
})

chat.on('message', (channel, user, message, self) => {
    if(self) return; // ignore echo, but should not happen

    if(isModOrHigher(user, channel) && message == "!flush"){
        fixTheStuff();
    }
});

readline.createInterface(process.stdin, process.stdout);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name == 'c') {
        process.exit();
    }

    console.log();

    if(key.name == 't'){
        chat.connect().then(() => {
            console.log("Twitch chat connected");
        }).catch(err => console.error(err));

        return;
    }

    if(key.name == 'f'){
        fixTheStuff();
        return;
    }
    
    if(key.name == 'o'){
        obs.connect().then(() => {
            console.log("OBS connected");
        }).catch("obs not connected");
    }

    console.log("t for twitch connect, o for obs connect, f for fix, ctrl+c for exit");
});

function fixTheStuff(){
    obs.send('SetSceneItemProperties', { item: { name: 'RTMP' }, visible: false }).then(() => {
        setTimeout(() => {
            obs.send('SetSceneItemProperties', { item: { name: 'RTMP' }, visible: true }).then(() => {
                console.log("I fixed all the shiiiitz");
            })
        }, 200);
    });
}

function isModOrHigher(user, channel){
    let isMod = user.mod || user['user-type'] === 'mod';
    let isBroad = channel.slice(1) === user.username
    return isMod || isBroad;
}