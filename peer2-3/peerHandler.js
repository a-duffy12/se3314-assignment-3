// You may need to add some delectation here
let singleton = require('./Singleton');
let cPTPpacket = require('./cPTPpacket');
let net = require("net");

let isFull = {};
let options = []; // other options to join
let max;
let folder;

module.exports = {
    
    // middleware function to handle a peer join
    handleJoin: function (sock, max, sender, table)
    {
        let peerCount = table.length;

        if (peerCount < max)
        {
            handlePeer(sock, sender, table);
        }
        else if (peerCount == max)
        {
            declinePeer(sock, sender, table);
        }
    },

    // middleware function to handle peer communications
    handleCommunications: function (peer, max, folder, table)
    {
        communicate(peer, max, folder, table);
    }
};

// function to handle a new peer
function handlePeer(sock, sender, table)
{
    // create a packet
    cPTPpacket.init(7, 1, sender, table);

    // send packet
    sock.write(cPTPpacket.getPacket());
    sock.end();

    // add peer to table
    addPeer(sock, table);
}

// function to handle a decline
function declinePeer(sock, sender, table)
{
    let addPort = sock.remoteAddress + ":" + sock.remotePort;
    console.log(`\nPeer table full: ${addPort} redirected`);

    // create a packet
    cPTPpacket.init(7, 2, sender, table);

    // send packet
    sock.write(cPTPpacket.getPacket());
    sock.end();
}

// function to handle peer communication
function communicate(peer, max, folder, table)
{
    // when data is received
    peer.on("data", (packet) => {
        
        // read the packet
        let spot = 0; 
        let version = parseBitPacket(packet, 0, 3);
        spot +=3;
        let type = parseBitPacket(packet, 3, 8);
        spot += 8;
        let peerCount = parseBitPacket(packet, 11, 13);
        spot += 13;
        let size = parseBitPacket(packet, 24, 8);
        spot += 8;
        let sender = bytesToString(packet.slice(4, size+4));
        spot += size*8;

        let newTable = [];
        if (peerCount > 0)
        {
            for (let i = 0; i < peerCount; i++)
            {
                let oct1 = parseBitPacket(packet, spot, 8);
                spot += 8;
                let oct2 = parseBitPacket(packet, spot, 8);
                spot += 8;
                let oct3 = parseBitPacket(packet, spot, 8);
                spot += 8;
                let oct4 = parseBitPacket(packet, spot, 8);
                spot += 8;
                let port = parseBitPacket(packet, spot, 16);
                spot += 16

                // create a new peer
                let entry = {
                    address: oct1 + "." + oct2 + "." + oct3 + "." + oct4,
                    port: port
                }

                newTable.push(entry); // add peer to table
            }
        }

        if (type == 1) // allowed, not full
        {
            isFull[peer.remotePort] = false;
            console.log(`Connected to peer ${sender}:${peer.remotePort} at timestamep ${singleton.getTimestamp()}`);

            // record connected peer
            let newPeer = {
                address: peer.remoteAddress,
                port: peer.remotePort
            }

            table.push(newPeer); // add new peer to table
        
            let server = net.createServer();
            server.listen(peer.localPort, peer.localAddress);
            console.log(`This peer address is ${peer.localAddress}:${peer.localPort} located at ${folder}`);
        
            // when this new server receives a connection
            server.on("connection", (sock) => {
                let count = table.length;

                if (count < max)
                {
                    handlePeer(sock, folder, table);
                }
                else if (count == max)
                {
                    declinePeer(sock, folder, table);
                }
            });

            console.log(`Received ack from ${sender}:${peer.remotePort}`);

            if (peerCount > 0) // connected peers
            {
                let out = " which is peered with: ";

                for (let i = 0; i < peerCount-1; i++)
                {
                    out += "[" + newTable[i].address + ":" + newTable[i].port + "],";
                }
                out += "[" + newTable[peerCount-1].address + ":" + newTable[peerCount-1].port + "]";

                console.log(out); // output the connected peers
            }
        }
        else // declined, full
        {
            console.log(`Received ack from ${sender}:${peer.remotePort}`);
            isFull[peer.remotePort] = true;

            options = newTable; // give options based off of connected peers
            max = max;
            folder = folder;

            if (peerCount > 0) // connected peers
            {
                let out = " which is peered with: ";

                for (let i = 0; i < peerCount-1; i++)
                {
                    out += "[" + newTable[i].address + ":" + newTable[i].port + "],";
                }
                out += "[" + newTable[peerCount-1].address + ":" + newTable[peerCount-1].port + "]";

                console.log(out); // output the connected peers
            }

            console.log(`\nThe join has been declined; the auto-join process is performing...\n`);
        }
    });

    // when a connection is ended
    peer.on("end", () => {

        if (isFull[peer.remotePort]) 
        {
            let newClient = new net.Socket(); // redirect

            // connect to other peer TODO
            newClient.connect(options[0].address, options[0].port, () => {

                let newPeerTable = [];
                communicate(newClient, max, folder, newPeerTable);
            })
        }
    })
}

// function to add a peer
function addPeer(sock, table)
{
    // create a peer
    let peer = {
        address: sock.remoteAddress,
        port: sock.remotePort
    }

    table.push(peer); // add peer
    console.log(`\nConnected from peer ${sock.remoteAddress}:${sock.remotePort}`);
}

// function to turn bytes into a string
function bytesToString(val)
{
    let result = "";

    for (let i = 0; i < val.length; i++)
    {
        if (val[i] > 0) // if the character is valid
        {
            result += String.fromCharCode(val[i]); // add it to the result
        }
    }

    return result;
}

// function to return an int based on bits
function parseBitPacket(p, o, l) 
{
    let num = "";

    for (let i = 0; i < l; i++)
    {
        let bytePos = Math.floor((o + i)/8);
        let bitPos = 7 - ((o + i) % 8);
        let b = (p[bytePos] >> bitPos) % 2;
        num = (num << 1) | b;
    }

    return num;
}