(function() {
    var browserSupportsSave = window.chrome || /Firefox/.test(navigator.userAgent);

    // true = choose a random title from all strips, false = choose a title from the titles of the 3 shown panels
    var totallyRandomTitle = false;

    // disable title replacement altogether
    var replaceTitlesToo = true;
    
    var imageBase = 'https://s3.amazonaws.com/webcomicname.mashup';
    var goodStripUrl = 'https://s3.amazonaws.com/webcomicname.mashup/stripnumbers.json?cache=' + (new Date()).getTime();
    var blankPanelImage = imageBase + '/strip_81_2.jpg';
    var cacheVersion = 6;
    
    // This is dumb but it was one way for me to exclude strips that were not correctly split into panels
    // without messing with links to comics that people have already created
    var goodStrips = null;
    var brokenTitles = [9, 17, 18, 20, 47, 48, 58, 68, 92, 93, 94, 109, 126, 136, 147, 148, 232];
    
    function retrieveGoodStrips(callback) {
      console.log(goodStripUrl);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', goodStripUrl, true);
      xhr.overrideMimeType("application/json");
      xhr.onreadystatechange = function(x) {
        if (xhr.readyState == 4) {
          goodStrips = JSON.parse(xhr.responseText)['stripnumbers'];
          callback();
        }
      }
      xhr.send(null);
    }
    
    function insertRandomTitle() {
      var goodTitles = goodStrips.filter(function(i) { return brokenTitles.indexOf(i) < 0 });

      var stripIndex =  Math.floor(Math.random() * goodTitles.length);
      var stripNumber = goodTitles[stripIndex];
      return insertTitle(stripNumber);
    }
    
    function insertTitle(stripNumber) {
      var container = document.getElementById('title_bar');
      var img = container.getElementsByClassName('title_bar__image')[0];
      if (!img) {
        img = document.createElement('img');
        img.className = 'title_bar__image';
      }

      img.crossOrigin = 'anonymous'; // crossOrigin stuff for the save button
      img.src = imageBase + '/title_' + stripNumber + '.png?v=' + cacheVersion;
      img.setAttribute('data-image-key', stripNumber + '_title');
      
      img.onclick = function() { 
        img.style.height = img.height + 'px';
        insertRandomTitle(); 
        saveState();
      };
      
      container.appendChild(img);
      return img;
    }
      
    
    function insertRandomPanel(panelIndex) {
      //
      // Special panel for International Oh No Day
      //
      var now = new Date();
      var ohNoDay = now.getDay() == 25 && now.getMonth() == 2;
      if (ohNoDay && panelIndex == 1) {
        insertPanel(151, 1);
        return 151;            
      }
                                             
                                             
      var strips = goodStrips;
      
      var stripIndex =  Math.floor(Math.random() * strips.length);
      var stripNumber = strips[stripIndex];
      insertPanel(stripNumber, panelIndex);
      return stripNumber;
    }
    
    
    function insertPanel(stripNumber, panelIndex) {
      var container = document.getElementById('comic_panel_' + panelIndex);

      var img = container.getElementsByClassName('comic__image')[0];
      
      if (!img) {
        img = document.createElement('img');
        img.className = 'comic__image';
      }
      
      img.onerror = function() { 
        img.className = 'comic__image';
        img.src = blankPanelImage; 
      };
      
      // you can click an image to swap it out with a new panel
      // shuffle CSS classes around to give it a little fade to white transition
      img.onclick = function() { 
        img.style.width = img.width + 'px';
        img.className = 'comic__image comic__image--replacing';
        img.onload = function() {
          img.width = 'auto';
          img.className = 'comic__image';
        };

        insertRandomPanel(panelIndex); 
        saveState();
      };
      
      // image URLs look like this: https://s3.amazonaws.com/webcomicname.mashup/strip_181_0.jpg
      // The format is: strip_[STRIP NUMBER]_[PANEL NUMBER].jpg
      var stripImageFile = stripNumber + '_' + panelIndex;
      
      img.crossOrigin = 'anonymous'; // crossOrigin stuff for the save button
      if (replaceTitlesToo) {
        img.src = imageBase + '/strip_' + stripImageFile + '_without_title.png?v=' + cacheVersion;
      } else {
        img.src = imageBase + '/strip_' + stripImageFile + '.jpg?v=' + cacheVersion;
      }
      
      img.setAttribute('data-image-key', stripImageFile);
      container.appendChild(img);
      return img;
    };
    
    
    // store the information about the current images in the URL/history so that 
    // the URL in the address bar will always link to the current comic
    function saveState(replace) {
      var keys = [];

      var images = document.querySelectorAll('.comic__image, .title_bar__image');
      for (var i=0; i<images.length; i++) {
        keys.push(images[i].getAttribute('data-image-key'));
      }

      // replaceState the URL with the image names so that we can share links
      var url = "?images=" + keys.join(',');
      if (replace) {
        history.replaceState({}, null, url);
      } else {
        history.pushState({}, null, url);
      }
    };


    function loadStrip() {
      if (!goodStrips) {
        retrieveGoodStrips(function() {
          loadStrip();
        });
        return;
      }
      
      var panelCount = document.getElementsByClassName('comic__panel').length;
      var filledPanels = [];
      var titleInserted = false;
      
      var savedState = window.location.search.match(/\?images=(.*)/);
      var includeTheLatestStrip = window.location.search.match(/\?latest=1/);
      
      if (savedState) {
        // someone is visiting a previously viewed strip. Load the images..
        var panels = savedState[1].split(',');
        
        for (var i=0; i<panels.length; i++) {
          var parts = panels[i].split('_');
          var stripNumber = parseInt(parts[0], 10);
          
          if (parts[1] == 'title') {
            insertTitle(stripNumber);
            titleInserted = true;
          } else {
            var panelIndex = parseInt(parts[1], 10);
            filledPanels[panelIndex] = stripNumber;
            insertPanel(stripNumber, panelIndex);
          }
        }
      }
      
      if (includeTheLatestStrip) {
        var latestStrip = goodStrips[goodStrips.length - 1];
        
        if (replaceTitlesToo) {
          insertTitle(latestStrip);
          titleInserted = true;
        }
        
        var randomPanel = Math.floor(Math.random() * panelCount);
        filledPanels[randomPanel] = latestStrip;
        insertPanel(latestStrip, randomPanel);
      }
      
      for (i=0; i<panelCount; i++) {
        if (filledPanels[i] == null) {
          filledPanels[i] = insertRandomPanel(i);
        }
      }

      if (!titleInserted && replaceTitlesToo) {
        if (totallyRandomTitle) {
          insertRandomTitle();
        } else {
          var randomTitle = Math.floor(Math.random() * panelCount);
          var randomTitleNumber = filledPanels[randomTitle];
          if (brokenTitles.indexOf(randomTitleNumber) < 0) {
            insertTitle(randomTitleNumber);
          } else {
            insertRandomTitle();
          }
        }
      }

      if (!savedState) {
        saveState(true);
      }
    }
    
    function setUpSaveButton() {
      var saveControl = document.getElementById('save_control');
      var saveLink = document.getElementById('save_link');
      saveControl.className = 'save_control save_control--supported';
      
      saveLink.onclick =  function() {
        // domToImage won't get it right if we don't make some adjustments to the styling first
        // we could copy everything to a new hidden element so people don't see the flash. but whatever this is fine!...
        document.getElementById('comic_container').className = 'comic_container comic_container--saving';

        domtoimage.toJpeg(document.getElementById('comic_container'), { bgcolor: 'white', cacheBust: true, quality: 0.95 }).then(function (dataUrl) {
          document.getElementById('comic_container').className = 'comic_container';
          var link = document.createElement('a');
          link.download = 'ohno.jpg';
          link.href = dataUrl;
          link.click();
        });
        
        return false;
      };
    }


    
    
    loadStrip();  
    
    window.onpopstate = function() {
      loadStrip();
    };
    
    if (browserSupportsSave) {
      setUpSaveButton();
    }
          
  })();