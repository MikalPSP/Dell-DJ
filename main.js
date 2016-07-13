//USB\VID_045E&PID_0291 for windows 7 and/or USB\VID_05C6&PID_924
//idVendor=045e, idProduct=0719
//products maybe 028E and 028F

var keyboardMap = ["","","","CANCEL","","","HELP","","BACK_SPACE","TAB","","","CLEAR","ENTER","RETURN","","SHIFT","CONTROL","ALT","PAUSE","CAPS_LOCK","KANA","EISU","JUNJA","FINAL","HANJA","","ESCAPE","CONVERT","NONCONVERT","ACCEPT","MODECHANGE","SPACE","PAGE_UP","PAGE_DOWN","END","HOME","LEFT","UP","RIGHT","DOWN","SELECT","PRINT","EXECUTE","PRINTSCREEN","INSERT","DELETE","","0","1","2","3","4","5","6","7","8","9","COLON","SEMICOLON","LESS_THAN","EQUALS","GREATER_THAN","QUESTION_MARK","AT","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","WIN","","CONTEXT_MENU","","SLEEP","NUMPAD0","NUMPAD1","NUMPAD2","NUMPAD3","NUMPAD4","NUMPAD5","NUMPAD6","NUMPAD7","NUMPAD8","NUMPAD9","MULTIPLY","ADD","SEPARATOR","SUBTRACT","DECIMAL","DIVIDE","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24","","","","","","","","","NUM_LOCK","SCROLL_LOCK","WIN_OEM_FJ_JISHO","WIN_OEM_FJ_MASSHOU","WIN_OEM_FJ_TOUROKU","WIN_OEM_FJ_LOYA","WIN_OEM_FJ_ROYA","","","","","","","","","","CIRCUMFLEX","EXCLAMATION","DOUBLE_QUOTE","HASH","DOLLAR","PERCENT","AMPERSAND","UNDERSCORE","OPEN_PAREN","CLOSE_PAREN","ASTERISK","PLUS","PIPE","HYPHEN_MINUS","OPEN_CURLY_BRACKET","CLOSE_CURLY_BRACKET","TILDE","","","","","VOLUME_MUTE","VOLUME_DOWN","VOLUME_UP","","","SEMICOLON","EQUALS","COMMA","MINUS","PERIOD","SLASH","BACK_QUOTE","","","","","","","","","","","","","","","","","","","","","","","","","","","OPEN_BRACKET","BACK_SLASH","CLOSE_BRACKET","QUOTE","","META","ALTGR","","WIN_ICO_HELP","WIN_ICO_00","","WIN_ICO_CLEAR","","","WIN_OEM_RESET","WIN_OEM_JUMP","WIN_OEM_PA1","WIN_OEM_PA2","WIN_OEM_PA3","WIN_OEM_WSCTRL","WIN_OEM_CUSEL","WIN_OEM_ATTN","WIN_OEM_FINISH","WIN_OEM_COPY","WIN_OEM_AUTO","WIN_OEM_ENLW","WIN_OEM_BACKTAB","ATTN","CRSEL","EXSEL","EREOF","PLAY","ZOOM","","PA1","WIN_OEM_CLEAR",""];
var padallow = true, keyallow=true, padwait, padcue;
var LED_ENABLED = false,
    MIDI_ENABLED = true,
    GAMEPAD_ENABLED = true,
    DISABLE_KEYS = false,
    TTS = false,
    CUE_MIX = false,
    NUM_GAMEPADS = 1,
    SAMPLES = [],
    SCRATCH_BUFFER = [], //for ding.ogg and endoise.mp3
    TIME_DISPLAY = true, // Displays time display
    REMAIN_TIME = true, // Shows remaining time display
    DEBUGGING = false,
    MAX_DECIMALS = 4, // Number of decimal places in "getAction()
    BPM_TAG = false, // Shows ### BPM
    DECK_SPIN = false, // Determines if deck animates.
    VISUALIZER = true, // Determines if top visualizer moves
    VISUAL_FADE = true, // Determines if visualizer fades based on crossfade position
    BLINK_SPEED = 0.2, // LED Blink Speed
    SLIDERS = false, // Hides sliders
    LOG_RESPONSE = true, // Improved response for sliders
    
    CROSSFADE = "curved", // Linear or Curved
    PLAY_MODE = 'play-stutter', // true = play-stutter | false = play-pause
    CUE_MODE = 'cue',
    
    KEYBOARD_MAP = new DeviceMapping("mappings/keyboard.xml");
    
/*
var DEVICE_MAPS = {
  'MixTrack Pro 3': new DeviceMapping("mappings/mixtrackpro3.xml",new MIDIDevice("devices/mixtrackpro3.xml")),
  'DJ2Go': new DeviceMapping("mappings/dj2go.xml",new MIDIDevice("devices/dj2go.xml"))
};
*/


//var midi = new MIDI(['mixtrackpro3','dj2go','djconsolermx2']);
//midi.debug = true;

function changeCueMix(){
  CUE_MIX = !CUE_MIX;
  if (CUE_MIX) {
    masterGain.disconnect();
    masterGain.connect(masterSplit);
    merger.connect(audioCtx.destination);
  } else {
    merger.disconnect();
    masterGain.connect(audioCtx.destination);
  }
}
window.onload = function(a) {
  if (Settings.get('LED_ENABLED')){
    dell.led.initialize(function(){dell.led.turnOn();});
  }
  timer.start();

  if (Settings.get('MIDI_ENABLED')) midi.request();
  if (Settings.get('GAMEPAD_ENABLED')) xbox.init(NUM_GAMEPADS);
  
  loadLocale();
  Settings.load();
};

