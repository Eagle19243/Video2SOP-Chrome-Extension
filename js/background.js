function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i=0; i<5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

var recorderTab;
var runtime = chrome.runtime.connect();

// Listener for all events which are sent from listener.js
var clicks, positions = [];
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (isRecording) {
    if (request.newClick) {
      var newClick = request.newClick;
      newClick.time -= startTime;
      clicks.push(newClick);
    }
  }

  if (request.action) {
    switch (request.action) {
      case 'newVideo':
        clicks = [];
        positions = [];

        executed = false;
        newVideo = false;

        if (recorderTab) {
          chrome.tabs.remove(recorderTab);
        }

        chrome.tabs.create({
          'url': chrome.extension.getURL('recorder.html'),
          'active': false
        }, function(tab) {
          recorderTab = tab.id;
        });
      break;

      case 'stopRecording':
        if (isRecording) {
          captureDesktop();

          chrome.tabs.query({}, function(tabs) {
            for (var i=0; i < tabs.length; i++) {
              chrome.tabs.sendMessage(tabs[i].id, {
                action: 'stopRecording'
              });
            }

            setTimeout(function() {
              chrome.tabs.sendMessage(recorderTab, {
                action: 'getVoice'
              }, function(response) {
                newVideo.voice = response.recordedVoice;
                chrome.tabs.remove(recorderTab);
                recorderTab = false;
              });
            }, 5000);
          });
        }
      break;

      case 'getVideo':
        if (newVideo.voice !== undefined) {
          sendResponse({video: newVideo});
        } else {
          sendResponse({video: 'pending'});
        }
      break;
    }
  }
});

var runtimePort;
chrome.runtime.onConnect.addListener(function(port) {
  runtimePort = port;

  runtimePort.onMessage.addListener(function(message) {
    if (!message || !message.messageFromContentScript1234) {
      return;
    }

    if (message.sdp) {
      createAnswer(message.sdp);
    }
  });
});

chrome.browserAction.setIcon({
  path: 'img/icon.png'
});

runtime.onDisconnect.addListener(function() {
  chrome.tabs.query({}, function (tabs) {
    for (var i=0; i < tabs.length; i++) {
      if (tabs[i].url.indexOf('chrome://') == -1) {
        chrome.tabs.executeScript(tabs[i].id, {
          file: 'public/listener.min.js'
        });
      }
    }
  });
});

function captureDesktop() {
  if (recorder && recorder.stream && recorder.stream.onended) {
    recorder.stream.onended();
    return;
  }

  chrome.browserAction.setIcon({
    path: 'img/icon.png'
  });

  try {
    chrome.desktopCapture.chooseDesktopMedia(['window', 'audio'], onAccessApproved);
  } catch (e) {
    getUserMediaError();
  }
}

function getChromeVersion() {
  var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  return raw ? parseInt(raw[2], 10) : 52;
}

var resolutions = {
  maxWidth: 29999,
  maxHeight: 8640
};

var audioStream = true;
var videoMaxFrameRates = '';

