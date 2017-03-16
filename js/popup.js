function init() {
  chrome.runtime.sendMessage({action: 'stopRecording'});

  var button = document.querySelector('#create-video');
  var container = document.querySelector('.videos');

  button.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'newVideo'});
  });

  chrome.storage.local.get('database', function(response) {
    if (response.database) {
      db = response.database;

      for (var i = db.length - 1; i >= 0; i--) {
        var line = document.createElement('a');
        line.setAttribute('data-id', db[i].id);

        var title = document.createElement('h4');
        title.innerHTML = db[i].title;

        var date = document.createElement('p');
        date.innerHTML = db[i].date;

        line.appendChild(title);
        line.appendChild(date);

        line.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          chrome.tabs.create({'url': chrome.extension.getURL('index.html?id=' + id)});
        });

        container.appendChild(line);
      }
    }

    document.querySelector('.spinner').style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', init);