window.onclose = function() {
  chrome.app.window.getAll().onEach(function(v){v.close();});
  timer.stop();
  if (provider && provider.unmount) provider.unmount();
};

var Settings = {
  data: {
   "MIDI_ENABLED": true,
   "EXPERIMENTAL_MIDI": false,
   "GAMEPAD_ENABLED": false,
   "BPM_TAG": false,
   "DECK_SPIN": false,
   "DECK_TIME": true,
   "VISUALIZER": true,
   "BLINK_SPEED": 0.2,
   "TIME_DISPLAY": true,
   "REMAIN_TIME": true,
   "VISUAL_FADE": true,
   "LINEAR_CROSSFADE": false,
   "COLOR_WAVEFORM": true
  },
  save: function() {
    chrome.storage.local.set(this.data,function(){
      $('.settings-btn').settingsRefresh();
    });
  },
  load: function() {
    var self = Settings;
    chrome.storage.local.get(Object.keys(self.data),function(data){
      for (var k in self.data){
        self.data[k] = data[k]!==undefined?data[k]:self.data[k];
      }
      $('.settings-btn').settingsRefresh();
    });
    
  },
  set: function(key,val) {
    if (Object.keys(this.data).includes(key)) {
      this.data[key] = val;
      this.save();
    }
    
  },
  get: function(key){
    if (Object.keys(this.data).includes(key))
      return this.data[key];
  }
};



function loadLocale() {
  var smp = chrome.i18n.getMessage('samples'),
      dir = chrome.i18n.getMessage('directory'),
      sng = chrome.i18n.getMessage('song'),
      key = chrome.i18n.getMessage('key'),
      art = chrome.i18n.getMessage('artist'),
      desc = chrome.i18n.getMessage('appDesc');
      
  $('#bottom .extras h1:first-of-type').text(smp);
  $('#directory h1:first-of-type').text(dir);
  $('th.key-header').text(key);
  $('th.song-header').text(sng);
  $('th.artist-header').text(art);
  if (desc) $('#app-desc').text(desc);
}

function Speak(msg,rate,lang) {
  if (!TTS) return;
  chrome.tts.isSpeaking(function(speaking){
    console.log(speaking);
    if (speaking)
      chrome.tts.stop();
    else
      chrome.tts.speak(msg,{'lang': lang||'en-GB', 'rate': rate||1});
  });
}

function handleDrop(e) {
  e = e.originalEvent;
  e.stopPropagation();
  e.preventDefault();
  
  var file = e.dataTransfer.files[0] || CURRENT_FILE_DRAG;
      which = $(this).attr('value');
      
  fs.loadSong(file,which);
}

function systemMessage(txt,type) {
  type = txt?type?type:'warning':'';
  $('.system-msg').attr('type',type.toLowerCase()).find('span').text(txt||'');

}

function decodeFile( file, callback ) {
  if (!callback) return;
  var reader = new FileReader();
  reader.onload = function() {
    audioCtx.decodeAudioData(reader.result,callback);
  };
  reader.readAsArrayBuffer(file);
}

function toDeg(rad) {return rad*(180/Math.PI);}
function toRad(deg) {return deg*(Math.PI/180);}
function repeat(fn,p){
  var d=false,i=0;
  var r=function(){
    if (d) return;
    fn(i,function(){d=true;});
    setTimeout(r,p);
    i+=1;
  };
  r();
  return function(){d=true;};
}
function getAngle(dom,evt,norm) {
  dom = dom.offsetParent;
  dom.midX = dom.midX || dom.offsetLeft + (dom.offsetWidth/2);
  dom.midY = dom.midY || dom.offsetTop + (dom.offsetHeight/2);

  var offsetX = evt.pageX - dom.midX,
      offsetY = evt.pageY - dom.midY,
      rad = Math.atan2(offsetX,offsetY),
      angle = toDeg(rad);

  angle = norm ? (angle<0 ? angle+=360 : angle>360 ? angle-=360 : angle) : angle;
  return {'angle':angle,'rad':rad,'x':offsetX,'y':offsetY};
}
var deckinuse = "left";
$('canvas.platter[value='+deckinuse+']')[0].style['box-shadow']='0px -1px 10px 1px blue'; //50px 1px

function changedeck(deck) {
  deckinuse=deck;
  var otherdeck = deckinuse=='right'?'left':'right';
  color = deckinuse=='left'?'blue':'red';
  $('canvas.platter[value='+deckinuse+']')[0].style['box-shadow']='0px -1px 10px 1px '+color;
  $('canvas.platter[value='+otherdeck+']')[0].style['box-shadow']='';
  dell.led.changeColor(color);
  //dj.blink(deckinuse);
}

