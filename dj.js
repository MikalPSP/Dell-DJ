window.AudioContext = window.AudioContext||window.webkitAudioContext;

var audioCtx = new AudioContext(),
    //var tuna = new Tuna(audioCtx),
    offlineCtx = new OfflineAudioContext(1,2,44100),
    reader = new FileReader(),
    analyzer = new FrequencyAnalyzer(),
    dj = {'leftdeck': {}, 'rightdeck': {}, 'data': {}},
    masterGain = audioCtx.createGain(),
    //recorder = new Recorder(audioCtx,masterGain),
    //recorder = new WebAudioRecorder(masterGain,{workerDir:"js/webaudiorecorder/",encoding:"mp3"}),
    cueGain = audioCtx.createGain(),
    sampleGain = audioCtx.createGain(),
    merger = audioCtx.createChannelMerger(4),
    masterSplit = audioCtx.createChannelSplitter(2),
    cueSplit = audioCtx.createChannelSplitter(2);
    
masterGain.connect(masterSplit);
cueGain.connect(cueSplit);

masterSplit.connect(merger,0,2);
masterSplit.connect(merger,1,3); //3
cueSplit.connect(merger,0,0);
cueSplit.connect(merger,1,1);
masterGain.connect(audioCtx.destination);
//merger.connect(audioCtx.destination);

sampleGain.connect(masterGain);
sampleGain.gain.value=1.5;
/*
recorder.onComplete = function(rec, blob){
  console.log('Recording Finished',blob);
};
*/


dj.leftdeck.track = new Track(null,true);
dj.rightdeck.track = new Track(null);


function draw(deck,color) {
  var WIDTH = deck.canvas.width;
  var HEIGHT = deck.canvas.height;

  deck.drawVisual = window.requestAnimationFrame(function(){deck.draw(deck,color);});


  deck.track.analyser.getByteFrequencyData(deck.track.dataArray);
  
  var barWidth = (WIDTH / deck.track.bufferLength) * 1.5;
  var barHeight;
  var x = 0;
  
  deck.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  for(var i = 0; i < deck.track.bufferLength; i++) {
    barHeight = deck.track.dataArray[i];
    
    barHeight=barHeight*(barHeight/(((i/deck.track.bufferLength)*-3)+18));
    deck.canvasCtx.fillStyle = color ||'#FFF';//'rgb(' + (barHeight+100) + ',50,50)';
    deck.canvasCtx.fillRect(x,HEIGHT-barHeight/4,barWidth,barHeight);
    x += barWidth+1.5;
  }

}

function getTags(deck,which,file) {
  fs.getTags(file?file:deck.file,function(tags){
    deck.tags = tags;
    $('#'+which+'-deck #song-info #title').text(tags.title);
    $('#'+which+'-deck #song-info #artist').text(tags.artist);
    $('#'+which+'-deck #song-info #title').css('opacity',1);
    $('#'+which+'-deck #song-info #artist').css('opacity',1);
    $('#'+which+'-deck #song-info #bpm').css('opacity',1);
    $('canvas.platter[value='+which+']').css('opacity',1);
    deck.track.keyLabel.textContent = tags.key?tags.key:'';
    if (tags.key) colorCodeKey(deck.track.keyLabel);
  });
}

dj.samples = [];
dj.loaddata = function() {
  chrome.storage.local.get(function(data){
    dj.data = data;
    //dj.samples = [];
    dj.loops = data["Loops"]||[];

    // TODO: Implement Sample Loading
    /*
    var samples=data["Samples"]||[];
    samples.forEach(function(v,i){
      if (v) {
        var url = "";
        dj.samples[i] = new Sample(url,i+1);
      }
    });
    */
  });
};

function loadcues(deck) {
  chrome.storage.local.get(deck.file.name,function(cues){
    deck.cues = cues[deck.file.name]||[];
    deck.cues[0] = null;
  });
}

dj.loaddata();

dj.leftdeck.cues = [];
dj.rightdeck.cues = [];
dj.leftdeck.variables = [];
dj.rightdeck.variables = [];
dj.leftdeck.pitchbend = [];
dj.rightdeck.pitchbend = [];

dj.leftdeck.getTags = function(){getTags(this,'left');};
dj.rightdeck.getTags = function(){getTags(this,'right');};

dj.leftdeck.loadcues = function(){loadcues(this);};
dj.rightdeck.loadcues = function(){loadcues(this);};

