document.addEventListener("contextmenu", handleContextMenu, false);
safari.self.addEventListener("message", getMessage, false);

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
	}
}

function findParentNode(parentName, childObj) {
	var testObj = childObj.parentNode;
	var count = 1;
	while (testObj.nodeName != parentName && count < 50) {
		testObj = testObj.parentNode;
		count++;
	}
    
	if (testObj.nodeName == "A") {
		return testObj.href;
	} else {
		return false;
	}
}

function handleContextMenu(event) {
	var href = false;
	if (event.target.nodeName == "A") {
		href = event.target.href;
	} else {
		href = findParentNode("A", event.target);
	}

	if (href != false && href.toLowerCase().substr(href.length-8, 8) == '.torrent') {
		var d = new Date();
		var id = d.getTime();
		var bubble = document.createElement("div");
		bubble.id = id;
		bubble.className = "att-bubble";
		bubble.style.left = (event.pageX-60)+"px";
		bubble.style.top = (event.pageY-100)+"px";
		bubble.style.display = 'none';
		document.body.appendChild(bubble);
		safari.self.tab.setContextMenuEventUserInfo(event, {'href':href,'id':id});
		return;
	}
	safari.self.tab.setContextMenuEventUserInfo(event, false);  
}