function onKeyDown(key,e) {

  var deck = dj[deckinuse+'deck'];
  if (isNaN(parseInt(key.slice(-1)))===false){
    var c=parseInt(key.slice(-1));
    if (c===0) return;
    if (key.indexOf('CTRL+SHIFT+')!==-1) {
      deck.cue(c,true);
      //getAction('delcue '+c);
    } else if (key.indexOf('CTRL+ALT')!==-1) {
      deck.track.changeFX(1,'toggle');
    } else if (key.indexOf('CTRL+')!==-1) {
      getAction('cue '+c);
    }
  }
  // Special Keys
  
  switch (key){
    case 'ESCAPE':
      getAction('options');
      break;
    case 'CTRL+ALT+SHIFT+WIN':
      DISABLE_KEYS = !DISABLE_KEYS;
      break;
    case 'CTRL+O':
      fs.chooseDirectory();
      break;
    case 'CTRL+SHIFT+ESCAPE':
      chrome.runtime.reload();
      break;
    default:
  }
  if (!DISABLE_KEYS) {
    switch(key) {
      case 'SPACE':
        deck.play();
        break;
      case 'SHIFT+SPACE':
        deck.play(true); //Play Stutter
        break;
      case 'TAB':
        changedeck(deckinuse=='right'?'left':'right');
        break;
      case 'B': deck.track.tapBPM(); break;
      case 'CTRL+B': deck.track.tapBPM(true); break;
      case 'C': deck.cue(0); break;
      case 'SHIFT+C': deck.cue(0,true); break;
      case 'I': dj.zoomIn(); break;
      case 'O': dj.zoomOut(); break;
      case 'CTRL+O':
        fs.chooseDirectory();
        break;
      case '1': deck.track.setAutoLoop(1); break;
      case '2': deck.track.setAutoLoop(2); break;
      case '3': deck.track.setAutoLoop(4); break;
      case '4': deck.track.setAutoLoop(8); break;
      case 'OPEN_BRACKET':
        deck.track.setManualLoop(deck.track.lastBufferTime,null);
        break;
      case 'CLOSE_BRACKET':
        deck.track.setManualLoop(null,deck.track.lastBufferTime);
        break;
      case 'BACK_SLASH':
        if (deck.track.isLooping)
          deck.track.exitLoop();
        else
          deck.track.enterLoop();
          
        break;
      case 'MINUS': deck.track.setManualLoop(null,null,1/2); break;
      case 'EQUALS': deck.track.setManualLoop(null,null,2); break;
      case 'CTRL+ENTER': fs.browse(0); break;
      case 'CTRL+UP': fs.browse(1); break;
      case 'CTRL+DOWN': fs.browse(-1); break;
      default:
    }
  }
}

function onKeyUp(key,e){
  var deck = dj[deckinuse+'deck'];  
}

