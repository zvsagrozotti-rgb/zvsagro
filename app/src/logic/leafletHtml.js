// Mapa SÓ de visualização: mostra o polígono do talhão (sem desenhar). Para o detalhe.
export function mapaViewHtml(coords) {
  const pts = JSON.stringify(Array.isArray(coords) ? coords : []);
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#0B1D13}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var pts=${pts};
  var map=L.map('map',{zoomControl:false,attributionControl:false});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21}).addTo(map);
  if(pts && pts.length>2){ var poly=L.polygon(pts,{color:'#F4A83A',weight:3,fillOpacity:0.25}).addTo(map); map.fitBounds(poly.getBounds(),{padding:[18,18]}); }
  else { map.setView([-15.78,-47.93],4); }
</script></body></html>`;
}

// Mapa do talhão (Leaflet + Leaflet.draw + turf): desenha polígono, calcula área (ha)
// e traça a DIREÇÃO DE APLICAÇÃO (tiros). Padrão = tiros mais longos; com vento, os
// tiros ficam perpendiculares ao vento (vento lateral ao drone). Satélite exige internet.
export function mapaHtml(initialCoords) {
  const ini = JSON.stringify(Array.isArray(initialCoords) ? initialCoords : []);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"/>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#0B1D13}
  .panel{position:absolute;top:calc(8px + env(safe-area-inset-top,0px));left:8px;right:8px;z-index:1000;background:#13301Fee;color:#E8EDF4;
        font-family:Arial,sans-serif;border-radius:10px;padding:10px;border:1px solid #2A5638}
  .panel b{color:#34D399;font-size:17px}
  .panel small{color:#A9C9B4}
  .ctrls{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
  .ctrls label{font-size:11px;color:#A9C9B4}
  select,input{background:#0B1D13;color:#E8EDF4;border:1px solid #2A5638;border-radius:7px;padding:6px 8px;font-size:13px}
  input{width:60px}
  .b{background:#13301Fee;color:#E8EDF4;border:1px solid #2A5638;border-radius:8px;padding:8px 10px;font-family:Arial;font-weight:bold;font-size:13px;cursor:pointer}
  .b.g{background:#16A34A;color:#eafff0;border-color:#16A34A}
  .b.o{background:#F4A83A;color:#3a2600;border-color:#F4A83A}
  .btns{position:absolute;bottom:calc(16px + env(safe-area-inset-bottom,0px));left:8px;right:8px;z-index:1000;display:flex;gap:8px}
  .btns .b{flex:1;text-align:center}
  .leaflet-draw-toolbar{display:none}
</style>
</head>
<body>
<div id="map"></div>
<div class="panel">
  <b id="area">0 ha</b> &nbsp;<small id="hint">Desenhe o talhão.</small>
  <div class="ctrls">
    <label>Vento:</label>
    <select id="vento">
      <option value="auto">Auto (tiros longos)</option>
      <option value="0">Norte ↓</option><option value="45">Nordeste</option>
      <option value="90">Leste ←</option><option value="135">Sudeste</option>
      <option value="180">Sul ↑</option><option value="225">Sudoeste</option>
      <option value="270">Oeste →</option><option value="315">Noroeste</option>
    </select>
    <label>Faixa(m):</label><input id="faixa" type="number" value="8"/>
    <div class="b o" onclick="tracar()">➤ Traçar aplicação</div>
  </div>
</div>
<div class="btns">
  <div class="b g" onclick="iniciarDesenho()">✏️ Desenhar</div>
  <div class="b" onclick="send({tipo:'pedirKml'})">📁 KML</div>
  <div class="b" onclick="limpar()">🗑️ Limpar</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
<script src="https://unpkg.com/@turf/turf@6/turf.min.js"></script>
<script>
  function send(o){ var s=JSON.stringify(o);
    try{ if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s);return;} }catch(e){}
    try{ if(window.parent){window.parent.postMessage(s,'*');} }catch(e){}
  }
  var map=L.map('map',{zoomControl:true}).setView([-15.78,-47.93],4);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:21,attribution:'Esri'}).addTo(map);
  // Recalcula o tamanho do mapa (evita tela sólida sem tiles ao reabrir).
  setTimeout(function(){ try{ map.invalidateSize(); }catch(e){} }, 250);
  setTimeout(function(){ try{ map.invalidateSize(); }catch(e){} }, 800);
  window.addEventListener('resize', function(){ try{ map.invalidateSize(); }catch(e){} });
  function irLoc(lat,lng,z){ if(!drawn){ try{ map.setView([lat,lng], z); }catch(e){} } }
  function ipFallback(){ fetch('https://ipapi.co/json/').then(function(r){return r.json();}).then(function(d){ if(d && d.latitude) irLoc(d.latitude,d.longitude,12); }).catch(function(){}); }
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      function(p){ irLoc(p.coords.latitude,p.coords.longitude,16); },
      function(){ ipFallback(); },
      {timeout:7000, maximumAge:600000}
    );
  } else { ipFallback(); }

  var drawn=null, drawer=null, tiros=null;
  function toRad(d){return d*Math.PI/180;}
  function areaM2(latlngs){ var R=6378137,a=0,n=latlngs.length;
    for(var i=0;i<n;i++){ var p1=latlngs[i],p2=latlngs[(i+1)%n];
      a+=toRad(p2.lng-p1.lng)*(2+Math.sin(toRad(p1.lat))+Math.sin(toRad(p2.lat))); }
    return Math.abs(a*R*R/2); }

  function mostrarArea(layer){
    var ll=layer.getLatLngs()[0]; var m2=areaM2(ll), ha=m2/10000;
    document.getElementById('area').innerText=ha.toLocaleString('pt-BR',{maximumFractionDigits:2})+' ha';
    document.getElementById('hint').innerText=m2.toLocaleString('pt-BR',{maximumFractionDigits:0})+' m² · '+ll.length+' pontos';
    send({tipo:'area', area:ha, m2:m2, coords:ll.map(function(p){return [p.lat,p.lng];})});
  }
  function limparTiros(){ if(tiros){map.removeLayer(tiros);tiros=null;} }
  function limpar(){ if(drawn){map.removeLayer(drawn);drawn=null;} limparTiros();
    document.getElementById('area').innerText='0 ha';
    document.getElementById('hint').innerText='Desenhe o talhão.';
    send({tipo:'area', area:0, m2:0, coords:[]}); }
  function iniciarDesenho(){ limpar();
    drawer=new L.Draw.Polygon(map,{shapeOptions:{color:'#F4A83A',weight:3,fillOpacity:0.2}}); drawer.enable(); }
  map.on(L.Draw.Event.CREATED, function(e){ drawn=e.layer; drawn.addTo(map);
    try{ drawn.editing.enable(); }catch(err){}
    mostrarArea(drawn);
    drawn.on('edit', function(){limparTiros();mostrarArea(drawn);}); });

  // ===== Direção de aplicação =====
  function llToTurf(ll){ return ll.map(function(p){return [p.lng,p.lat];}); }
  function tracar(){
    if(!drawn){ alert('Desenhe o talhão primeiro.'); return; }
    if(typeof turf==='undefined'){ alert('Geometria ainda carregando, tente de novo.'); return; }
    limparTiros();
    var ll=drawn.getLatLngs()[0];
    var ring=llToTurf(ll); ring.push(ring[0]);
    var poly=turf.polygon([ring]);
    var faixa=parseFloat(document.getElementById('faixa').value)||8; var faixaKm=faixa/1000;
    var ventoSel=document.getElementById('vento').value;
    var bearing, motivo;
    if(ventoSel==='auto'){ bearing=eixoMaior(ll); motivo='tiros mais longos'; }
    else { var w=parseFloat(ventoSel); bearing=(w+90)%360; motivo='perpendicular ao vento'; }
    var center=turf.centerOfMass(poly);
    var bb=turf.bbox(poly);
    var diagKm=turf.distance([bb[0],bb[1]],[bb[2],bb[3]],{units:'kilometers'})*1.2+0.05;
    var perp=(bearing+90)%360;
    var baseA=turf.destination(center,diagKm,bearing,{units:'kilometers'});
    var baseB=turf.destination(center,diagKm,(bearing+180)%360,{units:'kilometers'});
    var nLados=Math.min(400,Math.ceil(diagKm/faixaKm));
    var segs=[], totalKm=0;
    for(var k=-nLados;k<=nLados;k++){
      var off=k*faixaKm;
      var a=turf.destination(baseA,off,perp,{units:'kilometers'});
      var b=turf.destination(baseB,off,perp,{units:'kilometers'});
      var linha=turf.lineString([a.geometry.coordinates,b.geometry.coordinates]);
      var inter;
      try{ inter=turf.lineIntersect(linha, turf.polygonToLine(poly)); }catch(e){ continue; }
      var pts=inter.features.map(function(f){return f.geometry.coordinates;});
      if(pts.length<2) continue;
      pts.sort(function(p,q){ return turf.distance(a.geometry.coordinates,p)-turf.distance(a.geometry.coordinates,q); });
      for(var i=0;i+1<pts.length;i+=2){
        segs.push([[pts[i][1],pts[i][0]],[pts[i+1][1],pts[i+1][0]]]);
        totalKm+=turf.distance(pts[i],pts[i+1],{units:'kilometers'});
      }
    }
    tiros=L.layerGroup();
    segs.forEach(function(s){ L.polyline(s,{color:'#00E0FF',weight:2,opacity:0.9}).addTo(tiros); });
    tiros.addTo(map);
    var dirTxt=bussola(bearing);
    document.getElementById('hint').innerText=segs.length+' tiros · '+totalKm.toLocaleString('pt-BR',{maximumFractionDigits:1})+' km · '+dirTxt+' ('+motivo+')';
    send({tipo:'tiros', tiros:segs.length, kmTotal:totalKm, bearing:bearing, motivo:motivo});
  }
  function eixoMaior(ll){ // bearing entre os 2 vértices mais distantes (tiros mais longos)
    var best=0,bd=-1;
    for(var i=0;i<ll.length;i++) for(var j=i+1;j<ll.length;j++){
      var d=turf.distance([ll[i].lng,ll[i].lat],[ll[j].lng,ll[j].lat]);
      if(d>bd){ bd=d; best=turf.bearing([ll[i].lng,ll[i].lat],[ll[j].lng,ll[j].lat]); }
    }
    return (best+360)%360;
  }
  function bussola(b){ var dirs=['N','NE','L','SE','S','SO','O','NO']; return dirs[Math.round(((b%360)/45))%8]; }
  // Carregar talhão existente para edição (vértices arrastáveis).
  (function(){
    var ini=${ini};
    if(ini && ini.length>2){
      drawn=L.polygon(ini,{color:'#F4A83A',weight:3,fillOpacity:0.2}).addTo(map);
      try{ map.fitBounds(drawn.getBounds(),{padding:[20,20]}); }catch(e){}
      try{ drawn.editing.enable(); }catch(e){}
      drawn.on('edit', function(){ limparTiros(); mostrarArea(drawn); });
      mostrarArea(drawn);
      document.getElementById('hint').innerText='Arraste os vértices para ajustar. "Desenhar" recomeça do zero.';
    }
  })();
</script>
</body>
</html>`;
}
