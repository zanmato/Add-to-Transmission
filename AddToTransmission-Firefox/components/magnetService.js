/** Thanks to mike.kaply for the example code */
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const nsIProtocolHandler = Ci.nsIProtocolHandler;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://addtotransmission/content/torrentClient.js");

function MagnetProtocol() {}

MagnetProtocol.prototype = {
    scheme: "magnet",
    protocolFlags: nsIProtocolHandler.URI_NORELATIVE |
        nsIProtocolHandler.URI_NOAUTH |
        nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

    newURI: function(aSpec, aOriginCharset, aBaseURI) {
        var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
        uri.spec = aSpec;
        return uri;
    },

    newChannel: function(aURI) {
        var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

        var torrentInfo = {'href': aURI.spec, 'id': null, 'magnet': true};
        var newTorrent = new TorrentClient(torrentInfo, null);
        newTorrent.add();

        return false;
    },

    classDescription: "Magnet Protocol Handler",
    contractID: "@mozilla.org/network/protocol;1?name=" + "magnet",
    classID: Components.ID('{e2ad1660-1b52-11e4-8c21-0800200c9a66}'),
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
};

var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
if (prefManager.getBoolPref("extensions.addtotransmission.downloads")) {
    if (XPCOMUtils.generateNSGetFactory) {
        var NSGetFactory = XPCOMUtils.generateNSGetFactory([MagnetProtocol]);
    } else {
        var NSGetModule = XPCOMUtils.generateNSGetModule([MagnetProtocol]);
    }
}