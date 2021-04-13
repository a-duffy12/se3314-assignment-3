// variables to track packet properties
let size = 16;
let version, type, count, seqNum, timeStamp, imageType, sizeName, sizeImage

module.exports = {
    packet: '',
    imageSize: 0,
    image: '',

    init: function(v, t, c, s, ts, it, i, nsz, isz, n, d)
    {
        // set parameters
        version = v;
        type = t;
        count = c;
        seqNum = s;
        timeStamp = ts;
        sizeName = nsz;
        sizeImage = isz;

        // build header
        this.packet = new Buffer.alloc(size);

        storeBitPacket(this.packet, version*1, 0, 3); // store version in first 3 bits
        storeBitPacket(this.packet, type, 3, 8); // store type in next 8 bits
        storeBitPacket(this.packet, count, 11, 5); // store image count in the next 5 bits
        storeBitPacket(this.packet, seqNum, 16, 15); // store sequence number
        storeBitPacket(this.packet, timeStamp, 31, 32); // store timestamp
        storeBitPacket(this.packet, imageType, 63, 4); // store image type
        storeBitPacket(this.packet, sizeName, 67, 12); // store size of image name
        storeBitPacket(this.packet, sizeImage, 79, 16); // store size of image
        //storeBitPacket()
    },

    getPacket: function ()
    {
        return this.packet;
    }
}

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
