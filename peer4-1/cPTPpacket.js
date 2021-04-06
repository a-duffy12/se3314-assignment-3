// variables to track packet properties
let size = 12;
let version, type;

module.exports = {

    packet: "", // bitstream of the header

    init: function (v, t, s, table)
    {
        // set parameters
        let peerCount = table.length;
        version = v;
        type = t;

        // build header
        this.packet = new Buffer.alloc(size + peerCount*6);

        storeBitPacket(this.packet, version*1, 0, 3); // store version in first 3 bits
        storeBitPacket(this.packet, type, 3, 8); // store type in next 8 bits
        storeBitPacket(this.packet, peerCount, 11, 13); // store peer count in 13 bits

        // get and build sender ID
        let sID = stringToBytes(s);
        storeBitPacket(this.packet, sID.length, 24, 8); // store sender ID in 8 bits
        let tracker = 4;
        let i, j = 0;
        for (i = tracker; i < sID.length + tracker; i++)
        {
            this.packet[i] = sID[j++];
        }

        if (peerCount > 0) // if the peer table was not empty
        {
            let spot = i*6; // where we can write more bits

            for (let k = 0; k < peerCount; k++)
            {
                let address = table[k].address;
                let port = table[k].port;
                let oct1 = address.split(".")[0];
                let oct2 = address.split(".")[1];
                let oct3 = address.split(".")[2];
                let oct4 = address.split(".")[3];

                storeBitPacket(this.packet, oct1*1, spot, 8);
                spot += 8;
                storeBitPacket(this.packet, oct2, spot, 8);
                spot += 8;
                storeBitPacket(this.packet, oct3, spot, 8);
                spot += 8;
                storeBitPacket(this.packet, oct4, spot, 8);
                spot += 8;
                storeBitPacket(this.packet, port, spot, 16);
                spot += 16;
            }
        }
    },

    getPacket: function ()
    {
        return this.packet
    }
};

// function to turn a string into bytes
function stringToBytes(s)
{
    let ch, st, re = [];

    for (let i = 0; i < s.length; i++)
    {
        ch = s.charCodeAt(i); // get the character
        st = []; // empty stack
        
        do 
        {
            st.push(ch & 0xff); // push byte to stack
            ch = ch >>> 8; // shift value down a byte
        }
        while (ch);

        re = re.concat(st.reverse()); // reverse the stack
    }

    return re; // return the reverse
}

// function to store an integer value into the bitstream
function storeBitPacket(p, v, o, l)
{
    let lastPos = o + l - 1;
    let num = v.toString(2);
    let j = num.length-1;

    for (let i = 0; i < num.length; i++)
    {
        let bytePos = Math.floor(lastPos/8);
        let bitPos = 7 - (lastPos % 8);

        if (num.charAt(j--) == "0")
        {
            p[bytePos] &= ~(1 << bitPos);
        }
        else
        {
            p[bytePos] |= 1 << bitPos;
        }
        lastPos--;
    }
}