function onGamepad(state) {
  var step,
      bumperzone = state.deadZoneShoulder1,
      mapping = xbox.mapping;
  {
  state.leftStickButton = Gamepad.getRawState()[0].buttons[10];
  state.rightStickButton = Gamepad.getRawState()[0].buttons[11];
  state.xboxButton = Gamepad.getRawState()[0].buttons[16];
  state.A = state.faceButton0;
  state.B = state.faceButton1;
  state.X = state.faceButton2;
  state.Y = state.faceButton3;
  state.LX = state.leftStickX;
  state.LY = state.leftStickY;
  state.RX = state.rightStickX;
  state.RY = state.rightStickY;
  state.leftStickX = Math.abs(state.leftStickX)>state.deadZoneLeftStick?state.leftStickX:0;
  state.leftStickY = Math.abs(state.leftStickY)>state.deadZoneLeftStick?state.leftStickY:0;
  state.rightStickX = Math.abs(state.rightStickX)>state.deadZoneRightStick?state.rightStickX:0;
  state.rightStickY = Math.abs(state.rightStickY)>state.deadZoneRightStick?state.rightStickY:0;  
  }
  if (padallow) {
    if (state.start.pressed) {
      fs.browse();
      if (state.dpadUp.pressed) {                                               // GAMEPAD: Start + DPadUp
        padwait = "dpadUp";
        mapping.action('Start+DPadUp',null,true);
      } else if (state.dpadDown.pressed) {                                      // GAMEPAD: Start + DPadDown
        padwait = "dpadDown";
        mapping.action('Start+DPadDown',null,true);
      } else if (state.A.pressed) {                                             // GAMEPAD: Start + A
        padwait = "A";
        mapping.action('Start+A',null,true);
      } else if (state.select.pressed) {
        if (state.leftShoulder0.pressed) {                                      // GAMEPAD: Start + Select + L1
          mapping.action('Start+Select+L1',null,true);
        } else if (state.rightShoulder0.pressed) {                              // GAMEPAD: Start + Select + R1
          mapping.action('Start+Select+R1',null,true);
        } else {                                                                // GAMEPAD: Start + Select
          mapping.action('Start+Select',null,true);
        }
      }
    } else if (state.select.pressed) {
      var deck = dj[deckinuse+'deck'];
      if (state.dpadLeft.pressed) {                                             // GAMEPAD: Select + DPadLeft
        padwait = "dpadLeft";
        mapping.action('Select+DPadLeft',null,true);
      } else if (state.dpadRight.pressed) {                                     // GAMEPAD: Select + DPadRight
        padwait = "dpadRight";
        mapping.action('Select+DPadRight',null,true);
      } else if (state.dpadDown.pressed) {                                      // GAMEPAD: Select + DPadDown
        padwait = "dpadDown";
        mapping.action('Select+DpadDown',null,true);
      } else if (state.dpadUp.pressed) {                                        // GAMEPAD: Select + DPadUp
        padwait = "dpadUp";
        mapping.action('Select+DPadUp',null,true);
      } else if (state.X.pressed) {                                             // GAMEPAD: Select + X
        padwait = "X";
        mapping.action('Select+X',null,true);
      } else if (state.xboxButton && state.xboxButton.pressed) {                // GAMEPAD: Select + Xbox
        padwait = "xboxButton";
        mapping.action('Select+Xbox',null,true);
      }
    } else if (state.A.pressed) {
      padwait = "A";
      if (state.leftShoulder0.pressed && state.rightShoulder0.pressed)          // GAMEPAD: L1 + R1 + A
        mapping.action('L1+R1+A',null,true);
      else if (state.leftShoulder0.pressed)                                          // GAMEPAD: L1 + A
        mapping.action('L1+A',null,true);
      else if (state.rightShoulder0.pressed)                                    // GAMEPAD: R1 + A
        mapping.action('R1+A',null,true);
      else                                                                      // GAMEPAD: A
        mapping.action('A',null,true);
      
      //$('#'+deckinuse+'-deck .play-button').click();
    } else if (state.X.pressed) {
      padwait = "X";
      if (state.leftShoulder0.pressed && state.rightShoulder0.pressed)          // GAMEPAD: L1 + R1 + X
        mapping.action('L1+R1+X',null,true);
      else if (state.leftShoulder0.pressed)                                     // GAMEPAD: L1 + X
        mapping.action('L1+X',null,true);
      else if (state.rightShoulder0.pressed)                                    // GAMEPAD: R1 + X
        mapping.action('R1+X',null,true);
      else                                                                      // GAMEPAD: X
        mapping.action('X',null,true);
        
    } else if (state.Y.pressed) {
      padwait = "Y";
      if (state.leftShoulder0.pressed && state.rightShoulder0.pressed)          // GAMEPAD: L1 + R1 + Y
        mapping.action('L1+R1+Y',null,true);
      else if (state.leftShoulder0.pressed)                                     // GAMEPAD: L1 + Y
        mapping.action('L1+Y',null,true);
      else if (state.rightShoulder0.pressed)                                    // GAMEPAD: R1 + Y
        mapping.action('R1+Y',null,true);
      else                                                                      // GAMEPAD: Y
        mapping.action('Y',null,true);
        
    } else if (state.B.pressed) {
      padwait = "B";
      if (state.leftShoulder0.pressed && state.rightShoulder0.pressed)          // GAMEPAD: L1 + R1 + B
        mapping.action('L1+R1+B',null,true);
      else if (state.leftShoulder0.pressed)                                     // GAMEPAD: L1 + B
        mapping.action('L1+B',null,true);
      else if (state.rightShoulder0.pressed)                                    // GAMEPAD: R1 + B
        mapping.action('R1+B',null,true);
      else                                                                      // GAMEPAD: B
        mapping.action('B',null,true);
        
    } else if (state.dpadUp.pressed) {
      if (state.leftShoulder0.pressed)                                          // GAMEPAD: L1 + DPadUp
        mapping.action('L1+DPadUp',null,true);
      if (state.rightShoulder0.pressed)                                         // GAMEPAD: R1 + DPadUp
        mapping.action('R1+DPadUp',null,true);
      if (state.leftShoulder1>=0.9)                                              // GAMEPAD: L2 + DPadUp
        mapping.action('L2+DPadUp',null,true);
      if (state.rightShoulder1>=0.9)                                             // GAMEPAD: R2 + DPadUp
        mapping.action('R2+DPadUp',null,true);
      if (!state.leftShoulder0.pressed && !state.rightShoulder0.pressed && state.leftShoulder1<0.9 && state.rightShoulder1<0.9)
        mapping.action('DPadUp',null,true);

    } else if (state.dpadDown.pressed) {
      if (state.leftShoulder0.pressed)                                          // GAMEPAD: L1 + DPadDown
        mapping.action('L1+DPadDown',null,true);
      if (state.rightShoulder0.pressed)                                         // GAMEPAD: R1 + DPadDown
        mapping.action('R1+DPadDown',null,true);
      if (state.leftShoulder1>=0.9)                                              // GAMEPAD: L2 + DPadDown
        mapping.action('L2+DPadDown',null,true);
      if (state.rightShoulder1>=0.9)                                             // GAMEPAD: R2 + DPadDown
        mapping.action('R2+DPadDown',null,true);
      if (!state.leftShoulder0.pressed && !state.rightShoulder0.pressed && state.leftShoulder1<0.9 && state.rightShoulder1<0.9)
        mapping.actio('DPadDown',null,true);
    } else if (state.dpadLeft.pressed) {                                        // GAMEPAD: DPadLeft
      padwait = 'dpadLeft';
      mapping.action('DPadLeft',true);
    } else if (state.dpadRight.pressed) {                                       // GAMEPAD: DPadRight
      padwait = 'dpadRight';
      mapping.action('DPadRight',true);
    } else if (state.xboxButton && state.xboxButton.pressed) {                  // GAMEPAD: Xbox
      padwait = 'xboxButton';
      mapping.action('Xbox',null,true);
    }
    padallow=padwait?false:padallow;
  } else {
    if (padwait && !state[padwait].pressed) {
      padallow = true;
      padwait = null; 
    } else if (!padwait)
      setTimeout(function(){padallow=true;},100);
  }
  
  // LX: Raw Version || leftStickX: Abs Version
  if (state.leftStickButton.pressed) {
    var L1Down = state.leftShoulder0.pressed,
        L2Down = state.leftShoulder1>0.9;
    if (state.LX!==0 || state.LY!==0) {                                         // GAMEPAD: L3 + Stick1
      if (state.LX!==0)
        mapping.action('L3+Stick1',state.LX*25,true);
    }
    if (L1Down && L2Down && state.LY!==0)                                       // GAMEPAD: L3 + L1 + L2 + Stick1
      mapping.action('L3+L1+L2+Stick1',(-state.LY+1)/2,true);
    else {
      if (state.LY!==0 && L1Down)                                               // GAMEPAD: L3 + L1 + Stick1
        mapping.action('L3+L1+Stick1',(-state.LY+1)/2,true);
      else if (state.LY!==0 && L2Down)                                          // GAMEPAD: L3 + L2 + Stick1
        mapping.action('L3+L2+Stick1',(-state.LY+1)/2,true);
    }
  } else {
    if (state.LY!==0)                                                   // GAMEPAD: Stick1
      mapping.action('Stick1',-state.leftStickY,true);
  }
  

  if (state.rightStickButton.pressed) {
    var R1Down = state.rightShoulder0.pressed,
        R2Down = state.rightShoulder1>0.9;
    if (state.RX!==0 && state.RY) {                                             // GAMEPAD: R3 + Stick2
      if (state.RX!==0)
        mapping.action('R3+Stick2',state.RX*25,true);
      
    }
    if (R1Down && R2Down && state.RY!==0)                                       // GAMEPAD: R3 + R1 + R2 + Stick2
      mapping.action('R3+R1+R2+Stick2',(-state.RY+1)/2,true);
    else {
      if (state.RY!==0 && R1Down)                                               // GAMEPAD: R3 + R1 + Stick2
        mapping.action('R3+R1+Stick2',(-state.RY+1)/2,true);
      else if (state.RY!==0 && R2Down)                                          // GAMEPAD: R3 + R2 + Stick2
        mapping.action('R3+R2+Stick2',(-state.RY+1)/2,true);
    }
  } else {
    if (state.RY!==0)                                                           // GAMEPAD: Stick2
      mapping.action('Stick2',-state.rightStickY,true);
  }
  
  
  /*
  for (var key in state.images) {
    if (state[key] && state[key] instanceof GamepadButton) {
      if (state[key].pressed) $('#gamepad-img')[0].src=state.images[key];
    }
  }
  */
}

