var EXPORTED_SYMBOLS = ["TorrentClient"];

const XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

/**
 * Transmission torrent client
 * @param info Torrent info
 * @param delegate Delegate for showing fancy text stuff
 * @constructor
 */
function TorrentClient(info, delegate) {
    this.info = info;
    this.delegate = delegate;
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    this.loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
    this.keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/l";
    this.session_id = null;
    this.add = function() {
        var that = this;
        // Add paused? defaults to YES!
        var addPaused = that.prefManager.getBoolPref("extensions.addtotransmission.addpaused");

        if (that.info.magnet) {
            // Send the magnet link
            that.upload(JSON.stringify({method: "torrent-add", arguments: {filename: that.info.href, paused: addPaused}}));
        } else {
            // Try to download the torrent file
            that.showText('downloadingString');
            try {
                var request = new XMLHttpRequest();
                request.open("GET", that.info.href, true);
                request.overrideMimeType('text/plain; charset=x-user-defined');
                request.onreadystatechange = function() {
                    if (request.readyState == 4) {
                        // Base64 encode the metadata
                        var metainfo = that.encodeBinary(request.responseText);

                        that.upload(JSON.stringify({method: "torrent-add", arguments: {metainfo: metainfo, paused: addPaused}}));
                    }
                }

                request.send(null);
            } catch (e) {
                that.showText('failedFetchString', true);
            }
        }
    };

    this.upload = function(data) {
        var that = this;

        that.showText('sendingString');
        var troubleshooting = this.prefManager.getBoolPref("extensions.addtotransmission.troubleshooting");
        var request = new XMLHttpRequest();
        var username = that.prefManager.getCharPref("extensions.addtotransmission.username");
        var url = that.prefManager.getCharPref("extensions.addtotransmission.url");
        var password = false;
        var logins = that.loginManager.findLogins({}, "chrome://addtotransmission", url, null);
        for (var i=0; i< logins.length; i++) {
            if (logins[i].username == username) {
                password = logins[i].password;
                break;
            }
        }

        if (username.length > 0 && password != false) {
            request.open("POST", that.prefManager.getCharPref("extensions.addtotransmission.url"), true, username, password);
        } else {
            request.open("POST", that.prefManager.getCharPref("extensions.addtotransmission.url"), true);
        }

        if (that.session_id) {
            request.setRequestHeader("X-Transmission-Session-Id", that.session_id);
        }

        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                var response = request.responseText;
                try {
                    if (response.length > 0) {
                        if (response.search(/invalid session-id/i) != -1) {
                            var matches = response.match(/<code>X-Transmission-Session-Id: (.*)<\/code>/);
                            that.session_id = matches[1];
                            that.upload(data);
                        } else if (response.search(/unauthorized/i) != -1) {
                            that.showText('unauthorizedString', true);
                        } else {
                            var json_response = JSON.parse(response);
                            if (json_response.result == 'success') {
                                that.showText('successString', true);
                            } else {
                                if (!troubleshooting) {
                                    if (json_response.result == 'duplicate torrent') {
                                        that.showText('duplicateTorrentString', true);
                                    } else if (json_response.result == 'invalid or corrupt torrent file') {
                                        that.showText('invalidTorrentString', true);
                                    } else {
                                        that.showText('unknownErrorString', true);
                                    }
                                } else {
                                    that.showText(json_response.result.charAt(0).toUpperCase() + json_response.result.slice(1), true);
                                }
                            }
                        }
                    } else {
                        that.showText('couldNotConnectString', true);
                    }
                } catch (e) {
                    that.showText('unknownErrorString', true);
                }
            }
        };

        request.send(data);
    };
    this.showText = function(str, close) {
        if (!close) {
            close = false;
        }

        if (delegate == null) {
            return;
        }

        this.delegate.showText(str, this.info.id, close);
    };

    // From http://emilsblog.lerch.org/2009/07/javascript-hacks-using-xhr-to-load.html
    this.encodeBinary = function(input) {
        var output = "";
        var bytebuffer;
        var encodedCharIndexes = new Array(4);
        var inx = 0;
        var paddingBytes = 0;

        while(inx < input.length){
            // Fill byte buffer array
            bytebuffer = new Array(3);
            for(var jnx = 0; jnx < bytebuffer.length; jnx++)
                if(inx < input.length)
                    bytebuffer[jnx] = input.charCodeAt(inx++) & 0xff; // throw away high-order byte, as documented at: https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
                else
                    bytebuffer[jnx] = 0;

            // Get each encoded character, 6 bits at a time
            // index 1: first 6 bits
            encodedCharIndexes[0] = bytebuffer[0] >> 2;
            // index 2: second 6 bits (2 least significant bits from input byte 1 + 4 most significant bits from byte 2)
            encodedCharIndexes[1] = ((bytebuffer[0] & 0x3) << 4) | (bytebuffer[1] >> 4);
            // index 3: third 6 bits (4 least significant bits from input byte 2 + 2 most significant bits from byte 3)
            encodedCharIndexes[2] = ((bytebuffer[1] & 0x0f) << 2) | (bytebuffer[2] >> 6);
            // index 3: forth 6 bits (6 least significant bits from input byte 3)
            encodedCharIndexes[3] = bytebuffer[2] & 0x3f;

            // Determine whether padding happened, and adjust accordingly
            paddingBytes = inx - (input.length - 1);
            switch(paddingBytes){
                case 2:
                    // Set last 2 characters to padding char
                    encodedCharIndexes[3] = 64;
                    encodedCharIndexes[2] = 64;
                    break;
                case 1:
                    // Set last character to padding char
                    encodedCharIndexes[3] = 64;
                    break;
                default:
                    break; // No padding - proceed
            }
            // Now we will grab each appropriate character out of our keystring
            // based on our index array and append it to the output string
            for(var jnx = 0; jnx < encodedCharIndexes.length; jnx++)
                output += this.keyStr.charAt(encodedCharIndexes[jnx]);
        }
        return output;
    };
}