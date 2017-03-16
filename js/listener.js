chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action !== undefined) {
    if (!started && request.action == 'startRecording') {
      document.addEventListener('mousedown', mouseListener, true);
      document.addEventListener('keyup', escListener, false);

      started = true;
    }

    if (request.action == 'stopRecording') {
      document.removeEventListener('mousedown', mouseListener, true);
      document.removeEventListener('keyup', escListener, false);

      started = false;
    }
  }
});

var mouseListener = function(e) {
  chrome.runtime.sendMessage({
    newClick: {
      x: e.clientX,
      y: e.clientY + window.outerHeight - window.innerHeight,
      time: new Date().getTime()
    }
  });
};

var escListener = function(e) {
  if (e.keyCode == 27) {
    chrome.runtime.sendMessage({action: 'stopRecording'});
  }
};

document.addEventListener('mousedown', mouseListener, true);
document.addEventListener('keyup', escListener, false);

var started = true;