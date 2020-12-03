const OBSWebSocket = require('obs-websocket-js');
const readline = require('readline');
const { stdin } = require('process');

const obs = new OBSWebSocket();
obs.connect();

readline.emitKeypressEvents(process.stdin);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name == 'c') {
        process.exit();
    }
    obs.send('SetSceneItemProperties', { item: { name: 'RTMP' }, visible: false }).then(() => {
        setTimeout(() => {
            obs.send('SetSceneItemProperties', { item: { name: 'RTMP' }, visible: true }).then(() => {
                console.log("I fixed all the shiiiitz");
            })
        }, 200);
    });
});