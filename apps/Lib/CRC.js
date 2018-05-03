// "Class" for calculating CRC8 checksums...
var POLY = {
	CRC8 : 0xd5,
	CRC8_CCITT : 0x07,
	CRC8_DALLAS_MAXIM : 0x31,
	CRC8_SAE_J1850 : 0x1D,
	CRC_8_WCDMA : 0x9b,
};
var table = generateTable(POLY.CRC8_CCITT);

// Returns the 8-bit checksum given an array of byte-sized numbers
var checksum = function (byte_array) {
	var c = 0;

	for (var i = 0; i < byte_array.length; i++ )
		c = table[(c ^ byte_array[i]) % 256]
	return c;
}

// returns a lookup table byte array given one of the values from CRC8.POLY
function generateTable(polynomial)
{
	var csTable = [] // 256 max len byte array

	for ( var i = 0; i < 256; ++i ) {
		var curr = i
		for ( var j = 0; j < 8; ++j ) {
			if ((curr & 0x80) !== 0) {
				curr = ((curr << 1) ^ polynomial) % 256
			} else {
				curr = (curr << 1) % 256
			}
		}
		csTable[i] = curr
	}

	return csTable
}

// This "enum" can be used to indicate what kind of CRC8 checksum you will be calculating

module.exports = checksum;