dj.blinkloop=null;
dj.blink = function(which) {
  if (!Settings.get('LED_ENABLED')) return;
  deck = this[which+'deck'];
  if (which=='left') {color='blue';} else {color='red';}
  if (dj.blinkloop) {clearInterval(dj.blinkloop);}
  if (!which) return;
  var num=0;  
  setInterval(function(){
    if (num%2===0) {
      dell.led.changeColor(color);
    } else {
      dell.led.changeColor('black');
    }
    num=num+1;
    
  },1000*(60/deck.bpm));
};
var CROSSFADE_SHARPNESS = 1;
dj.crossfade = function(fade) {
  fade = parseFloat(fade);
  var linear_fade = Settings.get('LINEAR_CROSSFADE'),
      curved_fade = false,//Settings.get('CURVED_CROSSFADE'),
      led_enabled = Settings.get('LED_ENABLED'),
      visual_fade = Settings.get('VISUAL_FADE'),
      g1,g2;
  
  var sharp = CROSSFADE_SHARPNESS; // Sharpness
  
  var normalize = function(n){return Math.max(0,Math.min(1,n));};
  
  if (linear_fade) { // Linear Fade
    g1 = sharp*(1-fade);
    g2 = sharp*(1+fade);
    
  } else if (curved_fade) { // Curved Fade
    g1 = Math.sqrt(sharp*(1+fade));
    g2 = Math.sqrt(sharp*(1-fade));
    
  } else { // Exponential Fade
    var x = (fade+1)/2;
    g1 = Math.cos(x * 0.5*Math.PI);
    g2 = Math.cos((1.0 - x) * 0.5*Math.PI);

  }
  if (this.debugFade) console.log('%c%s %c%s','background-color:rgba(0,0,0,0.9); color:#33F;','color:#F33;');

  this.leftdeck.track.changeMixGain(normalize(g1));
  this.rightdeck.track.changeMixGain(normalize(g2));
    
  if (fade>0) {
    if (linear_fade){
      //this.leftdeck.track.mixGain.gain.value=(1-fade);
      //this.rightdeck.track.mixGain.gain.value=1;
    }
    
    if (visual_fade) {
      $('#left-bar')[0].style.opacity=0.5-(fade/2);
      $('#right-bar')[0].style.opacity=0.5+(fade/2);
      $('#left-bar')[0].style['z-index']='2';
      $('#right-bar')[0].style['z-index']='';
    }
    if (led_enabled) dell.led.changeColor('red');
  } else if (fade<0) {
    if (linear_fade){
      //this.leftdeck.track.mixGain.gain.value=1;
      //this.rightdeck.track.mixGain.gain.value=(1-Math.abs(fade));
    }
    if (visual_fade) {
      $('#left-bar')[0].style.opacity=0.5+(fade/-2);
      $('#right-bar')[0].style.opacity=0.5-(fade/-2);
      $('#left-bar')[0].style['z-index']='';
      $('#right-bar')[0].style['z-index']='2';
    }
    if (led_enabled) dell.led.changeColor('blue');
  } else if (fade===0) {
    if (linear_fade){
      //this.leftdeck.track.mixGain.gain.value=1;
      //this.rightdeck.track.mixGain.gain.value=1;
    }
    
    if (visual_fade) {
      $('#left-bar')[0].style.opacity=0.5;
      $('#right-bar')[0].style.opacity=0.5;
      $('#left-bar')[0].style['z-index']='';
      $('#right-bar')[0].style['z-index']='';
    }
    if (led_enabled) dell.led.changeColor('magenta');
  }

};

// Volume Meter
dj.createVU = function(){
  this.vu_meterL = createAudioMeter(audioCtx);
  this.vu_meterR = createAudioMeter(audioCtx);
  var splitter = audioCtx.createChannelSplitter(2);
  
  masterGain.connect(splitter);
  
  splitter.connect( this.vu_meterL, 0, 0 );
  splitter.connect( this.vu_meterR, 1, 0 );
  
  dj.updateVU = function(vu){
    var canvas = $('.vu-meter.vu-master')[0],
        pad = 10,
        meterL = this.vu_meterL,
        meterR = this.vu_meterR;
        
    midi.setVU(meterL.volume,meterR.volume);
    
    if (vu||!canvas) return;
    
    var w = canvas.width,
        h = canvas.height,
        ctx = canvas.getContext('2d'),
        grad = ctx.createLinearGradient(0,0,w,h);
    ctx.clearRect(0,0,w,h);
        
    grad.addColorStop(0,'#F00');
    grad.addColorStop(0.5,'#FF0'); // 0.2 
    grad.addColorStop(1,'#0F0'); // 0.4
        
    ctx.fillStyle=grad;
        
    var volume = [meterL.volume,meterR.volume];
    ctx.fillRect(0+pad/2,(1-volume[0])*h,(w/2)-pad,volume[0]*h);
    ctx.fillRect((w+pad)/2,(1-volume[1])*h,(w/2)-pad,volume[1]*h);
  };
};