function moveKnob(knob,num,anim) {
  knob = $(knob);
  //num = Math.max(-1,Math.min(1,num));
  //num=Math.floor(num*199);
  knob.moveKnob(null,num,anim);
  /*
  if (num>199) {num=199;} else if (num<0) {num=0;}
  var stem = Boolean($(knob).is('[stem]'));
  size = stem?30:64;
  num = Math.max(-1,Math.min(1,num));
  $(knob).css('background-position-y',-(num*size)+'px').attr('value',(num*2)-1);
  */
}

function savecues(deck) {
  if (!deck.file || !deck.file.name || !deck.cues) {return;}
  var data = {};
  data[deck.file.name] = deck.cues;
  chrome.storage.local.set(data);
}

function saveSamples(){
  // TODO: Implement Sample Saving
  /*
  var data = {};
  data["Samples"] = [];
  dj.samples.forEach(function(smp,i){
    if (smp){
      //data["Samples"][i] = ;
    }
  });
  chrome.storage.local.set(data);
  */
}

function optionsTab(i){
  i=parseInt(i);
  $('.tab-panels .tab-panel').removeClass('active');
  $('.tab-panels .tab-panel[index='+i+']').toggleClass('active',true);
  $('.tab-panels').attr('tab',i);
  
  $('.tabs .tab').hide();
  $('.tabs .tab[index='+i+']').show();
}

function createCell(txt,row,edit){
  var cell = document.createElement('td');
  if (edit) {
    var input = document.createElement('input');
    input.setAttribute('type','text');
    input.setAttribute('value',txt);
    cell.appendChild(input);
  } else {
    cell.textContent = txt;
  }
  if (row) row.appendChild(cell);
  return cell;
}

function showDeviceMap(device) {
  var elm = $('table.device-mapper')[0],
      dev = device.toLowerCase()=='keyboard'?KEYBOARD_MAP:midi.getDeviceMap(device||''); //DEVICE_MAPS[device||''];
      
  if (!dev) return;
  $(elm).children().remove();
  
  for (var k in dev.mappings) {
    var v = dev.mappings[k],
        row = document.createElement('tr'),
        kcell = createCell(k,row,true),
        vcell = createCell(v,row,true);
    
    kcell.onchange = function() {
      var nk=kcell.value;
    };
    
    vcell.onchange = function() {
      var nv=vcell.value;
    };
    
    elm.appendChild(row);
  }
}