var recorder;
function onAccessApproved(chromeMediaSourceId) {
  if (!chromeMediaSourceId || !chromeMediaSourceId.toString().length) {
    chrome.tabs.remove(recorderTab);
    recorderTab = false;

    if (getChromeVersion() < 53) {
      getUserMediaError();
      return;
    }

    askToStopExternalStreams();
    setDefaults();
    return;
  }

  // Hide download bar. Otherwise clicks position will be wrong
  chrome.downloads.setShelfEnabled(false);

  // Send message to all tabs to start listener
  chrome.tabs.query({}, function (tabs) {
    for (var i=0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, {
        action: 'startRecording'
      });
    }
  });

  var constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: chromeMediaSourceId
      },
      optional: []
    },
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: chromeMediaSourceId
      },
      optional: [
        { maxFrameRate: 15 }
      ],
    }
  };

  if (resolutions.maxWidth && resolutions.maxHeight) {
    constraints.video.mandatory.maxWidth = resolutions.maxWidth;
    constraints.video.mandatory.maxHeight = resolutions.maxHeight;
  }

  navigator.webkitGetUserMedia(constraints, gotStream, getUserMediaError);

  function gotStream(stream) {
    var options = {
      type: 'video',
      disableLogs: false,
      recorderType: MediaStreamRecorder,
      mimeType: 'video/webm;codecs=vp9',
      audioBitsPerSecond: 60 * 1000,
      videoBitsPerSecond: 1024 * 1000
    };

    if (audioStream && audioStream.getAudioTracks && audioStream.getAudioTracks().length) {
      audioPlayer = document.createElement('audio');
      audioPlayer.src = URL.createObjectURL(audioStream);

      audioPlayer.onended = function() {
        console.warn('Audio player is stopped.');
      };

      audioPlayer.onpause = function() {
        console.warn('Audio player is paused.');
      };

      audioPlayer.play();

      audioPlayer.muted = true;

      context = new AudioContext();

      var gainNode = context.createGain();
      gainNode.connect(context.destination);
      gainNode.gain.value = 0; // don't play for self

      mediaStreamSource = context.createMediaStreamSource(audioStream);
      mediaStreamSource.connect(gainNode);

      mediaStreamDestination = context.createMediaStreamDestination();
      mediaStreamSource.connect(mediaStreamDestination);

      stream.addTrack(mediaStreamDestination.stream.getAudioTracks()[0]);
    }

    recorder = RecordRTC(stream, options);

    // Focus the last focused window to place mouse pointer
    chrome.windows.getLastFocused({populate: false}, function(currentWindow) {
      chrome.windows.update(currentWindow.id, {
        focused: true,
        drawAttention: true
      });
    });

    try {
      startTime = new Date().getTime();
      recorder.startRecording();
      alreadyHadGUMError = false;
    } catch (e) {
      getUserMediaError();
    }

    recorder.stream = stream;

    isRecording = true;
    onRecording();

    recorder.stream.onended = function() {
      if (recorder && recorder.stream) {
        recorder.stream.onended = function() {};
      }

      stopScreenRecording();

      var today = new Date();
      var dd = today.getDate();
      var mm = today.getMonth() + 1; // January is 0
      var yyyy = today.getFullYear();

      if (dd < 10) {
          dd = '0' + dd;
      } 

      if (mm < 10) {
          mm = '0' + mm;
      } 

      today = dd + '.' + mm + '.' + yyyy;

      newVideo = {
        title: (new Date).toISOString().replace(/:|\./g, '-'),
        date: today,
        totalTime: new Date().getTime() - startTime,
        clicks: clicks,
        positions: positions
      }
    };

    recorder.stream.getVideoTracks()[0].onended = function() {
      if (recorder && recorder.stream && recorder.stream.onended) {
        recorder.stream.onended();
      }
    };

    initialTime = Date.now()
    timer = setInterval(checkTime, 100);
  }
}

function askToStopExternalStreams() {
  try {
    runtimePort.postMessage({
      stopStream: true,
      messageFromContentScript1234: true
    });
  } catch (e) {}
}

var peer, newVideo;
function stopScreenRecording() {
  isRecording = false;

  recorder.stopRecording(function() {
    recorder.getDataURL(function(blob) {
      newVideo.blob = blob;

      var fileName = makeid() + '.webm';
      var formData = new FormData();
      var loadUrl = 'http://video2sop.com/';

      formData.append('video-filename', fileName);
      formData.append('video-blob', recorder.getBlob());

      xhr(loadUrl + 'download.php', formData, function (file) {
          newVideo.src = loadUrl + file;
      });

      function xhr(url, data, callback) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
          if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
          }
        };

        request.open('POST', url);
        request.send(data);
      }
    });

    chrome.tabs.create({'url': chrome.extension.getURL('index.html')});

    setTimeout(function() {
      setDefaults();
    }, 1000);

    askToStopExternalStreams();

    try {
      peer.close();
      peer = null;
    } catch (e) {}

    try {
      audioPlayer.src = null;
      mediaStreamDestination.disconnect();
      mediaStreamSource.disconnect();
      context.close();
      context.disconnect();
      context = null;
    } catch (e) {}
  });

  if (timer) {
    clearTimeout(timer);
  }

  setBadgeText('');

  chrome.browserAction.setTitle({
    title: 'Record Screen'
  });
}

