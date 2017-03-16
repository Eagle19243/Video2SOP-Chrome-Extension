function getSitesList() {
  var sites = SitesApp.getSites();
  
  var arr = [];
  for (var i in sites) {
    arr.push(sites[i].getName());
  }

  return arr;
}

function createNewPage(data) {
  try {
    // Add video to Google Drive
    var decoded = Utilities.base64Decode(data.video);
    var blob = Utilities.newBlob(decoded, 'video/webm', data.title);
    var video = DriveApp.createFile(blob);

    var site = SitesApp.getSiteByUrl('https://sites.google.com/site/' + data.website);

    var descendants = site.getAllDescendants({
      search: data.title
    });
    
    // Delete this page if already exists
    if (descendants[0]) {
      descendants[0].deletePage();
    }

    var page = site.createWebPage(data.title, data.name, '');

    // Add all images as attachments
    for (var i in data.content) {
      var decoded = Utilities.base64Decode(data.content[i].img);
      var blob = Utilities.newBlob(decoded, MimeType.PNG, 'step_' + i);
      page.addHostedAttachment(blob);
    }

    // Prepare page content
    var j = 0;
    var content = '<iframe src="https://drive.google.com/file/d/' + video.getId() + '/preview;align:center"></iframe>';
    var attachments = page.getAttachments();
    for(var i in attachments) {
      content += '<h2>Step ' + parseInt(j+1) + '</h2><p>' + data.content[j++].text + '</p><img src="' + attachments[i].getUrl() + '" /><br><br><br>';
    }

    page.setHtmlContent(content);
  } catch (err) {
    Logger.log(err.toString());
  }
}
