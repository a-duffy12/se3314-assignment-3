let net = require("net");
let fs = require("fs");
let open = require("open");
let ITPpacket = require("./ITPRequest");

// Enter your code for the client functionality here
let client = new net.Socket(); // create a socket
let longAddress = process.argv[3]; // get address and port of server from command
let port = longAddress.substring(longAddress.indexOf(':') + 1); // get server's port
let address = longAddress.slice(0, longAddress.indexOf(':')); // get server's address

let fileRaw = process.argv[5]; // get full file from command
let file = fileRaw.substring(0, fileRaw.indexOf('.')); // get name of file
let extRaw = fileRaw.substring(fileRaw.indexOf('.') + 1).toLowerCase(); // get extension of file
let ext = 0;
let version = process.argv[7]; // get version from command

// encode file type
if (extRaw == "bmp")
{
    ext = 1;
}
else if (extRaw == "jpg")
{
    ext = 2;
}
else if (extRaw == "gif")
{
    ext = 3;
}
else if (extRaw == "png")
{
    ext = 4;
}
else if (extRaw == "tiff")
{
    ext = 5;
}
else if (extRaw == "jpeg")
{
    ext = 12;
}
else if (extRaw == "raw")
{
    ext = 15;
}

// function to connect to the image server
client.connect(port, address, () => {
    
    console.log(`Connected to ImageDB server on: ${address}:${port}\n`);
    
    ITPpacket.init(version, 0, ext, file); // build packet
    client.write(ITPpacket.getBytePacket()); // send packet
})

// handle server response
client.on('data', (res) => {

    // read data from response packet
    let v = res.slice(0, 2).readUInt16BE(0);
    let f = res.slice(3).readUInt8(0);
    let t = res.slice(4).readUInt8(0);
    let sq = res.slice(5, 8).readUInt16BE(0);
    let ts = res.slice(9, 12).readUInt16BE(0);
    let e = res.slice(13, 16).readUInt16BE(0);

    // output response
    console.log("Server sent:")
    console.log(`   --ITP Version = ${v}`)
    if (f == 0)
    {
        console.log(`   --Fulfilled =  No`);
    }
    else if (f == 1)
    {
        console.log(`   --Fulfilled = Yes`);
    }
    if (t == 0)
    {
        console.log(`   --Response Type = Query`);
    }
    else if (t == 1)
    {
        console.log(`   --Response Type = Found`);
    }
    else if (t == 2)
    {
        console.log(`   --Response Type = Not Found`);
    }
    else if (t == 3)
    {
        console.log(`   --Response Type = Busy`);
    }
    //console.log(`   --Image Count = ${}`); // TODO
    console.log(`   --Sequence Number = ${sq}`);
    console.log(`   --Timestamp = ${ts}\n`);

    // read image(s)
    if (t == 1)
    {
        // decode file type
        if (e == 1)
        {
            extRaw = "bmp";
        }
        else if (e == 2)
        {
            extRaw = "jpg";
        }
        else if (e == 3)
        {
            extRaw = "gif";
        }
        else if (e == 4)
        {
            extRaw = "png";
        }
        else if (e == 5)
        {
            extRaw = "tiff";
        }
        else if (e == 12)
        {
            extRaw = "jpeg";
        }
        else if (e == 15)
        {
            extRaw = "raw"
        }

        fs.writeFile(`received_${sq}.${extRaw}`, res.slice(21), (err) => {

            if (err)
            {
                throw err;
            }

            open(`received_${sq}.${extRaw}`).then(() => {}); // open received image
        })
    }

    client.destroy(); // destroy packet after receiving it
    console.log("Disconnected from the server");
})

client.on("close", () => {
    console.log("Connection closed\n");
})