function updateDeviceMap() {
  var elm = $('select.device-menu')[0];
  $(elm).children().remove();

  var addOpt = function(v){
    var opt = document.createElement('option');
    opt.setAttribute('value',v);
    opt.textContent = v; 
    elm.appendChild(opt);
    return opt;
  };
  addOpt('Keyboard');
  for (var name in midi.devices) addOpt(name);
  
  
}

// TODO : Test the ding.ogg
// TODO : Test the endnoise-1.mp3 (and 2)

/* Jquery */

function getKey(e,fn){
  var key="";
  if (e.ctrlKey===true) key+= "CTRL+";
  if (e.altKey===true) key+= "ALT+";
  if (e.shiftKey===true) {key+= "SHIFT+";}
  key+=keyboardMap[e.which];
  fn(key,e);
}

$(document).ready(function(){
  $(document).keydown(function(e){
    getKey(e,onKeyDown);
  });
  $(document).keyup(function(e){
    getKey(e,onKeyUp);
  });
  
  // Options
  optionsTab(1);
  $('.tab-panels span.tab-panel').click(function(e){
    var i = e.target.getAttribute('index');
    optionsTab(i);
  });
  
  // Mapper Select
  
  $('select.device-menu').change(function(e){
    var val=e.target.value;
    showDeviceMap(val);
  });//.on('input',updateDeviceMap);
  debounce(function(){showDeviceMap('Keyboard');},1000)();
  // Extras
  $('.extras').on('change',function(e){
    header = $(e.target).find('h1:first-of-type');
    menu = $(e.target).find('[id$='+$(e.target).attr('active')+']');
    othermenus = $(e.target).find('.menu:not([id$='+$(e.target).attr('active')+'])');
    othermenus.css('display','none');
    menu.css('display','block');
    var txt = chrome.i18n.getMessage(menu.attr('header').toLowerCase().replace(' ','_'));
    $(header).text(txt);
    
  });
  $('.extras').trigger('change');
  $('.extras .left-btn').click(function(e){
    parent = $(e.target.parentElement);
    if (parent.attr('active')=='hotcue')
      parent.attr('active','samples');
    else if (parent.attr('active')=='effects')
      parent.attr('active','hotcue');
    else if (parent.attr('active')=='loops')
      parent.attr('active','effects');
    else if (parent.attr('active')=='samples')
      parent.attr('active','loops');
      
    parent.trigger('change');
  });
  $('.extras .right-btn').click(function(e){
    parent = $(e.target.parentElement);
    if (parent.attr('active')=='hotcue')
      parent.attr('active','effects');
    else if (parent.attr('active')=='effects')
      parent.attr('active','loops');
    else if (parent.attr('active')=='loops')
      parent.attr('active','samples');
    else if (parent.attr('active')=='samples')
      parent.attr('active','hotcue');
    parent.trigger('change');
  });

  $('.extras input.cue-btn').click(function(e){
    var btn = $(e.target),
        index = parseInt(btn.attr('index')),
        deck = btn.parent().is('#left-hotcue')?1:2;
    if (index)
      getAction('deck '+deck+' cue '+index);
    midi.update();
  });
  $('.extras span.span-btn.auto-loop').click(function(e){
    var btn = $(e.target),
        index = parseInt(btn.attr('index')),
        deck = btn.is('[blue]')?1:2;
    if (index) getAction('deck '+deck+' loop '+Math.pow(2,index-1));
    
    $((deck==1?'#left-extras':'right-extras')+' span.span-btn.auto-loop').toggleClass('selected',false);
    switch(dj[deck==1?'leftdeck':'rightdeck'].track.autoLoop){
      case 1: $((deck==1?'#left-extras':'right-extras')+' span.span-btn.auto-loop[index=1]').toggleClass('selected',true); break;
      case 2: $((deck==1?'#left-extras':'right-extras')+' span.span-btn.auto-loop[index=2]').toggleClass('selected',true); break;
      case 4: $((deck==1?'#left-extras':'right-extras')+' span.span-btn.auto-loop[index=3]').toggleClass('selected',true); break;
      case 8: $((deck==1?'#left-extras':'right-extras')+' span.span-btn.auto-loop[index=4]').toggleClass('selected',true); break;
    }
    midi.update();
  });
  $('.extras span.span-btn.manual-loop').click(function(e){
    var btn = $(e.target),
        index = parseInt(btn.attr('index'));
        deck = btn.is('[blue]')?1:2;
        
    switch (index) {
      case 1: getAction('deck '+deck+' loop in'); break;
      case 2: getAction('deck '+deck+' loop out'); break;
      case 3: getAction('deck '+deck+' reloop'); break;
      case 4: getAction('deck '+deck+' loop 2x'); break;
      case 5: getAction('deck '+deck+' loop 1/2'); break;
    }
    midi.update();
  });
  
  // Directory
  $('#directory img.head-img').click(function(e){
    fs.chooseDirectory();
  });
  $('#dir-table tr').on('mouseover',function(e,i){
    $('#dir-inner img.dir-img')[1].src = $(e)[0].currentTarget.img || 'assets/images/mp3.svg';
  });
  $('.song-info').change(function(e) {
    $(e.target).css('opacity',1);
  });
  
  // Knob
  /*
  $('.knob').each(function(){
    $('.knob').on('mousedown',function(e){
    knob = $(e.target);
    var startX=e.pageX;
    var startY=e.pageY;
    if (e.which==1) {
      var pos=parseInt($(knob).css('background-position-y').slice(0,-2))/($(knob).is('[stem]')?-30:-64);
      $(document).on('mousemove',function(e){
        x=e.pageX;y=e.pageY;
        num=Math.floor( ((-(startX-x) + (startY-y))/2)*($(knob).attr('sensitivity')||1) );
        if (e.shiftKey) {num=Math.floor(num/2);}
        num=pos+num;
        if (num>199) {num=199;} else if (num<0) {num=0;}
        var max = $(knob).attr("max"||199),
            min = $(knob).attr("min")||0,
            size_param = $(knob).is('[stem]')?30:64;
        
        $(knob).attr("value",parseInt(min)+((max-min)*(num/199)));
        $(knob).css('background-position-y',-(num*size_param)+'px');
        $(knob).trigger('change');
      }); 
    }
    });
    $('.knob').on('dblclick',function(e) {
      var knob = $(e.target),
          max = $(knob).attr("max"||199),
          min = $(knob).attr("min")||0,
          num = 99,
          size = $(knob).is('[stem]')?30:64;
      $(knob).attr("value",parseInt(min)+((max-min)*(num/199)));
      $(knob).css('background-position-y',-(num*size)+'px');
      $(knob).trigger('change');
    });
    $(document).on('mouseup',function(e) {
      $(document).off('mousemove');
    });
  });
  */


  $('#mixer #left .knob').knob('blue-knob-mid');
  $('#mixer #right .knob').knob('red-knob-mid');
  
  /*
  $('#crossfader.knob').knob('crossfader').on('change',function(e){
    var val = $(e.target).attr('value');
    dj.crossfade(val);
  }).on('input',function(e){
    var cross = $(e.target);
    cross.moveKnob(cross.attr('value'));
  });
  */
  dj.leftdeck.track.refreshEQ();
  dj.rightdeck.track.refreshEQ();
  
  // Close Buttons  
  $("div#header #close").click(function(){window.close();});
  $("#options.menu .close-btn").click(function(){getAction('options close');});
 
  // Sliders 
  $("input[type=range]").each(function(i,e){
    def = $(e).attr('defaultvalue');
    if (def) {$(e).val(parseInt(def));}
  });
  dj.crossfade(0);
  $("input[type=range]").on("input",function(e) {
    val = $(e.target).val();
    id = $(e.target).attr("id");
    if (id=='crossfader') {
      dj.crossfade(val);
    } else if(id.indexOf('pitch')!==-1) {
      var deck = dj[id.substring(0,id.indexOf('pitch')-1)+'deck'],
          num = parseFloat(val);
      deck.track.updateSpeed(num,true);
    }
  });
  $("input[type=range]").on('dblclick',function(e){
    def = $(e.target).attr('defaultvalue');
    if (def) {$(e.target).val(parseInt(def));}
    $(e.target).trigger('input');
  });
  
  // DnD
  $(".drop").on('dragover',function(e){e.preventDefault(); e.stopPropagation();});  
  $(".drop").on('dragenter',function(e){e.preventDefault(); e.stopPropagation();});  
  $(".drop").on('drop',handleDrop);
  
  // Settings
  $('.settings-btn').settingsButton();
  
  // Span Button
  $('span.span-btn.selectable').click(function(e){
    $(this).toggleClass('selected');
  });
  //$(".sample-drop").on('drop',sampleDrop);

  $('.search-box input').focusin(function(e){
    $(e.target).parent().css('background-color','#DDD');
  }).focusout(function(e){
    $(e.target).parent().css('background-color','#BBB');
  }).change(function(e){
    // TODO : Implement Searching
    var btn = $(e.target),
        txt = btn.val();
    btn.focusout();
    
    fs.search(txt);
    
  });
});


