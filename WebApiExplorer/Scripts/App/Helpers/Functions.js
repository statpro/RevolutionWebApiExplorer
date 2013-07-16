/* global define: false */

define(function () {
    "use strict";

    // Return an object containing a number of helper functions.
    return {
        // Returns the specified Date object in ISO 8601 date format (e.g. "2010-10-30").
        getDateInISO8601DateFormat: function (d) {
            function pad(n) { return n < 10 ? '0' + n : n; }
            return d.getUTCFullYear() + '-' +
                pad(d.getUTCMonth() + 1) + '-' +
                pad(d.getUTCDate());
        },

        // Base64-encodes the specified string, using UTF-8.
        base64EncodeString: function (text) {

            // Base64-encodes the specified string, using UTF-8.  This is the modern, preferred version, but its
            // minimum IE version is 10.
            function base64EncodeStringModernVersion(text) {
                /*\
                |*|
                |*|  Base64 / binary data / UTF-8 strings utilities
                |*|
                |*|  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
                |*|
                \*/

                // NOTE: some MDN functions aren't included here, because they're not needed for encoding.


                /* Base64 string to array encoding */

                function uint6ToB64(nUint6) {

                    return nUint6 < 26 ?
                        nUint6 + 65
                      : nUint6 < 52 ?
                        nUint6 + 71
                      : nUint6 < 62 ?
                        nUint6 - 4
                      : nUint6 === 62 ?
                        43
                      : nUint6 === 63 ?
                        47
                      :
                        65;

                }

                function base64EncArr(aBytes) {

                    var nMod3, sB64Enc = "";

                    for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
                        nMod3 = nIdx % 3;
                        if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
                        nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
                        if (nMod3 === 2 || aBytes.length - nIdx === 1) {
                            sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
                            nUint24 = 0;
                        }
                    }

                    return sB64Enc.replace(/A(?=A$|$)/g, "=");

                }

                /* DOMString to UTF-8 array */

                function strToUTF8Arr(sDOMStr) {

                    var aBytes, nChr, nStrLen = sDOMStr.length, nArrLen = 0;

                    /* mapping... */

                    for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
                        nChr = sDOMStr.charCodeAt(nMapIdx);
                        nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3 : nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6;
                    }

                    aBytes = new Uint8Array(nArrLen);

                    /* transcription... */

                    for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
                        nChr = sDOMStr.charCodeAt(nChrIdx);
                        if (nChr < 128) {
                            /* one byte */
                            aBytes[nIdx++] = nChr;
                        } else if (nChr < 0x800) {
                            /* two bytes */
                            aBytes[nIdx++] = 192 + (nChr >>> 6);
                            aBytes[nIdx++] = 128 + (nChr & 63);
                        } else if (nChr < 0x10000) {
                            /* three bytes */
                            aBytes[nIdx++] = 224 + (nChr >>> 12);
                            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
                            aBytes[nIdx++] = 128 + (nChr & 63);
                        } else if (nChr < 0x200000) {
                            /* four bytes */
                            aBytes[nIdx++] = 240 + (nChr >>> 18);
                            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
                            aBytes[nIdx++] = 128 + (nChr & 63);
                        } else if (nChr < 0x4000000) {
                            /* five bytes */
                            aBytes[nIdx++] = 248 + (nChr >>> 24);
                            aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
                            aBytes[nIdx++] = 128 + (nChr & 63);
                        } else /* if (nChr <= 0x7fffffff) */ {
                            /* six bytes */
                            aBytes[nIdx++] = 252 + /* (nChr >>> 32) is not possible in ECMAScript! So...: */ (nChr / 1073741824);
                            aBytes[nIdx++] = 128 + (nChr >>> 24 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
                            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
                            aBytes[nIdx++] = 128 + (nChr & 63);
                        }
                    }

                    return aBytes;

                }

                return base64EncArr(strToUTF8Arr(text));
            }

            // Base64-encodes the specified string, using UTF-8.  This is the fallback version that should work
            // evern for all versions of IE.
            function base64EncodeStringFallbackVersion(text) {
                /**
                *
                *  Base64 encode / decode
                *  http://www.webtoolkit.info/
                *
                **/

                var Base64 = {

                    // private property
                    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

                    // public method for encoding
                    encode: function (input) {
                        var output = "";
                        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                        var i = 0;

                        input = Base64._utf8_encode(input);

                        while (i < input.length) {

                            chr1 = input.charCodeAt(i++);
                            chr2 = input.charCodeAt(i++);
                            chr3 = input.charCodeAt(i++);

                            enc1 = chr1 >> 2;
                            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                            enc4 = chr3 & 63;

                            if (isNaN(chr2)) {
                                enc3 = enc4 = 64;
                            } else if (isNaN(chr3)) {
                                enc4 = 64;
                            }

                            output = output +
                            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

                        }

                        return output;
                    },

                    // private method for UTF-8 encoding
                    _utf8_encode: function (string) {
                        string = string.replace(/\r\n/g, "\n");
                        var utftext = "";

                        for (var n = 0; n < string.length; n++) {

                            var c = string.charCodeAt(n);

                            if (c < 128) {
                                utftext += String.fromCharCode(c);
                            }
                            else if ((c > 127) && (c < 2048)) {
                                utftext += String.fromCharCode((c >> 6) | 192);
                                utftext += String.fromCharCode((c & 63) | 128);
                            }
                            else {
                                utftext += String.fromCharCode((c >> 12) | 224);
                                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                                utftext += String.fromCharCode((c & 63) | 128);
                            }

                        }

                        return utftext;
                    }
                };

                return Base64.encode(text);
            }

            // Try the modern version first; if failed, rely on the fallback version.
            try {
                return base64EncodeStringModernVersion(text);
            }
            catch (e) {
                return base64EncodeStringFallbackVersion(text);
            }
        }
    };
});
