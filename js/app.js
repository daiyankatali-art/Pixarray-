// ===== THE ARRAYS (parallel: same index = same photo) =====
var srcs  = [];      // srcs[i]  -> the picture data
var names = [];      // names[i] -> photo name
var favs  = [];      // favs[i]  -> true / false
var CAP = 60, filter = "all", view = -1;   // view = position in the visible list (-1 = closed)
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function say(t,bad){ var m=$("msg"); m.textContent=t; m.className="note"+(bad?" err":""); }

// ===== SAVE / LOAD =====
function save(){
  try{ localStorage.setItem("pixarray", JSON.stringify({s:srcs,n:names,f:favs})); return true; }
  catch(e){ say("Storage is full: new photos work now but won't be kept after refresh. Delete some photos.", true); return false; }
}
function load(){
  try{
    var d=JSON.parse(localStorage.getItem("pixarray"));
    if(d && Array.isArray(d.s) && d.s.length===d.n.length && d.s.length===d.f.length){ srcs=d.s; names=d.n; favs=d.f; }
  }catch(e){}
}

// ===== ARRAY OPERATIONS =====
function visible(){                         // array of the indexes that pass the filter
  var v=[];
  for(var i=0;i<srcs.length;i++){ if(filter==="all" || favs[i]) v.push(i); }
  return v;
}
function shrink(file, cb){                  // make the photo small so many fit in storage
  var r=new FileReader();
  r.onerror=function(){ cb(null); };
  r.onload=function(){
    var img=new Image();
    img.onerror=function(){ cb(null); };
    img.onload=function(){
      var s=Math.min(1, 700/Math.max(img.width,img.height)), c=document.createElement("canvas");
      c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL("image/jpeg",0.72));
    };
    img.src=r.result;
  };
  r.readAsDataURL(file);
}
function addFiles(files){
  var list=Array.prototype.slice.call(files), pending=list.length, added=0, skipped=0;
  if(!pending) return;
  say("Adding photos...");
  list.forEach(function(file){
    shrink(file,function(data){
      if(data && srcs.length<CAP){
        srcs.push(data); names.push(file.name.replace(/\.[^.]+$/,"")); favs.push(false); added++;
      } else skipped++;
      pending--;
      if(pending===0){
        var ok=save();
        if(ok) say("Added "+added+" photo"+(added===1?"":"s")+(skipped?" ("+skipped+" skipped: not an image or gallery full)":"")+".");
        draw();
      }
    });
  });
}
function toggleFav(i){ favs[i]=!favs[i]; save(); draw(); }
function removePhoto(i){                    // splice shifts later photos left
  srcs.splice(i,1); names.splice(i,1); favs.splice(i,1);
  save(); draw();
}

// ===== DRAWING =====
function draw(){
  var vis=visible(), h="";
  for(var v=0; v<vis.length; v++){          // one container per visible photo
    var i=vis[v];
    h+='<div class="tile" data-v="'+v+'"><img src="'+srcs[i]+'" alt="'+esc(names[i])+'" loading="lazy">'+
       '<button class="heart" data-fav="'+i+'" title="Favorite">'+(favs[i]?"♥":"♡")+'</button></div>';
  }
  $("grid").innerHTML = h || '<div class="empty" style="grid-column:1/-1">'+(srcs.length?"No favorites yet.":"No photos yet. Tap “+ Add photos”.")+'</div>';
  var nf=favs.filter(Boolean).length;
  $("fAll").textContent="All ("+srcs.length+")"; $("fFav").textContent="♥ Favorites ("+nf+")";
  $("fAll").className=filter==="all"?"on":""; $("fFav").className=filter==="fav"?"on":"";
  $("code").textContent=
    "names = ["+names.slice(0,4).map(function(x){return '"'+x+'"';}).join(", ")+(names.length>4?", ...":"")+"]\n"+
    "favs  = ["+favs.slice(0,8).join(", ")+(favs.length>8?", ...":"")+"]\n"+
    "srcs  = [ "+srcs.length+" pictures ]   // srcs[i] is photo number i\n"+
    "length = "+srcs.length+(view>=0 && vis[view]!==undefined ? "\nviewing index "+vis[view]+" -> "+names[vis[view]] : "");
  drawView();
}
function drawView(){
  var vis=visible();
  if(view<0 || !vis.length){ $("lb").hidden=true; document.body.style.overflow=""; view=-1; return; }
  if(view>=vis.length) view=vis.length-1;
  var i=vis[view];
  $("lb").hidden=false; document.body.style.overflow="hidden";
  $("lbImg").src=srcs[i]; $("lbImg").alt=names[i];
  $("lbCap").textContent=names[i];
  $("lbCount").textContent=(view+1)+" / "+vis.length;
  $("lbFav").textContent=favs[i]?"♥":"♡";
}
function next(){ var n=visible().length; if(n){ view=(view+1)%n; drawView(); } }          // index + 1, wraps
function prev(){ var n=visible().length; if(n){ view=(view-1+n)%n; drawView(); } }        // index - 1, wraps
function close(){ view=-1; drawView(); }

// ===== EVENTS =====
$("bAdd").onclick=function(){ $("fFile").click(); };
$("fFile").addEventListener("change",function(){ addFiles(this.files); this.value=""; });
$("fAll").onclick=function(){ filter="all"; view=-1; draw(); };
$("fFav").onclick=function(){ filter="fav"; view=-1; draw(); };
$("grid").addEventListener("click",function(e){
  var f=e.target.closest("[data-fav]");
  if(f){ e.stopPropagation(); toggleFav(parseInt(f.getAttribute("data-fav"),10)); return; }
  var t=e.target.closest(".tile");
  if(t){ view=parseInt(t.getAttribute("data-v"),10); drawView(); }
});
$("lbNext").onclick=next; $("lbPrev").onclick=prev; $("lbX").onclick=close;
$("lbFav").onclick=function(){ var i=visible()[view]; if(i!==undefined) toggleFav(i); };
$("lbDel").onclick=function(){ var i=visible()[view]; if(i!==undefined) removePhoto(i); };
$("lb").addEventListener("click",function(e){ if(e.target===$("lb")) close(); });
document.addEventListener("keydown",function(e){
  if(view<0) return;
  if(e.key==="ArrowRight") next(); else if(e.key==="ArrowLeft") prev(); else if(e.key==="Escape") close();
});
var sx=0;                                   // swipe left / right on a phone
$("lb").addEventListener("touchstart",function(e){ sx=e.changedTouches[0].clientX; },{passive:true});
$("lb").addEventListener("touchend",function(e){
  var dx=e.changedTouches[0].clientX-sx;
  if(dx<-50) next(); else if(dx>50) prev();
},{passive:true});

load(); draw();
