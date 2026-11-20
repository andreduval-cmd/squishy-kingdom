import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Map x/y remain authoritative for gameplay; Three uses x/z, at 25 map units per metre.
const U = 25, stage = document.getElementById('wstage');
const materials = new Map(), geometry = new Map();
const sphere = new T.SphereGeometry(1, 20, 14);
const cylinder = new T.CylinderGeometry(1, 1, 1, 16);
const cone = new T.ConeGeometry(1, 1, 24);
const vec = new T.Vector3(), ray = new T.Raycaster(), groundPlane = new T.Plane(new T.Vector3(0,1,0), 0);
let renderer, scene, camera, root, sunlight, shadowTarget, data, boat, failed=false, frame=0, last=0, zoom=1.08;
let width=0,height=0, held=false, lastSound=0;
const actors=new Map(), landmarks=[], crystals=[], rings=[], fadingRoofs=[];
const follow=new T.Vector3(16,0,20.2), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const grainData=new Uint8Array(64*64);for(let i=0;i<grainData.length;i++)grainData[i]=110+((i*73+(i*i*17))%70);
const grain=new T.DataTexture(grainData,64,64,T.RedFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(5,5);grain.needsUpdate=true;
const canvas=document.createElement('canvas'); canvas.id='world3d'; canvas.setAttribute('role','img'); canvas.setAttribute('aria-label','Three-dimensional Squishy Kingdom with plush characters, rounded toy buildings and gardens');
function mat(color, plush=false) {
  const key=color+':'+plush;
  if(!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness:plush?.94:.76,metalness:0,bumpMap:plush?grain:null,bumpScale:plush?.022:0}));
  return materials.get(key);
}
function mesh(parent,geo,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,plush=false) {
  const m=new T.Mesh(geo,mat(color,plush));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ball(p,color,x,y,z,sx,sy=sx,sz=sx,plush=false){return mesh(p,sphere,color,x,y,z,sx,sy,sz,plush);}
function box(p,color,x,y,z,w,h,d,r=.15){
  const key=[w,h,d,r].join(':');if(!geometry.has(key))geometry.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)));
  return mesh(p,geometry.get(key),color,x,y,z);
}
function label(text,w=384) {
  const cv=document.createElement('canvas');cv.width=w;cv.height=80;const c=cv.getContext('2d');
  c.fillStyle='#fffaf0f0';c.beginPath();c.roundRect(2,7,w-4,60,23);c.fill();
  c.font='600 29px Geist, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#59435c';c.fillText(text,w/2,39,w-27);
  const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:tx,depthWrite:false,transparent:true}));sprite.scale.set(3.9,.81,1);return sprite;
}
function starGeometry() {
  const shape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.57:1.05;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
  return new T.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelThickness:.22,bevelSize:.16,bevelSegments:3,steps:1});
}
const star=starGeometry();
function plush(appearance={},color='#efb4cf') {
  const outer=new T.Group(), body=new T.Group();outer.add(body);
  const kind=appearance.p||0;
  let core;
  if(kind===8){core=mesh(body,star,color,0,.95,-.28,.68,.68,.8,true);}
  else if(kind===5){core=mesh(body,new T.TorusGeometry(.52,.26,12,24),color,0,.8,0,1,1,.85,true);}
  else if(kind===6||appearance.b===2){core=box(body,color,0,.76,0,1.35,1.4,1.1,.35);}
  else {core=ball(body,color,0,.77,0,.74,.79,.62,true);}
  const front=kind===8?.3:kind===5?.22:.54;
  if(kind===1||(kind===0&&![2,4].includes(appearance.f))||appearance.f===3){
    [-1,1].forEach(s=>{const ear=ball(body,color,s*.35,1.62,-.03,.21,.64,.22,true);ear.rotation.z=s*-.16;ball(ear,'#e7a2bd',0,.02,.75,.53,.66,.15);});
  }
  if(kind===2||kind===4||appearance.f===2){[-1,1].forEach(s=>ball(body,color,s*.5,1.4,-.03,.28,.29,.22,true));}
  if(kind===3||appearance.f===4){[-1,1].forEach(s=>ball(body,color,s*.42,1.39,.05,.29,.28,.25,true));}
  if(kind===7){[-1,1].forEach(s=>ball(body,color,s*.52,.83,0,.43,.4,.5,true));}
  const eyeY=kind===3?1.4:.97;
  [-1,1].forEach(s=>{
    ball(body,'#382c42',s*.245,eyeY,front,.075,.095,.045);
    ball(body,'#fffdf2',s*.245-.02,eyeY+.03,front+.04,.022);
    if(!appearance.n)ball(body,'#ed9eb2',s*.405,.76,front-.015,.115,.057,.027);
    const foot=ball(body,color,s*.38,.18,.23,.23,.17,.3,true);foot.userData.foot=s;
    const arm=ball(body,color,s*.69,.59,.01,.18,.31,.22,true);arm.rotation.z=s*-.38;
  });
  const curve=new T.QuadraticBezierCurve3(new T.Vector3(-.12,.78,front+.05),new T.Vector3(0,.64,front+.12),new T.Vector3(.12,.78,front+.05));
  mesh(body,new T.TubeGeometry(curve,12,.022,5,false),'#5b3b53');
  if(appearance.a===3||appearance.h===5){
    mesh(body,cylinder,'#d8b66c',0,1.91,0,.33,.12,.33);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(body,cone,'#e5c67b',Math.sin(a)*.26,2.08,Math.cos(a)*.26,.12,.3,.12);}
    ball(body,'#d384b0',0,1.98,.3,.07);
  } else if(appearance.a===2||appearance.h===4){mesh(body,cylinder,'#6e5174',0,1.75,0,.44,.08,.44);mesh(body,cylinder,'#8d6a9d',0,1.97,0,.29,.44,.29);}
  else if(appearance.h||appearance.a===1){[-1,1].forEach(s=>{const bow=ball(body,'#bc7295',s*.15,1.63,.3,.2,.12,.08);bow.rotation.z=s*.3;});ball(body,'#d496ac',0,1.63,.36,.09);}
  // Small seams catch the light, rather than making the plush look like hard plastic.
  core.userData.plush=true;outer.userData={body,spring:0,velocity:0,lastX:null,lastZ:null,signature:JSON.stringify(appearance),moving:false};
  return outer;
}
function actor(id,appearance,name,color) {
  const signature=JSON.stringify(['p','c','f','h','b','g','s','e','m','n','a','t'].map(k=>appearance[k]||0))+color;
  let a=actors.get(id);
  if(a&&a.userData.signature!==signature){removeActor(id);a=null;}
  if(!a){a=plush(appearance,color);a.userData.signature=signature;a.userData.name=name;const tag=label(name);tag.position.set(0,2.65,0);tag.scale.set(2.4,.5,1);a.add(tag);a.userData.tag=tag;scene.add(a);actors.set(id,a);}
  return a;
}
function removeActor(id){const a=actors.get(id);if(!a)return;scene.remove(a);a.userData.tag.material.map.dispose();a.userData.tag.material.dispose();if(a.userData.chat){a.userData.chat.material.map.dispose();a.userData.chat.material.dispose();}a.traverse(o=>{if(o.isMesh&&!geometryHas(o.geometry)&&o.geometry!==sphere&&o.geometry!==cylinder&&o.geometry!==cone&&o.geometry!==star)o.geometry.dispose();});actors.delete(id);}
function geometryHas(g){for(const value of geometry.values())if(value===g)return true;return false;}
function colors(a){const c=data.colors[a.c];return c?.startsWith('#')?c:a.c===29?'#a28bc7':'#e9b9d5';}
function updateActor(a,x,z,moving,squeeze,dt,time) {
  const d=a.userData,body=d.body;
  if(d.interpolate&&d.lastX!=null){const blend=1-Math.exp(-dt*14);x=a.position.x+(x-a.position.x)*blend;z=a.position.z+(z-a.position.z)*blend;}
  const dx=d.lastX==null?0:x-d.lastX,dz=d.lastZ==null?0:z-d.lastZ;d.lastX=x;d.lastZ=z;
  a.position.set(x,0,z);
  const target=squeeze?.32:0;
  d.velocity+=(target-d.spring)*120*dt;d.velocity*=Math.exp(-13*dt);d.spring+=d.velocity*dt;
  const gait=moving&&!reduced?Math.sin(time*13):0, breath=reduced?0:Math.sin(time*2.3)*.018;
  const squash=d.spring+Math.max(0,-gait)*.065;
  body.scale.set(1+squash*.52-breath*.3,1-squash+breath,1+squash*.45);
  body.position.y=moving&&!reduced?Math.max(0,gait)*.13:0;
  body.rotation.z=moving&&!reduced?Math.sin(time*6.5)*.055:0;
  if(Math.abs(dx)+Math.abs(dz)>.002){const targetYaw=Math.atan2(dx,dz);let diff=targetYaw-body.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));body.rotation.y+=diff*Math.min(1,dt*10);}
  body.children.forEach(o=>{if(o.userData.foot)o.position.y=.18+Math.max(0,gait*o.userData.foot)*.07;});
  d.tag.position.y=2.65-d.spring*.45;d.moving=moving;d.squeezing=!!squeeze;
}
function tree(x,z,s=1,pink=false) {
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);root.add(g);
  mesh(g,cylinder,'#a38b6e',0,.65,0,.14,1.3,.14);
  ball(g,pink?'#e8c2d5':'#a8c796',0,1.65,0,.94,.91,.89);
  ball(g,pink?'#efd3df':'#c2d7a5',-.43,1.86,.12,.57,.6,.6);
  ball(g,pink?'#e0afc8':'#94b58b',.45,1.53,.07,.59,.62,.63);
}
function building(b,i) {
  const x=(b.x+b.w/2)/U,z=(b.y+b.h/2)/U,w=b.w/U,d=b.h/U;
  const g=new T.Group();g.position.set(x,0,z);root.add(g);
  if(b.soft){
    box(g,'#9bb78c',0,.14,0,w,.28,d,.25);
    for(let ix=0;ix<5;ix++)for(let iz=0;iz<3;iz++){box(g,'#b4a18a',(ix-2)*1.45,.3,(iz-1)*1.7,1.2,.25,1.1,.13);ball(g,['#e9bad0','#ced9ac','#c8bce0'][ix%3],(ix-2)*1.45,.65,(iz-1)*1.7,.35,.4,.35,true);}
    const sign=label('Squishy Garden');sign.position.set(0,2.5,-d/2);g.add(sign);return;
  }
  const h=b.ti!=null?3.4:2.6;
  box(g,'#ded0b7',0,.14,0,w+.36,.28,d+.36,.25);
  box(g,b.c,0,h/2+.2,0,w,h,d,.42);
  box(g,'#fff0d3',0,.45,d/2+.02,w,.35,.17,.08);
  const roofColor=['#ae7f9b','#9185ad','#b87f98','#aa8b63'][i%4];
  const roofGeo=new T.CylinderGeometry(1,1,w+.65,24,1,false,0,Math.PI);roofGeo.rotateZ(Math.PI/2);
  const roof=mesh(g,roofGeo,roofColor,0,h+.12,0,1,1.25,d/2+.36);roof.userData.fadeBuilding=b;
  const rim=box(g,roofColor,0,h+.08,0,w+.7,.17,d+.75,.08);rim.userData.fadeBuilding=b;
  const trimColor=new T.Color(roofColor).lerp(new T.Color('#ffe7dc'),.25).getStyle();
  const archGeo=new T.TorusGeometry(1,.012,4,24,Math.PI);archGeo.rotateY(Math.PI/2);
  for(let k=0;k<6;k++){const trim=mesh(g,archGeo,trimColor,-w/2+k*w/5,h+.14,0,1,1.27,d/2+.38);trim.userData.fadeBuilding=b;}
  if(b.k==='League'||b.k==='Vault'||b.ti!=null){
    for(const s of [-1,1]){
      mesh(g,cylinder,b.c,s*(w/2-.2),h*.7,-d*.33,.56,h*1.35,.56);
      mesh(g,cone,roofColor,s*(w/2-.2),h*1.45,-d*.33,.76,1.1,.76);
      ball(g,'#d7b66c',s*(w/2-.2),h*1.45+.58,-d*.33,.1);
    }
  } else {
    box(g,'#ddc1b9',w*.29,h+1.2,-d*.2,.48,1.2,.5,.09);
    box(g,'#bea295',w*.29,h+1.85,-d*.2,.65,.16,.67,.05);
  }
  box(g,'#b18b9c',0,1.02,d/2+.045,1.3,1.96,.18,.42);
  box(g,'#70536e',0,.97,d/2+.16,1.05,1.78,.13,.4);
  box(g,'#e6c786',.3,.88,d/2+.26,.08,.08,.06,.025);
  box(g,'#e6d7b8',0,.15,d/2+.4,1.65,.22,.75,.08);
  for(const s of [-1,1]){
    box(g,'#d6b5ba',s*w*.32,1.5,d/2+.07,.8,1.1,.17,.22);
    box(g,'#fff1b9',s*w*.32,1.5,d/2+.17,.6,.88,.08,.18);
    box(g,'#c2a2ad',s*w*.32,1.5,d/2+.23,.055,.88,.04,.01);
    box(g,'#c2a2ad',s*w*.32,1.5,d/2+.23,.6,.055,.04,.01);
    box(g,'#c296a5',s*w*.32,.82,d/2+.24,.9,.22,.38,.09);
    for(let j=0;j<3;j++)ball(g,['#dfafcb','#cbb1df','#f2d99e'][j],s*w*.32+(j-1)*.23,.99,d/2+.26,.15);
  }
  const sign=label(b.n);sign.position.set(0,h+2,d/2+.2);sign.scale.set(Math.min(w+.3,5.6),.85,1);g.add(sign);
  // Cloth pennant and a little rounded canopy make each doorway easy to spot.
  box(g,'#a58b79',-w*.5+.4,h+1,0,.055,1.7,.055,.01);
  const flag=box(g,i%2?'#ba89ac':'#ac9bc4',-w*.5+.78,h+1.5,0,.7,.4,.06,.05);flag.rotation.z=-.08;
  landmarks.push({group:g,building:b,sign});
}
function crystalsAt(x,z,count=3){
  const g=new T.Group();g.position.set(x,0,z);root.add(g);
  for(let i=0;i<count;i++){const gem=mesh(g,new T.OctahedronGeometry(.38,0),['#bca7e3','#d5b7e9','#b2d6e1'][i%3],(i-(count-1)/2)*.5,.5+(i%2)*.15,Math.sin(i)*.24,1,1.9,1);gem.rotation.z=(i-1)*.15;}
  return g;
}
function bakeStatic() {
  root.updateMatrixWorld(true);const batches=new Map(),remove=[];
  root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const owner=o.userData.fadeBuilding;const key=o.material.uuid+(owner?':'+owner.k:'');
    if(!batches.has(key))batches.set(key,{material:owner?o.material.clone():o.material,geometries:[],owner});
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    // Align attributes across rounded boxes, spheres and cylinders before merging.
    for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
    batches.get(key).geometries.push(g);remove.push(o);
  });
  for(const o of remove)o.parent.remove(o);
  for(const {material,geometries,owner} of batches.values()){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const m=new T.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(owner){material.transparent=true;fadingRoofs.push({mesh:m,bounds:new T.Box3().setFromObject(m)});}}
}
function environment(d) {
  root=new T.Group();scene.add(root);
  // A thick, rounded toy-table island with a real shoreline and little stepping stones.
  box(root,'#9bb3a0',23.2,-1,22,47,1.8,44,.8);
  box(root,'#c3d6ac',23.2,-.14,21.9,46.4,.38,43.8,.4);
  box(root,'#e9d8bd',16,.08,22,2.3,.13,44,.1);
  box(root,'#e9d8bd',23.2,.08,20.2,46.4,.13,2.7,.1);
  for(let i=0;i<28;i++){box(root,i%3?'#efe2cb':'#dfcdb6',16,.17,i*1.55+.45,1.98,.13,1.32,.23);}
  for(let i=0;i<31;i++){box(root,i%3?'#efe2cb':'#dfcdb6',i*1.54+.5,.17,20.2,1.32,.13,2.38,.23);}
  d.buildings.forEach(building);
  d.trees.forEach(([x,y],i)=>tree(x/U,y/U,.85+(i%3)*.15,i%4===0));
  // Forest canopy follows the existing impassable northern woods.
  for(let x=33;x<46;x+=2.3)for(let z=1;z<11;z+=2.5)tree(x,z,.9+(Math.sin(x+z)+1)*.15);
  d.hedges.forEach(h=>box(root,'#86a87d',(h.x+h.w/2)/U,.48,(h.y+h.h/2)/U,h.w/U,.95,h.h/U,.2));
  for(let i=0;i<70;i++){
    const x=((i*173)%1100+20)/U,z=((i*97)%1020+20)/U;
    if(Math.abs(x-16)<1.8||Math.abs(z-20.2)<1.8||d.buildings.some(b=>x*U>b.x-20&&x*U<b.x+b.w+20&&z*U>b.y-20&&z*U<b.y+b.h+20))continue;
    ball(root,'#9fbe87',x,.15,z,.28,.18,.25);
    ball(root,['#e5b1c9','#ead5a4','#cbb4db'][i%3],x+.03,.4,z,.14);
  }
  d.markets.forEach((s,i)=>{
    const g=new T.Group();g.position.set(s.x/U,0,s.y/U);root.add(g);
    for(const x of [-.8,.8])box(g,'#b49378',x,1.2,0,.1,2.4,.1,.03);
    box(g,'#efdcc0',0,.75,.22,1.9,.35,.9,.09);
    for(let k=0;k<6;k++)box(g,k%2?'#fff0d7':['#bda2d4','#dfafc7','#b4b5a4'][i],-.84+k*.335,2.35,.08,.34,.18,1.4,.06);
    const title=label(s.n);title.position.set(0,3.1,0);title.scale.set(3.4,.7,1);g.add(title);
  });
  // Crystal portal, with its doorway at the original quest interaction location.
  const portalX=(d.portal.x+d.portal.w/2)/U,portalZ=(d.portal.y+55)/U;
  for(const s of [-1,1])crystalsAt(portalX+s*.95,portalZ,3);
  box(root,'#a593c3',portalX,1.25,portalZ,1.2,2.5,.5,.5);
  box(root,'#d7bcec',portalX,1.2,portalZ+.3,.9,2.1,.12,.4);
  const portalSign=label('Crystal Kingdom');portalSign.position.set(portalX,3.3,portalZ);root.add(portalSign);
  // Cozy pad, foam cushions, cloud pavilion and tactile slime bowl.
  const cozy=d.cozy,cx=(cozy.x+cozy.w/2)/U,cz=(cozy.y+cozy.h/2)/U;
  box(root,'#d6c9e1',cx,.1,cz,cozy.w/U,.25,cozy.h/U,.4);
  for(let i=0;i<3;i++)ball(root,['#e7c6d7','#c5d5be','#e6d7b6'][i],cx+(i-1)*1.4,.4,cz+2,.67,.3,.72,true);
  box(root,'#eadcc8',cx,1.6,cz-2.5,4.3,.35,2,.25);
  for(const s of [-1,1])box(root,'#c5b4a6',cx+s*1.8,.8,cz-2.5,.16,1.6,.16,.04);
  const cozyLabel=label('Cozy Corner');cozyLabel.position.set(cx,2.6,cz-2.5);root.add(cozyLabel);
  // Gate walls match collision geometry exactly; the centre barrier updates with league.
  d.gates.forEach(g=>{
    for(const [x,w] of [[185,370],[615,370]])box(root,'#c9afbd',x/U,.43,(g.y+8)/U,w/U,.85,.64,.14);
    const barrier=box(root,'#b193b8',16,.45,(g.y+8)/U,2.4,.9,.45,.15);barrier.userData.league=g.lg;barrier.name='league-barrier';
    // Leave dynamic gates outside static merging.
    root.remove(barrier);scene.add(barrier);landmarks.push({barrier});
  });
  // Shoreline, dock and Shell Island remain reachable with the original boat logic.
  box(root,'#8ecbd2',23.2,-.4,53.2,46.4,.5,18.4,.2);
  box(root,'#e7d8b9',23.2,-.05,44.1,46.4,.16,.7,.15);
  box(root,'#c5a783',(d.dock.x+d.dock.w/2)/U,.1,(d.dock.y+d.dock.h/2)/U,d.dock.w/U,.25,d.dock.h/U,.08);
  ball(root,'#e2d2ad',d.island.x/U,-.1,d.island.y/U,d.island.rx/U,.5,d.island.ry/U);
  ball(root,'#c5d9ab',d.island.x/U,.02,d.island.y/U,d.island.rx/U-.4,.42,d.island.ry/U-.35);
  box(root,'#b48e72',d.chest.x/U,.38,d.chest.y/U,.9,.7,.6,.14);
  box(root,'#dcbf70',d.chest.x/U,.4,d.chest.y/U+.31,.1,.65,.045,.01);
  tree(d.island.x/U-2,d.island.y/U,.8);
  bakeStatic();
  d.shards.forEach(([x,y],i)=>{const g=new T.Group();const m=mesh(g,new T.OctahedronGeometry(.29,0),'#b8a0e3',0,.8,0,1,1.7,1);g.position.set(x/U,0,y/U);scene.add(g);crystals.push({group:g,mesh:m,index:i});});
}
function init(d) {
  data=d;
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();scene.background=new T.Color('#dfd9e7');scene.fog=new T.Fog('#dfd9e7',50,105);
  camera=new T.OrthographicCamera(-12,12,8,-8,.1,150);
  scene.add(new T.HemisphereLight('#fff3df','#a4b99a',1.65));
  sunlight=new T.DirectionalLight('#fff0d2',2.6);sunlight.position.set(8,30,18);sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(1536,1536);sunlight.shadow.camera.left=-18;sunlight.shadow.camera.right=18;sunlight.shadow.camera.top=18;sunlight.shadow.camera.bottom=-18;sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=65;sunlight.shadow.normalBias=.035;sunlight.shadow.bias=-.00015;scene.add(sunlight);
  shadowTarget=new T.Object3D();scene.add(shadowTarget);sunlight.target=shadowTarget;
  const fill=new T.DirectionalLight('#e3d9ff',.8);fill.position.set(-15,10,-12);scene.add(fill);
  environment(d);
  boat=new T.Group();ball(boat,'#b39678',0,.15,0,.9,.25,1.2);box(boat,'#e2c9a6',0,.35,0,1.4,.16,1.8,.2);mesh(boat,cylinder,'#a48972',-.4,1.4,-.3,.04,2.6,.04);box(boat,'#ecd6df',.1,1.85,-.3,1,.95,.04,.12);scene.add(boat);
  stage.prepend(canvas);stage.classList.add('world-is-3d');
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;stage.classList.remove('world-is-3d');canvas.hidden=true;document.getElementById('world3d-controls').hidden=true;});
  addControls();
}
function addControls() {
  const ui=document.createElement('div');ui.id='world3d-controls';ui.innerHTML='<span>PLUSH WORLD · 3D</span><div><button id="world-zoom-out" aria-label="Zoom out">−</button><button id="world-zoom-in" aria-label="Zoom in">+</button><button id="plush-squeeze" aria-label="Hold to squish your character" aria-pressed="false">Squish me</button></div>';
  stage.append(ui);
  ui.querySelector('#world-zoom-out').onclick=()=>{zoom=Math.max(.65,zoom-.15);};
  ui.querySelector('#world-zoom-in').onclick=()=>{zoom=Math.min(1.7,zoom+.15);};
  const button=ui.querySelector('#plush-squeeze');
  const set=v=>{held=v;button.setAttribute('aria-pressed',String(v));if(v&&performance.now()-lastSound>350){lastSound=performance.now();window.kingdom3DBridge.squishSound();}};
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);set(true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,()=>set(false)));
  button.addEventListener('click',e=>{if(e.detail===0){set(true);setTimeout(()=>set(false),500);}});
  addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)&&window.kingdom3DBridge.canPlay()){e.preventDefault();set(true);}});
  addEventListener('keyup',e=>{if(e.code==='Space')set(false);});
  addEventListener('blur',()=>set(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)set(false);});
  stage.addEventListener('pointerdown',e=>{
    if(e.target.id!=='wcv'||!window.kingdom3DBridge.canPlay())return;
    const local=actors.get('local');if(!local)return;
    const r=stage.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    if(ray.intersectObject(local.userData.body,true).length){set(true);stage.setPointerCapture(e.pointerId);}
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stage.addEventListener(ev,()=>set(false)));
}
function render(d) {
  if(failed)return false;
  try{if(!renderer)init(d);}catch(error){failed=true;console.warn('3D renderer unavailable; using the existing world renderer.',error);return false;}
  data=d;
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return true;
  if(width!==w||height!==h){width=w;height=h;renderer.setSize(w,h,false);}
  const now=performance.now()/1000,dt=last?Math.min(.045,now-last):1/60;last=now;
  const isHeld=held&&d.canPlay;const present=new Set();
  const me=actor('local',d.avatar,d.playerName||'You',colors(d.avatar));present.add('local');
  updateActor(me,d.player.x/U,d.player.y/U,d.moving,isHeld,dt,now);
  me.position.y=d.boat?.43:0;boat.visible=d.boat;boat.position.set(d.player.x/U,Math.sin(now*1.7)*.035,d.player.y/U);
  d.peers.forEach(p=>{
    const id='peer:'+p.id;present.add(id);const a=actor(id,p,p.label,colors(p));a.visible=p.scene==='world';a.userData.interpolate=true;
    updateActor(a,(p.tx??p.x)/U,(p.ty??p.y)/U,p.moving,p.squish,dt,now);
    if(p.say&&a.userData.lastSay!==p.say){
      if(a.userData.chat){a.remove(a.userData.chat);a.userData.chat.material.map.dispose();a.userData.chat.material.dispose();}
      const bubble=label(p.say.length>38?p.say.slice(0,37)+'…':p.say);bubble.position.set(0,3.3,0);bubble.scale.set(4.4,.85,1);a.add(bubble);a.userData.chat=bubble;a.userData.lastSay=p.say;
    }
    if(a.userData.chat)a.userData.chat.visible=(p.until||0)>performance.now();
  });
  d.npcs.forEach((p,i)=>{const id='npc:'+i;present.add(id);const a=actor(id,{p:[3,0,4][i],h:[1,4,4][i]},['Granny Gumdrop','Cowboy Cooper','Wizard Wobble'][i],['#e5c5ae','#c8d7b5','#bdb0db'][i]);updateActor(a,p.x/U,p.y/U,true,false,dt,now+i);});
  const princess=actor('prism',{p:8,a:3},'Princess Prism','#c4abe5');present.add('prism');updateActor(princess,d.prism.x/U,d.prism.y/U,false,false,dt,now);
  if(d.follower){const f=actor('follower',{p:9},'Mochi','#edb7cc');present.add('follower');updateActor(f,d.follower.x/U,d.follower.y/U,d.moving,false,dt,now+.5);f.scale.setScalar(.62);}
  const enemies=d.blobs.concat(d.guards.filter(g=>d.quest===1&&!g.dead&&!((d.shardMask>>g.si)&1)));
  enemies.forEach((p,i)=>{const id='gloom:'+i;present.add(id);const a=actor(id,{p:9},`Gloom · Lv ${p.lv}`,'#a7a2bb');updateActor(a,p.x/U,p.y/U,false,false,dt,now+i);a.scale.setScalar(.9);});
  for(const id of actors.keys())if(!present.has(id))removeActor(id);
  for(const {barrier} of landmarks)if(barrier)barrier.visible=d.league<barrier.userData.league;
  for(const gem of crystals){gem.group.visible=d.quest===1&&!((d.shardMask>>gem.index)&1);gem.mesh.position.y=.85+Math.sin(now*2+gem.index)*.12;gem.mesh.rotation.y=now*.5;}
  // A damped follow camera keeps arrow directions intuitive and avoids sudden snaps.
  const px=d.player.x/U,pz=d.player.y/U;
  if(frame===0||Math.hypot(follow.x-px,follow.z-pz)>15)follow.set(px,0,pz);
  else follow.lerp(vec.set(px,0,pz),1-Math.exp(-dt*7));
  const span=(w<600?16:19)/zoom;
  camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  camera.position.set(follow.x+7.2,18,follow.z+20.5);camera.lookAt(follow.x,0,follow.z-1.2);camera.updateMatrixWorld();
  const focus=vec.set(px,.9,pz),distance=camera.position.distanceTo(focus);ray.ray.set(camera.position,new T.Vector3().subVectors(focus,camera.position).normalize());
  for(const roof of fadingRoofs){const hit=ray.ray.intersectBox(roof.bounds,new T.Vector3());const blocked=hit&&camera.position.distanceTo(hit)<distance-.5;const target=blocked?.25:1;roof.mesh.material.opacity+=(target-roof.mesh.material.opacity)*(1-Math.exp(-dt*10));roof.mesh.material.depthWrite=roof.mesh.material.opacity>.98;roof.mesh.castShadow=!blocked;}
  sunlight.position.set(follow.x-9,27,follow.z+13);shadowTarget.position.set(follow.x,0,follow.z);shadowTarget.updateMatrixWorld();
  // Ground rings give a soft, tactile response without changing the coin economy.
  if(isHeld&&frame%12===0&&!reduced){
    const material=new T.MeshBasicMaterial({color:'#e5b5d0',transparent:true,opacity:.6,depthWrite:false});
    const ring=new T.Mesh(new T.RingGeometry(.55,.66,32),material);ring.rotation.x=-Math.PI/2;ring.position.set(px,.23,pz);scene.add(ring);rings.push({mesh:ring,age:0});
  }
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.age+=dt;r.mesh.scale.setScalar(1+r.age*2);r.mesh.material.opacity=Math.max(0,.6-r.age*.8);if(r.age>.75){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1);}}
  renderer.render(scene,camera);frame++;
  return true;
}
function project(x,y,elevation=0){if(!camera)return null;const p=new T.Vector3(x/U,elevation,y/U).project(camera);const r=stage.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
function unproject(clientX,clientY){if(!camera)return null;const r=stage.getBoundingClientRect();ray.setFromCamera(new T.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);if(!ray.ray.intersectPlane(groundPlane,vec))return null;return{x:vec.x*U,y:vec.z*U};}
window.Squishy3D={render,project,unproject,get held(){return held;},get ready(){return !!renderer&&!failed;},get diagnostics(){return{frame,actors:actors.size,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,zoom,localSquash:actors.get('local')?.userData.spring||0};}};
