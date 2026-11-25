const fs=require('fs');
class El{constructor(t){this.t=t;this.a={};this.c=[]}setAttribute(k,v){this.a[k]=v}appendChild(e){this.c.push(e);return e}
 s(){return `<${this.t}${Object.entries(this.a).map(([k,v])=>` ${k}="${v}"`).join('')}>${this.c.map(c=>c.s()).join('')}</${this.t}>`}}
global.document={createElementNS:(ns,t)=>new El(t)};
eval(fs.readFileSync(process.argv[2],'utf8')+`
const out=process.argv[3];
function save(name,o){const s=new El('svg');s.setAttribute('xmlns',NS);scene(s,o);fs.writeFileSync(out+'/'+name+'.svg',s.s());}
save('camp-wide',{ w: 1600, h: 1000, seed: 21, horizon: 0.36, span: 0.42, treeScale: 1.05, layers: 4, dens: 0.9, van: { x: 860, y: 940, s: 2.0 }, clear: [660, 1060], grass: 700, blur: 9 });
save('camp-tall',{ w: 390, h: 844, seed: 14, horizon: 0.48, span: 0.19, treeScale: 0.66, layers: 4, van: { x: 205, y: 612, s: 1.0 }, clear: [70, 330], grass: 260, blur: 5 });
save('forest',{ w: 1600, h: 1000, seed: 41, horizon: 0.5, span: 0.4, treeScale: 1.1, layers: 4, grass: 500, blur: 8 });
save('card-dusk',{ w: 600, h: 312, seed: 9, horizon: 0.5, span: 0.32, treeScale: 1.05, layers: 3, sunset: true, van: { x: 390, y: 288, s: 0.85 }, clear: [250, 520], grass: 160, blur: 5 });
save('card-road',{ w: 600, h: 264, seed: 17, horizon: 0.42, span: 0.36, treeScale: 1.05, layers: 3, road: true, van: { x: 470, y: 238, s: 0.55 }, clear: [380, 580], grass: 120, blur: 4 });
save('card-night',{ w: 600, h: 312, seed: 33, horizon: 0.42, span: 0.36, treeScale: 1.1, layers: 3, van: { x: 260, y: 290, s: 0.8 }, clear: [120, 360], grass: 140, blur: 5 });
save('panel-dusk',{ w: 600, h: 720, seed: 9, horizon: 0.55, span: 0.3, treeScale: 1.0, layers: 4, sunset: true, grass: 160, blur: 5 });
save('panel-mist',{ w: 600, h: 720, seed: 52, horizon: 0.5, span: 0.34, treeScale: 1.05, layers: 4, grass: 160, blur: 5 });
save('panel-night',{ w: 600, h: 720, seed: 27, horizon: 0.58, span: 0.28, treeScale: 0.95, layers: 4, grass: 160, blur: 5 });
`);