dj.createVU();

// Waveform Zooming
dj.waveformZoom = function( zoom ) {
  if (!ZOOMING) return;
  zoom = parseFloat(zoom);
  SECONDS_OF_RUNNING_DISPLAY = zoom;
  if (dj.leftdeck.track.buffer) dj.leftdeck.track.waveformDisplayCache = createRunningDisplayCache( dj.leftdeck.track.buffer, true );
  if (dj.rightdeck.track.buffer) setTimeout(function(){dj.rightdeck.track.waveformDisplayCache = createRunningDisplayCache( dj.rightdeck.track.buffer, false );},100);
  console.log(SECONDS_OF_RUNNING_DISPLAY);
};

dj.zoomIn = function() {
  var zoom = SECONDS_OF_RUNNING_DISPLAY;
  if (zoom>1)
    dj.waveformZoom(zoom/2);
};

dj.zoomOut = function() {
  var zoom = SECONDS_OF_RUNNING_DISPLAY;
  if (zoom<8)
    dj.waveformZoom(zoom*2);  
};


dj.leftdeck.cue = function(cue,del,up) {
  if (cue!==undefined) cue = parseInt(cue); else return;
  if (this.track.isLoading) return;
  if (del) {
    this.track.clearCuePoint(cue);
    return;
  }
  this.track.jumpToCuePoint(cue,up);
  savecues(this);
};
dj.rightdeck.cue = function(cue,del,up) {
  if (cue!==undefined) cue = parseInt(cue); else return;
  if (this.track.isLoading) return;
  if (del) {
    this.track.clearCuePoint(cue);
    return;
  }
  this.track.jumpToCuePoint(cue,up);
  savecues(this);
};

dj.createBuffer = function(deck,url) {
  if (deck.track){
    deck.track.loadNewTrack(url);
  } else {
    deck.track = new Track(url,deck==dj.leftdeck);
  }
  if (deck.turntable) deck.turntable.loadSong();
};

dj.leftdeck.play = function(stop){
  if (this.track.isLoading || !this.track.buffer) return;
  if (stop) {this.track.jumpToPoint(0); return;}

  this.track.togglePlayback();
  if (this.turntable) this.turntable.onPlayChange(this.track.isPlaying);
  $('#left-deck .play-button')[0].checked=this.track.isPlaying;
};

dj.rightdeck.play = function(stop){
  if (this.track.isLoading || !this.track.buffer) return;
  if (stop) {this.track.jumpToPoint(0); return;}
    
  this.track.togglePlayback();
  if (this.turntable) this.turntable.onPlayChange(this.track.isPlaying);
  $('#right-deck .play-button')[0].checked=this.track.isPlaying;
};

dj.leftdeck.stutter = function(up){
  if (this.track.isLoading) return;
  this.track.playSutter(up);
  //midi.update();
};

dj.rightdeck.stutter = function(up){
  if (this.track.isLoading) return;
  this.track.playStutter(up);
  //midi.update();
};

dj.leftdeck.seek = function(time){this.track.jumpToPoint(time);};
dj.rightdeck.seek = function(time){this.track.jumpToPoint(time);};

{
dj.leftdeck.__defineGetter__('playbackRate',function(){return this.track.currentPlaybackRate;});
dj.leftdeck.__defineGetter__('bpm',function(){return getBPM(this)*(this.playbackRate||1);});
dj.leftdeck.__defineGetter__('defaultBPM',function(){return getBPM(this);});

dj.rightdeck.__defineGetter__('playbackRate',function(){return this.track.currentPlaybackRate;});
dj.rightdeck.__defineGetter__('bpm',function(){return getBPM(this)*(this.playbackRate||1);});
dj.rightdeck.__defineGetter__('defaultBPM',function(){return getBPM(this);});
}



