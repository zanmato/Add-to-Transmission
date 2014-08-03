Components.utils.import("chrome://addtotransmission/content/torrentClient.js");

var uriContentListener = {
    QueryInterface: function(aIID) {
        if (aIID.equals(Components.interfaces.nsISupports)
            || aIID.equals(Components.interfaces.nsIURIContentListener)
            || aIID.equals(Components.interfaces.nsISupportsWeakReference)
            ) {
            return this;
        }
        return false;
    },
    canHandleContent: function(contentType, isContentPreferred, desiredContentType) {
        return false;
    },
    doContent: function(contentType, isContentPreferred, request, contentHandler) {
        var torrentInfo = {'href': request.URI.spec, 'id': null, 'magnet': false};
        var newTorrent = new TorrentClient(torrentInfo, null);
        newTorrent.add();
        return true;
    },
    isPreferred: function(contentType, desiredContentType) {
        if (contentType == "application/x-bittorrent") {
            return true;
        }

        return false;
    },
    onStartURIOpen: function(URI) {
        return true;
    }
};

function TorrentClientDelegate() {
    this.showText = function(str, id, close) {
        var bubble = content.document.getElementById(id);
        if (bubble != null) {
            var bundles = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
            var strings = bundles.createBundle("chrome://addtotransmission/locale/overlay.properties");
            bubble.textContent = strings.GetStringFromName(str);
            bubble.style.display = 'block';
            bubble.style.opacity = 0.9;
            if (close) {
                // Fade out, set timeout to remove it
                setTimeout(function() {
                    if (typeof(content.document.body) !== 'undefined') {
                        try {
                            content.document.getElementById(id).style.opacity = 0;
                        } catch (e) {
                            /*Do nothing*/
                        }
                    }
                }, 1000);
                setTimeout(function() {
                    if (typeof(content.document.body) !== 'undefined') {
                        try {
                            content.document.body.removeChild(content.document.getElementById(id));
                        } catch (e) {
                            /*Do nothing*/
                        }
                    }
                }, 5000);
            }
        }
    };
}

var AddToTransmission = {
    session_id: false,
    userInfo: false,
    prefManager: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
    lastClickEvent: null,
    launchListener: function() {
        if (this.prefManager.getBoolPref("extensions.addtotransmission.downloads")) {
            var uriLoader = Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader);
            uriLoader.registerContentListener(uriContentListener);
        }
    },
    onLoad: function(e) {
        var that = this;
        var contextMenu = document.getElementById("contentAreaContextMenu");

        if (contextMenu) {
            window.addEventListener("contextmenu", function (e) { that.handleContextMenu(e); }, false);
            this.loadCSS();
        }

        var anchors = content.document.getElementsByName("a");
        console.log("brooo");
        for (var i = 0; i < anchors.length; i++) {
            console.log("iaiia");
            anchors[i].addEventListener("click", function(event) {
                console.log("douchebag");
                that.lastClickEvent = event;
            });
        }
    },
    loadCSS: function() {
        var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
        var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI("chrome://addtotransmission/content/style.css", null, null);

        if (!sss.sheetRegistered(uri, sss.USER_SHEET)) {
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
        }
    },
    findParentNode: function(parentName, childObj) {
        var testObj = childObj.parentNode;
        var count = 1;
        while (testObj.nodeName != parentName && count < 50) {
            testObj = testObj.parentNode;
            if (testObj == null) {
                return false;
            }
            count++;
        }

        if (testObj.nodeName == "A") {
            return testObj.href;
        } else if (testObj.nodeName == "FORM") {
            return testObj.action;
        } else {
            return false;
        }
    },
    handleContextMenu: function(event) {
        var menu = document.getElementById('addtotransmission-ctx');

        var href = false;
        if (event.target.nodeName == "A") {
            href = event.target.href;
        } else if (event.target.nodeName == "INPUT" || event.target.nodeName == "BUTTON") {
            href = this.findParentNode("FORM", event.target);
        } else {
            href = this.findParentNode("A", event.target);
        }

        var allLinks = this.prefManager.getBoolPref("extensions.addtotransmission.alllinks");

        if (href != false && (href.toLowerCase().indexOf('.torrent') != -1 || href.toLowerCase().indexOf('magnet:?') != -1 || allLinks)) {
            var magnet = (href.toLowerCase().indexOf('magnet:?') != -1 ? true : false);
            var d = new Date();
            var id = d.getTime();

            var placement = this.prefManager.getCharPref("extensions.addtotransmission.placement");

            var bubble = content.document.createElement("div");
            bubble.id = id;
            bubble.className = "att-bubble arrow";
            bubble.style.display = 'none';

            var pos = {};
            switch (placement) {
                case 'b':
                    pos = {top: event.pageY + 30, left: event.pageX - 70};
                    bubble.className += " bottom";
                    break
                case 't':
                    pos = {top: event.pageY - 70, left: event.pageX - 70};
                    bubble.className += " top";
                    break
                case 'l':
                    pos = {top: event.pageY - 22, right: (content.document.body.offsetWidth-event.pageX) + 70};
                    bubble.className += " left";
                    break
                case 'r':
                    pos = {top: event.pageY - 22, left: event.pageX + 70};
                    bubble.className += " right";
                    break
            }

            if (pos.left) {
                bubble.style.left = pos.left+"px";
            } else {
                bubble.style.right = pos.right+"px";
            }
            bubble.style.top = pos.top+"px";

            content.document.body.appendChild(bubble);

            menu.hidden = false;
            this.userInfo = {'href':href,'id':id,'magnet':magnet};
            return;
        }
        menu.hidden = true;
        this.userInfo = false;
    },
    contextMenuItemClicked: function(event) {
        if (typeof this.userInfo == 'boolean') {
            return;
        }

        var delegate = new TorrentClientDelegate();
        var newTorrent = new TorrentClient(this.userInfo, delegate);
        newTorrent.add();
    }
};

window.addEventListener("load", function(e) {
    AddToTransmission.onLoad(e);
}, false);