function setDefaults() {
  chrome.browserAction.setIcon({
    path: 'img/icon.png'
  });

  if (recorder && recorder.stream) {
    recorder.stream.stop();
    if (recorder && recorder.stream && recorder.stream.onended) {
      recorder.stream.onended();
    }
  }

  recorder = null;
  isRecording = false;
  imgIndex = 0;
}

var isRecording = false;
var imgIndex = 0;
var img = [
  'progress-1.png',
  'progress-2.png',
  'progress-3.png',
  'progress-4.png',
  'progress-5.png'
];

function onRecording() {
  chrome.browserAction.setIcon({
    path: 'img/' + img[imgIndex]
  });

  imgIndex++;

  if (imgIndex > img.length - 1) {
    imgIndex = img.length - 1;
    reverse = true;
  }

  if (isRecording) {
    setTimeout(onRecording, 800);
    return;
  }

  chrome.browserAction.setIcon({
    path: 'img/icon.png'
  });
}

function setBadgeText(text) {
  chrome.browserAction.setBadgeBackgroundColor({
    color: [255, 0, 0, 255]
  });

  chrome.browserAction.setBadgeText({
    text: text + ''
  });
}

var initialTime, timer;
function checkTime() {
  if (!initialTime) return;
  var timeDifference = Date.now() - initialTime;
  var formatted = convertTime(timeDifference);
  setBadgeText(formatted);

  chrome.browserAction.setTitle({
    title: 'Recording duration: ' + formatted
  });
}

function convertTime(miliseconds) {
  var totalSeconds = Math.floor(miliseconds / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds - minutes * 60;

  minutes += '';
  seconds += '';

  if (seconds.length === 1) {
    seconds = '0' + seconds;
  }

  return minutes + ':' + seconds;
}

var alreadyHadGUMError = false;
function getUserMediaError() {
  if (!alreadyHadGUMError) {
    audioStream = false;
    // Below line makes sure we retried merely once
    alreadyHadGUMError = true;

    videoMaxFrameRates = '';
    videoCodec = 'Default';

    captureDesktop();
    return;
  }

  askToStopExternalStreams();
  setDefaults();
}

function executeScript(tabId) {
  chrome.tabs.update(tabId, {
    active: true
  });
}

function createAnswer(sdp) {
  peer = new webkitRTCPeerConnection(null);

  peer.onicecandidate = function(event) {
    if (!event || !!event.candidate) return;

    try {
      runtimePort.postMessage({
        sdp: peer.localDescription,
        messageFromContentScript1234: true
      });
    } catch (e) {}
  };

  peer.oniceconnectionstatechange = function() {
    peer && console.debug('ice-state', {
      iceConnectionState: peer.iceConnectionState,
      iceGatheringState: peer.iceGatheringState,
      signalingState: peer.signalingState
    });
  };

  peer.onaddstream = function(event) {
    audioStream = event.stream;
    captureDesktop();
  };

  peer.setRemoteDescription(new RTCSessionDescription(sdp));

  peer.createAnswer(function(sdp) {
    peer.setLocalDescription(sdp);
  }, function() {}, {
    optional: [],
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: false
    }
  });
}

var audioPlayer;
var context;
var mediaStreamSource;
var mediaStreamDestination;
var startTime;
