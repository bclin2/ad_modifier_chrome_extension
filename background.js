// background.js
//chrome storage reset
chrome.storage.local.clear(function() {
  console.log("CLEARED CHROME STORAGE!!!!!");
});

// var testRedirectURL = "http://demo.tremorvideo.com/proddev/vast/vast_inline_linear.xml";
var redirectUrl;

var vastRedirectAddListener = function(details) {
  if (details.type === "script") {
    return;
  }
  var blockingResponse = {};
  var responseHeaders = details.responseHeaders;
  var statusFlag = false;
  var locationFlag = false;

  console.log(details);

  for (var i = 0; i < responseHeaders.length; i++) {
    if (responseHeaders[i].name === "Status" || responseHeaders[i].name === "status") {
      responseHeaders[i].value = "302";
      statusFlag = true;
    } else if (responseHeaders[i].name === "Location" || responseHeaders[i].name === "location") {
      responseHeaders[i].value = redirectUrl;
      locationFlag = true;
    } 
  }
  if (!locationFlag) {
    responseHeaders.push({"name": "Location", "value": redirectUrl});
  }
  if (!statusFlag) {
    responseHeaders.push({"name": "Status", "value": "302"});
  }
  //not adding the responseHeaders seem to make no difference
  blockingResponse.responseHeaders = responseHeaders;
  blockingResponse.redirectUrl = redirectUrl;
  return blockingResponse;
};


chrome.runtime.onConnect.addListener(function(port) {
  console.log("Connected...", port);
  //connect to content.js
  var backgroundPort;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    backgroundPort = chrome.tabs.connect(activeTab.id, {name: "backgroundToContent"});
  });
  port.onMessage.addListener(function(message) {
    console.log("message received: ", message);
    if (message.videoToggle) {
      console.log("Activating onHeadersReceived Listeners...");
      //send request for redirectUrl from content.js
      backgroundPort.postMessage({videoToggleListenersActive: true});
    } else {
      console.log("Deacivating onHeadersReceived Listeners");
      //removeEventListeners for Filters
      chrome.webRequest.onHeadersReceived.removeListener(vastRedirectAddListener);
      // backgroundPort.postMessage({videoToggleListenersActive: false});
      redirectURL = null;
    }

    if (message.redirectUrl) {
      console.log("content.js: ", message.redirectUrl);
      //receive redirectURL
      redirectUrl = message.redirectUrl;
      // console.log(redirectUrl);
      //add event listener 
      chrome.webRequest.onHeadersReceived.addListener(
        vastRedirectAddListener,
        {urls: [ '*://*.telemetryverification.net/*',
         '*://*.vindicosuite.com/*',
         '*://*.tidaltv.com/*',
         '*://*.mookie1.com/*',
         '*://*.doubleclick.net/*',
         '*://rtr.innovid.com/r1*',
         '*://*.freewheel.tv/*',
         '*://optimized-by.rubiconproject.com/a/api/vast*',
         '*://uswvideo.adsrvr.org/data/vast/*'
        ]},  //event filtering 
        ["blocking", "responseHeaders"]
      );  
    }
  });
});

//CHECK if event filtering is set to on/off
  //if ON, set event filters to ON, tell content.js to reload the page, and prompt users for a redirect URL in content.js
  //DEFAULT is OFF
