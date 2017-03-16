// Convert seconds to MM:SS format
String.prototype.toMMSS = function () {
  var sec_num = parseInt(this, 10),
      minutes = Math.floor((sec_num) / 60),
      seconds = sec_num - (minutes * 60);

  if (seconds < 10) { seconds = '0' + seconds; }
  if (minutes < 10) { minutes = '0' + minutes; }
  return minutes + ':' + seconds;
}

/* Voice Recognition */

var recognized = '';
var recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = function(event) {
  var result = event.results[event.results.length - 1];
  if (result.isFinal) {
    recognized += result[0].transcript;
    console.log(recognized);

    $('.recognition').typed({
      strings: [result[0].transcript],
      typeSpeed: 5
    });
  }
};

recognition.onerror = function(event) {
  console.debug(event.error);
};

var timer = 0;
var timerOutput = document.querySelector('.timer');
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == 'startRecording') {
    setInterval(function() {
      timer++;
      timerOutput.innerHTML = timer.toString().toMMSS();
    }, 1000);
  }

  if (request.action == 'getVoice') {
    sendResponse({recordedVoice: recognized});
  }
});

recognition.lang = 'en-US';
recognition.start();

/* Audio Recorder */

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.audioContext = new AudioContext();
} catch (e) {
  alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
  audio: true,
  video: false
};

function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  var soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  soundMeter.connectToSource(stream, function(e) {
    if (e) {
      alert(e);
      return;
    }
    setInterval(function() {
      $('#meter').css({zoom: 1 + soundMeter.instant})
    }, 10);
  });
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

var runtimePort = chrome.runtime.connect({
  name: 'content-script'
});

var peer;
runtimePort.onMessage.addListener(function(message) {
  if (!message || !message.messageFromContentScript1234) {
    return;
  }

  if (message.sdp) {
    peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
  }

  if (message.stopStream && stream) {
    stream.getAudioTracks()[0].stop();
    stream = null;

    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }

    if (peer) {
      peer.close();
      peer = null;
    }
  }
});

var stream, audioPlayer;
navigator.webkitGetUserMedia({
  audio: true
}, function(s) {
  stream = s;

  audioPlayer = document.createElement('audio');
  audioPlayer.muted = true;
  audioPlayer.volume = 0;
  audioPlayer.src = URL.createObjectURL(stream);
  (document.body || document.documentElement).appendChild(audioPlayer);
  audioPlayer.play();

  peer = new webkitRTCPeerConnection(null);

  peer.addStream(stream);

  peer.onicecandidate = function(event) {
    if (!event || !!event.candidate) return;

    runtimePort.postMessage({
      sdp: peer.localDescription,
      messageFromContentScript1234: true
    });
  };

  peer.oniceconnectionstatechange = function() {
    peer && console.debug('ice-state', {
      iceConnectionState: peer.iceConnectionState,
      iceGatheringState: peer.iceGatheringState,
      signalingState: peer.signalingState
    });
  };

  peer.createOffer(function(sdp) {
    peer.setLocalDescription(sdp);
  }, function() {}, {
    optional: [],
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  });
}, function() {});

/* Soundmeter */

var colors = new Array(
  [62,35,255],
  [60,255,60],
  [255,35,98],
  [45,175,230],
  [255,0,255],
  [255,128,0]);

var step = 0;
var colorIndices = [0,1,2,3];
var gradientSpeed = 0.005;

function updateGradient() {
  var c0_0 = colors[colorIndices[0]];
  var c0_1 = colors[colorIndices[1]];
  var c1_0 = colors[colorIndices[2]];
  var c1_1 = colors[colorIndices[3]];

  var istep = 1 - step;
  var r1 = Math.round(istep * c0_0[0] + step * c0_1[0]);
  var g1 = Math.round(istep * c0_0[1] + step * c0_1[1]);
  var b1 = Math.round(istep * c0_0[2] + step * c0_1[2]);
  var color1 = "rgb("+r1+","+g1+","+b1+")";

  var r2 = Math.round(istep * c1_0[0] + step * c1_1[0]);
  var g2 = Math.round(istep * c1_0[1] + step * c1_1[1]);
  var b2 = Math.round(istep * c1_0[2] + step * c1_1[2]);
  var color2 = "rgb("+r2+","+g2+","+b2+")";

  $('#meter').css({background: "-webkit-gradient(linear, left top, right top, from("+color1+"), to("+color2+"))"})

  step += gradientSpeed;

  if ( step >= 1 ) {
    step %= 1;
    colorIndices[0] = colorIndices[1];
    colorIndices[2] = colorIndices[3];

    colorIndices[1] = ( colorIndices[1] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
    colorIndices[3] = ( colorIndices[3] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
  }
}

setInterval(updateGradient, 10);
