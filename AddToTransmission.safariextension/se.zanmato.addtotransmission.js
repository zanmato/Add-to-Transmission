var settings = {};

document.addEventListener("contextmenu", handleContextMenu, false);
safari.self.addEventListener("message", getMessage, false);
safari.self.tab.dispatchMessage("getSettings");

function getMessage(theMessageEvent) {
  if (theMessageEvent.name === "att-progress") {
    var info = theMessageEvent.message.info;
    var status = theMessageEvent.message.message;
    var close = theMessageEvent.message.close;
    
    var bubble = document.getElementById(info.id);
    if (bubble != null) {
      bubble.innerHTML = status;
      bubble.style.display = 'block';
      bubble.style.opacity = 0.9;
      if (close) {
        // Fade out, set timeout to remove it
        bubble.style.opacity = 0;
        setTimeout('document.body.removeChild(document.getElementById(\''+info.id+'\'))', 5000);
      }
    }
  } else if (theMessageEvent.name === "setSettings") {
    settings = theMessageEvent.message;
  }
}

function findParentNode(parentName, childObj) {
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
}

function handleContextMenu(event) {
  var href = false;
  if (event.target.nodeName == "A") {
    href = event.target.href;
  } else if (event.target.nodeName == "INPUT" || event.target.nodeName == "BUTTON") {
    href = findParentNode("FORM", event.target);
  } else {
    href = findParentNode("A", event.target);
  }

  if (href != false && (href.toLowerCase().indexOf('.torrent') != -1 || href.toLowerCase().indexOf('magnet:?') != -1 || settings.allLinks)) {
    var magnet = (href.toLowerCase().indexOf('magnet:?') != -1 ? true : false);
    var d = new Date();
    var id = d.getTime();
    var bubble = document.createElement("div");
    bubble.id = id;
    bubble.className = "att-bubble";
    bubble.style.display = 'none';
    
    var pos = {};
    switch (settings.placement) {
      case 'b':
        pos = {top: event.pageY + 30, left: event.pageX - 70};
        bubble.className += " bottom";
        break
      case 't':
        pos = {top: event.pageY - 70, left: event.pageX - 70};
        bubble.className += " top";
        break
      case 'l':
        pos = {top: event.pageY - 22, right: (document.body.offsetWidth-event.pageX) + 70};
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
    
    document.body.appendChild(bubble);
    safari.self.tab.setContextMenuEventUserInfo(event, {'href':href,'magnet':magnet,'id':id});
    return;
  }
  safari.self.tab.setContextMenuEventUserInfo(event, false);  
}