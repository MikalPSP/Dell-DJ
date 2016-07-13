var Background = function(){};
var background = new Background();

chrome.app.runtime.onLaunched.addListener(function(event) {
  var window = chrome.app.window.create("index.html",{
      id: "Main",
      outerBounds: {
        width: 1280, height: 768,
        minWidth: 1280, minHeight: 720,
      },
      frame: "none",
      resizable: true,
  });

  if (event.source=='file_handler' && event.id=='audio') {
    var songs = event.items.slice(0,2);
    songs.forEach(function(v,i){
      if (v){
        v.entry.file(function(f){
          background.dispatchEvent({type: 'loadsong',file: f,which: i===0?'left':'right'});
        });
      }
    });
  }
});

chrome.storage.onChanged.addListener(function(changes,type){
  for (var key in changes) {
    var change = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed from %s to %s.',key,type,change.oldValue,change.newValue);
  }
});