(function($) {
  $.fn.changeElementType = function(newType) {
    var attrs = {};

    $.each(this[0].attributes, function(idx, attr) {
      attrs[attr.nodeName] = attr.nodeValue;
    });

    this.replaceWith(function() {
      return $("<" + newType + "/>", attrs).append($(this).contents());
    });
    return this;
  };
  $.fn.knob = function(opts) {
    return this.each(function(){
    opts = opts instanceof Object?opts:typeof(opts)=='string'?{type:opts}:{};
    var config = {
      max: 1,
      min: -1,
      value: 0,
      frames: 128,
      size: 64,
      sensitivity: 2,
      label: '',
      type: 'knob',
      image: 'knob.png',
    };
    if (opts) $.extend(config,opts);
    
    
    switch(config.type) {
      case 'blue-knob': config.image = 'knob-blue.png'; break;
      case 'blue-knob-small': config.image = 'knob-blue-32px.png'; config.size = 32; break;
      case 'blue-knob-mid': config.image = 'knob-blue-48px.png'; config.size = 48; break;
      case 'blue-knob-trak': config.image = 'knob-blue-traktor-41px.png'; config.size = 41; break;
      
      case 'red-knob': config.image = 'knob-red.png'; break;
      case 'red-knob-small': config.image = 'knob-red-32px.png'; config.size = 32; break;
      case 'red-knob-mid': config.image = 'knob-red-48px.png'; config.size = 48; break;
      case 'red-knob-trak': config.image = 'knob-red-traktor-41px.png'; config.size = 41; break;
      
      case 'stem-knob': case 'stem': config.image = 'knob-stem.png'; config.size = 30; break;
      case 'slider-stem': config.image = 'slider-stem.png'; break;
      case 'switch': config.image = 'switch-slide-32px.png'; config.size = 32; break;
      case 'crossfader': config.image = 'fader-128px.png'; config.width = 128; config.height = 32; break;
      default: config.image = 'knob.png';
    }
    if (config.height && !opts.size) config.size = config.height;
    config.value = Math.max(config.min,Math.min(config.max,config.value));
    $(this).removeClass().addClass('knob').attr('value',config.value).attr('frames',config.frames).attr('sensitivity',config.sensitivity).attr('size',config.size).attr('min',config.min).attr('max',config.max)
        .css({
          'background-position-y': 0-(Math.floor(config.size*(config.frames-1)*(config.value-config.min)/(config.max-config.min)/config.size)*config.size)+'px',
          'background-image': "url('assets/images/"+config.image+"')",
          width: (config.width||config.size)+'px',
          height: (config.height||config.size)+'px'
        }).attr('size',config.size);
        
    if (config.image.includes('stem')) $(this).addClass('stem');
    if (config.label&&config.label.length>0)
      if ($(this).next().is('div.label'))
        $(this).next().text(config.label);
      else
        $(this).after("<div class='label'>"+config.label.toUpperCase()+"</div>");
        
    $(this).configKnob(config);
    
    return this;
    });
  };
  $.fn.moveKnob = function(val,float,notrigger) {
    var config = {
      min: parseFloat(this.attr('min')),
      max: parseFloat(this.attr('max')),
      size: parseInt(this.attr('size')||this.css('width').slice(0,-2)),
      frames: parseInt(this.attr('frames'))
    };
    if (!isNaN(float)) val = (config.min+((config.max-config.min)*parseFloat(float)));
    val = Math.max(config.min,Math.min(config.max,val));
    var pxl = Math.floor(config.size*(config.frames-1)*(val-config.min)/(config.max-config.min)/config.size)*config.size;
    this.attr('value',val);
    this.css('background-position-y',0-pxl+'px');
    if (!notrigger) {this.trigger('change');}
    
    return this;
  };
  $.fn.presetKnob = function(name){
    var ret,presets = {
      'slider-stem': {
        width: 100,
        height: 32,
        type: 'slider-stem'
      }
    };
    
    for (var k in presets) {
      if (k.toLowerCase()==name.toLowerCase()) return presets[k];
    }
    
  };
  $.fn.configKnob = function(opts) {
    
    var config = {
      min: parseFloat(this.attr('min')),
      max: parseFloat(this.attr('max')),
      size: parseInt(this.attr('size')||this.css('width').slice(0,-2)),
      frames: parseInt(this.attr('frames'))
    };
    $.extend(config,opts);


    this.off('mousedown');
    this.on('mousedown',function(e){
      //$(document.body).css('cursor','-webkit-grabbing');
      var knob = $(this),
          startX=e.pageX,
          startY=e.pageY;
      if (e.which==1) {
        var pos=parseFloat(knob.attr('value')) ||(config.min+(config.max-config.min)*0.5);
        $(document).on('mousemove',function(e){
          //pos=parseFloat(knob.attr('value'));
          
          x=e.pageX;y=e.pageY;
          num=Math.floor( ((-(startX-x) + (startY-y))/2)*(parseInt(knob.attr('sensitivity')||1))*1.5 )/(config.size*2);
          knob.moveKnob(pos+num);
        }); 
      }
    });
    
    this.on('dblclick',function(e) {
      $(e.target).moveKnob(null,0.5);
    }); 
    $(document).on('mouseup',function(e) {
      //$(document.body).css('cursor','default');
      $(document).off('mousemove');
    });
    return this;
  };
  $.fn.settingsButton = function() {
    return this.each(function(){
      var btn = $(this),
          txt = btn.text(),
          type = btn.attr('name');
      
      btn.empty().attr('name',type).html("<input type=\'checkbox\'></div><span>"+txt+"</span>");
      btn.find('input').prop('checked',Settings.get(type));
      btn.find('input').click(function(){
        Settings.set(type,btn.find('input').checked());
      });
      btn.find('span').click(function(){
        btn.find('input').click();
      });
      
      return btn;
    });
  };
  $.fn.settingsRefresh = function() {
    return this.each(function(){
      var btn = $(this),
          type = btn.attr('name');
      if (btn.is('.settings-btn') && btn.children().is('input[type=checkbox]') && btn.attr('name')){
        var on = Settings.get(type);
        btn.find('input').prop('checked',on);
        btn.toggleClass('btn-enabled',on);
      }
    });
  };
  $.fn.checked = function(){
    return this.prop('checked');
  };
})(jQuery);


function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

function throttle(delay, callback, accumulateData) {
    var previousCall = null;
    var theData = [];
    return function () {
        var time = new Date().getTime();

        //
        // accumulate arguments in case caller is interested
        // in that data
        //
        if (accumulateData) {
            var arr = [];
            for (var i = 0; i < arguments.length; ++i)
                arr.push(arguments[i]);
            theData.push(arr);
        }
        if (!previousCall ||
            (time - previousCall) >= delay) {
            previousCall = time;
            callback.apply((accumulateData) ? { data: theData} : null, arguments);
            theData = []; // clear the data array
        }
    };
}