function cloneAudioBuffer(buf,reverse){
  var channels = [],
      numChannels = buf.numberOfChannels;
  for (var i=0;i<numChannels;i++){channels[i]=new Float32Array(buf.getChannelData(i));}
  var newbuf=audioCtx.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);
  for (i=0;i<numChannels;i++){newbuf.getChannelData(i).set(channels[i]);}
  if (reverse){
    Array.prototype.reverse.call(newbuf.getChannelData(0));
    Array.prototype.reverse.call(newbuf.getChannelData(1));
  }
  return newbuf;
}


/* Frequency Functions */

function Key(note,flats) {
  var key, noteStrings = flats?["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"]:["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  
  if (typeof note == 'string') {
    key = noteStrings.indexOf(note.match(/\D+/));
    return (12*(parseInt(note.match(/\d+/))||0))+(key!=-1?key:0);
  } else if (typeof note == 'number') {
    return noteStrings[note%12]+Math.floor(note/12);
  }
}
function Note(freq) {
	return Math.round(12*(Math.log(freq/440)/Math.log(2)))+69;
}
function Frequency(note) {
	return 440*Math.pow(2,(note-69)/12);
}
function Cents(freq,note) {
	return Math.floor(1200*Math.log(freq/Frequency(note))/Math.log(2));
}

/* BPM Detection */

function getBPM(deck) {
  if (!deck.file || !deck.file.name || !deck.track.buffer) {return 0;}
  if (deck.track.customBPM) return deck.track.customBPM;
  if (deck.tags.bpm) return deck.tags.bpm;
  if (dj.data[deck.file.name+' BPM']) return dj.data[deck.file.name+' BPM'];
  
  offlineCtx = new OfflineAudioContext(2,deck.track.buffer.length,44100);
  
  source = offlineCtx.createBufferSource();
  source.buffer = deck.track.buffer;
  filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  source.connect(filter);
  filter.connect(offlineCtx.destination);
  source.start(0);
  var peaks,
      initialThreshold = 0.9,
      threshold = initialThreshold,
      minThreshold = 0.3,
      minPeaks = 30;
  do {
    peaks = getPeaksAtThreshold(source.buffer.getChannelData(0),threshold);
    threshold -= 0.05;
  } while (peaks.length < minPeaks && threshold >= minThreshold);
  
  var intervals = countIntervals(peaks);
  var group = groupNeighbors(intervals,source.buffer.sampleRate);
  var top = group.sort(function(a,b) {
    return b.count-a.count;
  }).splice(0,5);
  // TODO: Fix Tempo with certain songs (Ecuador - Electro House)
  if (!top[0] || !top[0].tempo) {console.error('Failed to obtain BPM for '+deck.file.name); return;}
  var bpm = top[0].tempo;
  //bpm = findAverage(top);
  var savedata = {};
  savedata[deck.file.name+' BPM'] = bpm;
  chrome.storage.local.set(savedata);
  dj.loaddata();
  return bpm;
}

function findAverage(list){
  if (!list) return;
  var avg=0;
  list.forEach(function(v,i){
    avg+=v.tempo;
  });
  avg=avg/list.length;
  return avg||0;
  
}

function getPeaksAtThreshold(data,threshold) {
  var peaks = [];
  for (var i=0;i<data.length;) {
    if (data[i]>threshold) {
      peaks.push(i);
      i+=10000;
    }
    i++;
  }
  return peaks;
}
function countIntervals(peaks) {
  var intervals = [];
  peaks.forEach(function(peak,index){
    for (var i=0;i<10;i++) {
      var int=peaks[index+i]-peak;
      var foundint = intervals.some(function(intcnt){
        if (intcnt.interval===int) {return intcnt.count++;} 
      });
      if (!foundint) {
        intervals.push({
          'interval': int,
          'count': 1
        });
      }
    }
  });
  return intervals;
}
function groupNeighbors(interval,sampleRate) {
  var tempoCounts = [];
  interval.forEach(function(count,i) {
    if (count.interval !== 0) {
      var theoryTempo = 60/(count.interval/sampleRate);
      while (theoryTempo < 90) theoryTempo*=2;
      while (theoryTempo > 180) theoryTempo/=2;
      
      theoryTempo = Math.round(theoryTempo);
      var foundTempo = tempoCounts.some(function(tempoCount) {
        if (tempoCount.tempo===theoryTempo)
          return tempoCount.count+=count.count;
      });
      if (!foundTempo) {
        tempoCounts.push({
          'tempo': theoryTempo,
          'count': count.count
        });
      }
    }
  });
  return tempoCounts;
}



/* Turntable */
function Turntable(which) {
  var self = this;
  this.deck = dj[which+'deck'];
  this.platter = $('canvas.platter[value='+which+']')[0];
  this.speed = 0;


  var o = 0,
      a = 0,
      inuse = false, //i
      start = 0, //s
      r = 0,
      l = 0,
      d = 0,
      u = 0,    //u <angle> <stands for up>
      c = false,
      h = 0.022,
      radius = 107.5, //g
      f = 0,
      p = null,
      posX = self.platter.offsetParent.offsetLeft,      //v
      posY = self.platter.offsetParent.offsetRight;      //m
      
  this.loadSong = function() {
    r = u = l = d = 0;
  };
  
  this.updateSpeed = function(spd) {
    self.speed = spd;
  };
  
  this.update = function() {
    if (self.deck.track) self.deck.track.updatePlatter(true);
    if (!c) return;
    if (self.deck.track.isPlaying && !inuse) {
      u += w();
      P(u);
      L(1+0.01*self.speed);
    } else if (inuse) {
      P(u);
      E();
      L(o/(2*Math.PI)/h);
    } else if (!self.deck.track.isPlaying && !inuse) {
      //u += 0;
      //P(u);
      //C();
      //L(o/(2*Math.PI)/h);
      u += w();
      P(u);
      L(1+0.01*self.speed);
    }
  };
  
  this.onPlayChange = function(playing) {
    if (playing) c = true;
    //else self.degradeSpeedToZero();
  };
  this.degradeSpeedToZero = function(){o = w();};
  this.onMouseDown = function(e) {
    e.preventDefault();
    inuse = true;
    document.addEventListener('mousemove',move,true);
    document.addEventListener('drag',move,true);
    document.addEventListener('mouseup',done,true);
    start = ang(e);
    r = u = l = d;
  };
  
  this.scratch = function(down,speed) {
    if (!inuse && down) {
      self.oldSpeed = self.speed||1;
    }
    
    if (!this.deck.track.isPlaying) this.deck.track.togglePlayback();
    inuse = down;
    if (inuse) {
      this.updateSpeed(speed/100);
    } else {
      a = 0;
      //this.updateSpeed(self.oldSpeed);
    }
  };
  
  var ang = function(e) {
    var data = getAngle(self.platter,e);
    return Math.atan2(data.y,data.x);
  },
  M = function(e) {
    var x = radius - e.clientX + posX,
        y = radius - e.clientY + posY;
    return Math.atan2(y,x);
  },
  
  move = function(e) {
    u = r + (ang(e) - start);
  },
  done = function(){
    a = 0;
    document.removeEventListener("mousemove",move,true);
    document.removeEventListener("drag",move,false);
    document.removeEventListener("mouseup",done,true);
    inuse = false;
  },
  w = function() {
    return 0.13823007675795088 * (1 + 0.01 * self.speed);
  },
  E = function() {
    o = d - l;
    if (o < a - Math.PI) o += 2 * Math.PI;
    else if (o > a + Math.PI) o -= 2 * Math.PI;
    l = d;
    a = o;
  },
  C = function() {
    o += 0.1 * (0 - o);
    if (Math.abs(o) < 0.001) {
      if (self.deck.track.isPlaying) self.deck.track.togglePlayback();
      c = false;
      o = 0;
    }
  },
  P = function(e) {
    if (e > d + Math.PI) d += 2 * Math.PI;
    else if (e < d - Math.PI) d -= 2 * Math.PI;
    d += 1 * (e - d); //0.666
    //self.vinyl.style.transform='rotate3d(0,0,1,'+toDeg(d)+'deg)';
  },
  L = function(e) {
    //e = Math.abs(e)>2?(Math.abs(e)/e)*2:e;
    //if (e===0) return;
    if (e && parseInt(e) && self.deck.track.playbackRate!==e) self.deck.track.changePlaybackRate(e);
    //else console.error('INVALID RATE: %s',e);
    
  };  
  
  self.platter.addEventListener('mousedown',this.onMouseDown);
}

dj.leftdeck.turntable = new Turntable('left');
dj.rightdeck.turntable = new Turntable('right');



reader.onloadend = function() {console.log(reader.result);};



