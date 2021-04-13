// You may need to add some delectation here
let singleton = require('./Singleton');
let peerHandler = require('./peerHandler');
let net = require("net");
let os = require("os");

//set up peer parameters
singleton.init();
let ifaces = os.networkInterfaces();
let HOST = "";
let PORT = singleton.getPort();

let version = 7;

// get localhost address
Object.keys(ifaces).forEach((ifname) => {
    ifaces[ifname].forEach((iface) => {
        if ("IPv4" == iface.family && iface.internal !== false)
        {
            HOST = iface.address;
        }
    });
});

// parse folder for peer name and max peer count
let path = __dirname.split("\\");
let folder = path[path.length-1].split("-")[0];
let max = path[path.length-1].split("-")[1];

let peer = {'address': HOST, 'port' : PORT}; // peer tempalte
let known = {}; // known empty
let history = []; // array of strings to hold searches

// set up peer as a server
let server = net.createServer();
server.listen(PORT, HOST);
console.log(`This peer address is ${HOST}:${PORT} located at ${folder}`);

let peerTable = []; // hold hold peer 
let declinedTable = []; // hold declined peers

server.on("connection", (sock) => {
    peerHandler.handleJoin(sock, max, folder, peerTable);
});

if (process.argv.length > 2) // arguments specified
{
    let addPort = process.argv[3].split(":");
    let address = addPort[0];
    let port = addPort[1];

    // set up peer as a client
    let client = new net.Socket();

    // connect to an existing peer
    client.connect(port, address, () => {
        let peerTable = [];
        peerHandler.handleCommunications(client, max, folder, peerTable);
    });
}
else // arguments not specified
{
    // create peer as the image server
    let DB_PORT = singleton.getPort();
    let db = new.createServer();
    db.listen(DB_PORT, HOST); 
    console.log(`ImageDB server is started at ${singleton.getTimestamp()} and is listening on ${HOST}:${DB_PORT}`);

    let peerTable = [];

    db.on("connection", (sock) => {
        peerHandler.handleJoin(sock, max, folder, peerTable);
    })
}

