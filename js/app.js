(function() {

  /* Different functions */

  // Convert seconds to MM:SS format
  String.prototype.toMMSS = function () {
    var sec_num = parseInt(this, 10),
        minutes = Math.floor((sec_num) / 60),
        seconds = sec_num - (minutes * 60);

    if (seconds < 10) { seconds = '0' + seconds; }
    if (minutes < 10) { minutes = '0' + minutes; }
    return minutes + ':' + seconds;
  }

  // Recieve GET params from url
  function getQueryParams(qs) {
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
  }

  function getSelectedText() {
      if (window.getSelection) {
        return window.getSelection().toString();
      } else if (document.selection) {
        return document.selection.createRange().text;
      }

      return '';
  }

  // Save current db state to local storage
  function saveDB() {
    chrome.storage.local.set({'database': _db});
  }

  var video = document.querySelector('video'),
      controlButton = document.querySelector('.control'),
      timeCounter = document.querySelector('.time');

  var videoTitle = document.querySelector('.title');

  var prevFrame = document.querySelector('button.frame.prev'),
      nextFrame = document.querySelector('button.frame.next'),
      prevButton = document.querySelector('button.action.prev'),
      nextButton = document.querySelector('button.action.next'),
      screenshotButton = document.querySelector('button.screenshot'),
      addStepButton = document.querySelector('button.addstep'),
      closeSidebar = document.querySelector('button.closesidebar'),
      voiceButton = document.querySelector('button.selectvoice');

  var timeline = document.querySelector('.points'),
      pointer = document.querySelector('.pointer'),
      cursor = document.querySelector('.line'),
      spinner = document.querySelector('.spinner');

  var sidebar = document.querySelector('aside');
  var recordedVoice = document.getElementById('recordedvoice');

  var totalTime;

  /* Get video and prepare it for using */

  var _id, _db, _video;
  function getVideo() {
    chrome.runtime.sendMessage({action: 'getVideo'}, function(data) {
      if (data.video == 'pending' || data.video.src === undefined) {
        var waitForVideo = setTimeout(function() {
          getVideo();
        }, 2000);
      } else {
        var data = data.video;

        chrome.storage.local.get('database', function(response) {
          _id = md5(data.title);

          totalTime = data.totalTime / 1000;

          if (response.database === undefined) {
            var db = [];
          } else {
            var db = response.database;

            // if this video already exists in database
            // get all data about this video from database
            for (var i = db.length - 1; i >= 0; i--) {
              if (db[i].id == _id) {
                data = db[i];
              }
            }
          }

          // Store database and current video
          // to the local variables
          _video = data;
          _db = db;

          placePoints(data.clicks, totalTime);

          if (data.steps !== undefined) {
            placeSteps(data.steps);
          }

          var found = false;
          for (var i = _db.length - 1; i >= 0; i--) {
            if (_db[i].id == _id) {
              found = true;
              break;
            }
          }

          if (!found) {
            newVideo = {
              id: _id,
              title: data.title,
              date: data.date,
              src: data.src,
              voice: data.voice,
              clicks: _video.clicks,
              blob: data.blob,
              totalTime: totalTime
            };

            // Insert new video to local database
            _db.push(newVideo);
            _video = newVideo;
            // Remove last video if their count > 5
            if (_db.length > 5) {
              _db.shift();
            }
          }

          saveDB();

          addSource(data.src, data.title);
        });
      }
    });
  }

  var getParam = getQueryParams(document.location.search);
  if (getParam.id) {
    chrome.storage.local.get('database', function(response) {
      var db = response.database;
      _db = db;

      for (var i = db.length - 1; i >= 0; i--) {
        if (db[i].id == getParam.id) {
          var data = db[i];
          _video = data;

          _id = data.id;
          totalTime = data.totalTime;

          placePoints(data.clicks, totalTime);
          addSource(data.src, data.title);

          if (data.steps !== undefined) {
            placeSteps(data.steps);
          }

          return;
        }
      }
    });
  } else {
    getVideo();
  }

  function addSource(src, title) {
    var source = document.createElement('source');
    source.src = src;
    source.type = 'video/webm';

    video.appendChild(source);
    video.style.opacity = 1;

    videoTitle.value = title;

    cursor.max = totalTime;

    // Show "Select text from voice" if we have recorded voice
    if (_video.voice) {
      document.querySelector('.right-modal').classList.add('active');
    }

    spinner.classList.add('loaded');
  }

  /* Points */

  function placePoints(clicks, totalTime) {
    for (var click in clicks) {
      var newPoint = document.createElement('div');

      var time = (clicks[click].time / 1000).toFixed(2);

      // Not 100% - points will fall from the timeline
      newPoint.style.left = (time / totalTime) * 98 + '%';

      newPoint.setAttribute('data-time', time);
      newPoint.setAttribute('data-x', clicks[click].x);
      newPoint.setAttribute('data-y', clicks[click].y);

      newPoint.classList.add('point');

      newPoint.addEventListener('click', function() {
        video.pause();

        if (this.classList.contains('active')) {
          return;
        }

        setActivePoint(this);
        changeVideoTime(parseFloat(this.getAttribute('data-time')));
      });

      timeline.appendChild(newPoint);
    }
  }

  function setActivePoint(point) {
    var active = document.querySelector('.point.active');
    if (active) {
      setTimeout(function() {
        active.classList.remove('active');
      }, 100);
    }

    if (point) {
      point.classList.add('active');

      var pointer = document.createElement('div');
      pointer.classList.add('pointer');

      spinner.appendChild(pointer);

      pointer.style.left = (parseFloat(point.getAttribute('data-x')) / video.videoWidth) * video.offsetWidth - (pointer.clientWidth / 2) + video.offsetLeft + 'px';
      pointer.style.top = (parseFloat(point.getAttribute('data-y')) / video.videoHeight) * video.offsetHeight - pointer.clientHeight + video.offsetTop + 10 + 'px';

      setTimeout(function() {
        pointer.style.opacity = 1;

        setTimeout(function() {
          pointer.style.opacity = 0;
          setTimeout(function() {
            pointer.remove();
          }, 200);
        }, 100);
      }, 100);
    }
  }

  function changePoint() {
    video.pause();

    var currentPoint = document.querySelector('.point.active'),
        newPoint;

    if (!currentPoint) {
      if (this.classList.contains('prev')) {
        var nodes = document.querySelectorAll('.point');
        newPoint = nodes[nodes.length - 1];
      } else {
        newPoint = document.querySelector('.point');
      }
    } else if (this.classList.contains('prev')) {
      if (currentPoint.previousElementSibling === null) {
        var nodes = document.querySelectorAll('.point');
        newPoint = nodes[nodes.length - 1];
      } else {
        newPoint = currentPoint.previousElementSibling;
      }
    } else {
      if (currentPoint.nextElementSibling === null) {
        newPoint = document.querySelector('.point');
      } else {
        newPoint = currentPoint.nextElementSibling;
      }
    }

    changeVideoTime(parseFloat(newPoint.getAttribute('data-time')));
    setActivePoint(newPoint);
  }

  /* Video */

  function playVideo() {
    if (video.paused) {
      controlButton.classList.add('active');
      video.play();
    } else {
      controlButton.classList.remove('active');
      video.pause();
    }
  }

  function changeVideoTime(time) {
    video.currentTime = parseFloat(time);
  }

  function changeFrame() {
    video.pause();

    if (this.classList.contains('prev')) {
      video.currentTime -= 0.1;
    } else {
      video.currentTime += 0.1;
    }

    setActivePoint();
  }

  var globalTime = 0, timelineTimer;
  function globalTimer() {
    timelineTimer = setInterval(function() {
      globalTime += 0.01;

      point = document.querySelector('.point[data-time="' + globalTime.toFixed(2) + '"]');
      setActivePoint(point);

      cursor.value = globalTime;
    }, 10);
  }

  cursor.addEventListener('input', function() {
    video.pause();
    video.currentTime = this.value;
  });

  videoTitle.onblur = function() {
    var val = this.value;
    // If number
    if (val !== '') {
      _video.title = val;
      saveDB();
    }
  };

  video.onpause = function() {
    clearInterval(timelineTimer);
    controlButton.classList.remove('active');
  };

  video.onplaying = function() {
    globalTime = parseFloat(video.currentTime.toFixed(2));
    globalTimer();
  };

  video.onended = function() {
    controlButton.classList.remove('active');
    clearInterval(timelineTimer);

    cursor.value = 100;
  };

  video.ontimeupdate = function() {
    timeCounter.innerHTML = video.currentTime.toString().toMMSS();
    cursor.value = video.currentTime;
  };

  /* Sidebar and steps */

  // Insert step to the sidebar
  function placeStep(list, image, number, newbee) {
    var step = document.createElement('li');
    var img = document.createElement('img');
    var button = document.createElement('button');

    button.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';

    img.src = image;

    button.classList.add('step-remove');

    step.appendChild(button);
    step.appendChild(img);
    step.setAttribute('data-number', number);

    if (newbee) {
      step.style.display = 'none';
      $(step).appendTo(list);

      $(step).slideDown(400);
      step.classList.add('bounce');
      $('div.wrapper').animate({ 'scrollTop': $(list)[0].scrollHeight }, 1400);

      setTimeout(function() {
        step.classList.remove('bounce');
      }, 2400);
    } else {
      list.appendChild(step);
    }
  }

  // Prepare steps and place to the sidebar
  var stepsCountTitle = document.querySelector('#steps-count');
  function placeSteps(data, number) {
    sidebar.classList.add('active');
    closeSidebar.classList.add('active');

    var list = sidebar.querySelector('ul');
    var stepsCount = parseInt(stepsCountTitle.innerHTML);

    if (data.length !== undefined) {
      for (var i = 0; i < data.length; i++) {
        placeStep(list, data[i].image, i);
      }

      stepsCount = data.length;
    } else if (number !== undefined) {
      placeStep(list, data.image, number, true);
      stepsCount++;
    }

    stepsCountTitle.innerHTML = stepsCount;
  }

  $('#steps').sortable({
    appendTo: sidebar,
    axis: 'y',
    containment: sidebar,
    placeholder: 'placeholder',
    opacity: 0.7,
    forcePlaceholderSize: true,
    revert: 50,
    update: function(event, ui) {
      var newSteps = [];
      var allSteps = document.querySelectorAll('#steps li:not(.ui-sortable-placeholder)');
      for (var i = 0; i < allSteps.length; i++) {
        newSteps.push(_video.steps[allSteps[i].getAttribute('data-number')]);
      }

      _video.steps = newSteps;
      saveDB();
    }
  });

  // Remove one step
  $(document).on('click', '#steps .step-remove', function(e) {
    e.stopPropagation();

    $(this).parent().remove();
    _video.steps.splice($(this).parent().attr('data-number'), 1);

    stepsCountTitle.innerHTML = _video.steps.length;

    if (_video.steps.length == 0) {
      sidebar.classList.remove('active');
      closeSidebar.classList.remove('active');

      delete _video.steps;
    }

    saveDB();
  });

  // Open step info
  var number;
  $(document).on('click', '#steps li', function() {
    number = parseInt(this.getAttribute('data-number'));
    var data = _video.steps[number];

    $('#stepinfo').find('#step-img').attr('src', data.image);
    $('#stepinfo').find('#step-info').html(data.description);
    $('#stepinfo').modal('show');
  });

  $(document).on('blur', '#step-info', function() {
    _video.steps[number].description = this.value;
    saveDB();
  });

  // Add step
  function addStep() {
    var _this = this;
    var description = document.querySelector('#step-description').value;

    _this.disabled = true;

    $('#createstep').modal('hide');

    canvas.deactivateAll().renderAll();

    if (_video.steps === undefined) {
      _video.steps = [];
    }

    var step = {
      'image': canvas.toDataURL(),
      'description': description
    };

    _video.steps.push(step);
    saveDB();

    placeSteps(step, _video.steps.length - 1);

    _this.disabled = false;

    if (!sidebar.classList.contains('active')) {
      sidebar.classList.add('active');
      closeSidebar.classList.add('active');
    }
  }

  $('#createstep').on('hide.bs.modal', function() {
    $('#step-description').val('Step description...');
  });

  function removeAllSteps() {
    sidebar.classList.remove('active');
    closeSidebar.classList.remove('active');

    setTimeout(function() {
      document.getElementById('steps').innerHTML = '';
      stepsCountTitle.innerHTML = 0;

      delete _video.steps;
      saveDB();
    }, 500);
  }

  function selectVoice() {
    recordedVoice.innerHTML = _video.voice;
    $('#selectvoice').modal('show');
  }

  var highlights;
  var hltr = new TextHighlighter(document.getElementById('recordedvoice'), {
    color: '#fff8a2',
    onAfterHighlight: function (range, hlts) {
        if (hlts[0].classList.contains('selected')) {
          hlts[0].classList.remove('selected');
        }

        $('.step-voice-btn').fadeIn();
        return true;
    },
  });

  $('#selectvoice').on('show.bs.modal', function(e) {
    if (_video.highlight !== undefined) {
      highlights = _video.highlight;
    }

    recordedVoice.innerHTML = _video.voice;
    hltr.deserializeHighlights(highlights);

    $('#createstep').modal('hide');
  });

  $(document).on('click', '.step-voice-discard', function() {
    hltr.removeHighlights();
    $('.step-voice-btn').fadeOut();
  });

  $(document).on('click', '.step-voice-select', function() {
    $('#selectvoice').modal('hide');

    var selected = hltr.getHighlights();
    if (selected.length !== 0) {
      var textarea = $('#createstep').find('.step-description');
      textarea.val('');

      var j = 0;
      for (var i = 0; i < selected.length; i++) {
        if (!selected[i].classList.contains('selected')) {
          selected[i].classList.add('selected');
          if (j++ == 0) {
            textarea.val(selected[i].innerHTML);
          } else {
            textarea.val(textarea.val() + ' ' + selected[i].innerHTML);
          }
        }
      }

      highlights = hltr.serializeHighlights();
      _video.highlight = highlights;
      saveDB();
    }
  });

  $('#selectvoice').on('hide.bs.modal', function(e) {
    $('#createstep').modal('show');
  });

  controlButton.addEventListener('click', playVideo);

  prevFrame.addEventListener('click', changeFrame);
  nextFrame.addEventListener('click', changeFrame);

  prevButton.addEventListener('click', changePoint);
  nextButton.addEventListener('click', changePoint);

  addStepButton.addEventListener('click', addStep);
  closeSidebar.addEventListener('click', function() {
    sidebar.classList.toggle('active')
  });

  voiceButton.addEventListener('click', selectVoice);

  document.querySelector('button#steps-remove_all').addEventListener('click', removeAllSteps);

  document.querySelector('button.export').addEventListener('click', function() {
    $('#export').modal('show');
  });

  $('#websites').on('show.bs.modal', function(e) {
    $('#export').modal('hide');
  })

  $('#websites').on('hide.bs.modal', function(e) {
    $('#export').modal('show');
  });

  var blocks = document.querySelectorAll('.export-block');
  [].forEach.call(blocks, function(block) {
    block.addEventListener('click', function() {
      block.classList.add('loading');
    });
  });

  document.querySelector('.export-block.gdrive').addEventListener('click', function() {
    saveToGoogle(_video.steps, videoTitle.value, this);
  });

  document.querySelector('.export-block.pdf').addEventListener('click', function() {
    var _this = this;
    pdfMake.createPdf(preparePDF(_video.steps)).download(videoTitle.value);
    setTimeout(function() {
      _this.classList.remove('loading');
    }, 1000);
  }, true);

  var CLIENT_ID = '487334839414-ahg8ljj3cee1eq6ro3ugh022q2l1815m.apps.googleusercontent.com';
  var SCRIPT_ID = "1lcOgCXGo1C_P0LauYKr8LxviDauPwJNjBWrrWyEmcAVsLfbbOIvJV_1v";
  var SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://sites.google.com/feeds'
  ];

  function handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
      getSitesList();
    } else {
      gapi.auth.authorize({
        'client_id': CLIENT_ID,
        'scope': SCOPES.join(' '),
        'immediate': false
      }, handleAuthResult);
    }
  }

  function checkAuth() {
    gapi.auth.authorize({
      'client_id': CLIENT_ID,
      'scope': SCOPES.join(' '),
      'immediate': true
    }, handleAuthResult);
  }

  $(document).on('click', '#websites-list a', function() {
    website = $(this).html();
    $('#websites').modal('hide');
    updateSite();
  });

  $('#websites').on('hide.bs.modal', function(e) {
    if (website == undefined) {
      if ($('#websites-domain-url').val() == '') {
        document.querySelector('.export-block.gsites').classList.remove('loading');
      } else {
        _domain = $('#websites-domain-url').val();
        getSitesList(_domain);

        $('#websites-domain-url').val('');
      }
    }

    setTimeout(function() {
      if (!$('#websites .websites-domain').hasClass('hidden')) {
        $('#websites .websites-domain').toggleClass('hidden');
      }
    }, 500);
  });

  var _domain = false, website;
  function getSitesList(domain) {
    domain = domain || false;

    gapi.client.request({
      'root': 'https://script.googleapis.com',
      'path': 'v1/scripts/' + SCRIPT_ID + ':run',
      'method': 'POST',
      'body': {
        'function': 'getSitesList',
        'devMode': false,
        'parameters': {
          'domain': domain,
        }
      }
    }).execute(function(resp) {
      if (domain && resp.error != undefined) {
        alert(resp.error.details[0].errorMessage);
      } else {
        switch (true) {
          case !domain && resp.response.result.length == 0:
            $('#websites #websites-list').hide();
            $('#websites .websites-domain').toggleClass('hidden');

            $('#websites').modal('show');
          break;

          case resp.response.result.length == 0:
            alert("You don't have any website. Please create at least one website and try again.");
            document.querySelector('.export-block.gsites').classList.remove('loading');
          break;

          case resp.response.result.length == 1:
            website = resp.response.result[0];
            updateSite();
          break;

          default:
            var sites = resp.response.result;

            $('#websites #websites-list').html('');
            $('#websites').modal('show');

            for (var i in sites) {
              $('#websites #websites-list').append(
                $('<a href="#" class="list-group-item">').append(sites[i])
              );
            }

            $('#websites #websites-list').show();
          break;
        }
      }
    });
  }

  function updateSite() {
    var content = [];
    for (var i = 0; i < _video.steps.length; i++) {
      content.push({
        'img': _video.steps[i].image.replace(/data:(.*);base64,/g, ''),
        'text': _video.steps[i].description
      });
    }

    gapi.client.request({
        'root': 'https://script.googleapis.com',
        'path': 'v1/scripts/' + SCRIPT_ID + ':run',
        'method': 'POST',
        'body': {
          'function': 'createNewPage',
          'parameters': {
            'domain': _domain ? _domain : false,
            'website': website,
            'title': videoTitle.value,
            'name': videoTitle.value.replace(/\s+/g, '-').toLowerCase(),
            'video': _video.blob.replace(/data:(.*);base64,/g, ''),
            'content': content
          },
          'devMode': false
        }
    }).execute(function(resp) {
      if (resp.error && resp.error.status) {
        console.log('Error calling API: ' + JSON.stringify(resp, null, 2));
      } else if (resp.error) {
        var error = resp.error.details[0];
        console.log('Error message: ' + error.errorMessage);
      }

      var block = document.querySelector('.export-block.gsites');

      block.classList.add('complete');
      setTimeout(function() {
        block.classList.remove('loading');
        block.classList.remove('complete');
      }, 2000);
    });

    // Set to undefined
    website = (function () { return; })();
  }

  document.querySelector('.export-block.gsites').addEventListener('click', function() {
    checkAuth();
  }, true);

  document.querySelector('.export-block.doc').addEventListener('click', function() {
    var _this = this;
    var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title></title></head><body style="text-align:center;font-family:\'Arial\';"><h1>' + videoTitle.value + '</h1><br>';

    for (var i = 0; i < _video.steps.length; i++) {
      content += '<img src="' + _video.steps[i].image + '">';
      content += '<h2>Step ' + parseInt(i+1) + '</h2>';
      content += '<p>' + _video.steps[i].description + '</p>';
    }

    content += '</body></html>';

    saveAs(htmlDocx.asBlob(content, {
      orientation: 'landscape'
    }), videoTitle.value + '.docx');

    setTimeout(function() {
      _this.classList.remove('loading');
    }, 1000);
  }, true);

  document.querySelector('.export-block.archive').addEventListener('click', function() {
    exportArchive(_video.steps, videoTitle.value, this);
  });

  function preparePDF(steps) {
    var content = [];
    var docDefinition = {
      pageOrientation: 'landscape',
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          margin: [0, 0, 0, 15]
        },
        step: {
          alignment: 'center',
          fontSize: 18
        }
      }
    };

    content.push({
      text: videoTitle.value,
      style: 'header',
      alignment: 'center'
    });

    for (var i = 0; i < steps.length; i++) {
      content.push({
        text: 'Step ' + parseInt(i+1) + '\n\n',
        style: 'step'
      });

      content.push({
        text: steps[i].description + '\n\n',
        alignment: 'center'
      });

      content.push({
          image: steps[i].image,
          width: 600,
          alignment: 'center'
      });

      if (i + 1 < steps.length) {
        content[content.length - 1].pageBreak = 'after';
      }
    }

    docDefinition.content = content;
    return docDefinition;
  }

  function exportArchive(steps, title, elem) {
    // Create PDF file and get put result to the zip
    pdfMake.createPdf(preparePDF(steps)).getBuffer(function(pdf) {
      var zip = new JSZip();

      zip.file(title + '.pdf', pdf);
      zip.file(title + '.webm', _video.blob.replace(/data:(.*);base64,/g, ''), {base64: true});

      for (var i = steps.length - 1; i >= 0; i--) {
        zip.file('Step' + parseInt(i+1) + '.png', steps[i].image.replace(/data:(.*);base64,/g, ''), {base64: true});
      }

      zip.generateAsync({type: 'blob'}).then(function(content) {
        saveAs(content, title + '.zip');
      });

      elem.classList.remove('loading');
    });
  }

  function saveToGoogle(steps, title, elem) {
    pdfMake.createPdf(preparePDF(steps)).getBuffer(function(pdf) {
      pdf.name = title;

      var gdocs = new GDocs();
      gdocs.auth(true, function() {
        gdocs.upload(pdf, function() {
          elem.classList.add('complete');
          setTimeout(function() {
            elem.classList.remove('loading');
          }, 2000);
        }, true);
      });
    });
  }

  screenshotButton.addEventListener('click', function() {
    video.pause();
    canvas.clear();

    var point = document.querySelector('.point.active');
    var found = false;
    var minValue = 1000;
    var time;

    if (point) {
      time = point.getAttribute('data-time');

      for (var i=0; i < _video.clicks.length; i++) {
        if ((_video.clicks[i].time / 1000).toFixed(2) == time) {
          point = _video.clicks[i];
          found = true;
          break;
        }
      }
    }

    var width = video.videoWidth;
    var height = video.videoHeight;

    var wScale = 2;
    var hScale = 2.5;

    if (width < minValue && height < minValue) {
      canvas.setWidth(width);
      canvas.setHeight(height);
    } else {
      canvas.setHeight(height / hScale);
      canvas.setWidth(width / wScale);
    }

    var tmpc = document.createElement('canvas');
    tmpc.width = width;
    tmpc.height = height;

    ctx = tmpc.getContext('2d');

    var x, y, bgX, bgY;
    if (found) {
      x = _video.clicks[i].x;
      y = _video.clicks[i].y;

      if (x > (width - canvas.width / wScale)) {
        bgX = -(width - canvas.width);
      } else if (x < canvas.width / wScale) {
        bgX = 0;
      } else {
        bgX = -(x - (canvas.width / wScale));
      }

      if (y > (height - canvas.height / hScale)) {
        bgY = -(height - canvas.height);
      } else if (y < canvas.height / wScale) {
        bgY = 0;
      } else {
        bgY = -(y - (canvas.height / wScale));
      }

      ctx.drawImage(video, 0, 0, width, height);
    } else {
      x = 0;
      y = 0;
      bgX = 0;
      bgY = 0;

      if (width > minValue || height > minValue) {
        ctx.drawImage(video, 0, 0, width / wScale, height / wScale);
      } else {
        ctx.drawImage(video, 0, 0, width, height);
      }
    }

    bg = new fabric.Image(tmpc, {
      left: bgX,
      top: bgY,
      hasRotatingPoint: false,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      evented: false,
      selectable: false
    });

    canvas.add(bg);

    if (found) {
      var box = new fabric.Rect({
        left: x + bgX - 90,
        top: y + bgY - 50,
        width: 180,
        height: 100,
        strokeWidth: 4,
        fill: 'transparent',
        opacity: 1,
        stroke: 'red',
        transparentCorners: false,
        hasRotatingPoint : false
      });

      box.on({
        'scaling': function(e) {
          var obj = this,
            w = obj.width * obj.scaleX,
            h = obj.height * obj.scaleY,
            s = obj.strokeWidth;

          obj.set({
            'height'     : h,
            'width'      : w,
            'scaleX'     : 1,
            'scaleY'     : 1
          });
        }
      });

      canvas.add(box);
      addArrowToCanvas(x + bgX, y + bgY, (x + bgX < 250) ? 'left' : 'right');
    }

    $('#createstep').modal('show');

    canvas.off('mouse:over').on('mouse:over', function(e) {
        isOver = true;
        originColor = e.target.get('fill');
        if (e.target && !canvas.getActiveObject()) {
            if (e.target.get('pointType') === 'arrow_start') {
                e.target.set('fill', 'black');
          } else if (e.target.get('pointType') === 'arrow_end') {
                e.target.set('fill', 'black');
          }

            canvas.renderAll();
        } else {
            isOver = false;
        }
    });

    canvas.off('mouse:out').on('mouse:out', function(e) {
        if (e.target && isOver) {
            if (e.target.get('pointType')) {
                if (e.target.get('pointType') === 'arrow_start') {
                    e.target.set('fill', originColor);
                } else if (e.target.get('pointType') === 'arrow_end') {
                    e.target.set('fill', 'transparent');
                } else {
                    return;
                }

                isOver = false;

                canvas.discardActiveObject();
                canvas.renderAll();
            }
        }
    });

    canvas.renderAll();
  });
})();
