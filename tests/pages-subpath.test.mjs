import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {rewriteForPages} from '../scripts/prepare-pages-subpath.mjs';
const options={basePath:'/ux',namespace:'portfolio-ux'};
test('UX media and download paths use the new deployment while relative and external URLs remain valid',()=>{
  for(const route of ['/assets/projects/spray/report/page-01.webp','/downloads/report.pdf','/media/film.mp4'])assert.equal(JSON.parse(rewriteForPages(JSON.stringify({route}),options,'app.js')).route,'/ux'+route);
  const links="const a='./assets/image.webp', b='https://example.com/assets/image.webp';";assert.equal(rewriteForPages(links,options,'app.js'),links);
});
test('UX browser preferences and game sessions are isolated from the other editions',()=>{
  for(const key of ['lr-theme','lr-opening-seen','lr-position','lr-selected-project','online_session','battleship_room_connection','battleship-local-diagnostics-v1'])assert.equal(rewriteForPages(`localStorage.getItem('${key}')`,options,'app.js'),`localStorage.getItem('portfolio-ux:${key}')`);
});
async function viewer(src,theme='light'){
  const source=await readFile(new URL('../dist/image-viewer.js',import.meta.url),'utf8');
  const code=rewriteForPages(source,options,'image-viewer.js').replace(/^import .*;\r?\n/gm,'').replace('import.meta.url',JSON.stringify('https://serenaaa66.github.io/ux/image-viewer.js'));
  const elements=new Map();const document={documentElement:{dataset:{},style:{setProperty(){}}},querySelector(){return {content:''};},getElementById(id){if(!elements.has(id))elements.set(id,{hidden:true,addEventListener(){}});return elements.get(id);}};
  vm.runInNewContext(code,{URL,URLSearchParams,location:{search:'?'+new URLSearchParams({src,drawing:'artwork'})},localStorage:{getItem(){return theme;}},document,loadTypography(){},mountRoboticsInkOverlay(){}});return elements;
}
test('UX full-size viewer accepts its own report and transparent robotics images',async()=>{
  for(const src of ['/ux/assets/projects/spray/report/page-01.webp','/ux/assets/projects/first-order-robotics/kicker-assembly-transparent.webp']){const elements=await viewer(src);assert.equal(elements.get('image').src,src);assert.equal(elements.get('image').hidden,false);assert.equal(elements.get('back').href,'./#project/'+(src.includes('/spray/')?'spray':'first-order-robotics'));}
});
test('UX viewer rejects images belonging to another edition or external hosts',async()=>{
  for(const src of ['/assets/projects/spray/report/page-01.webp','/play/assets/projects/spray/report/page-01.webp','https://example.com/image.webp']){const elements=await viewer(src);assert.equal(elements.get('image')?.src,undefined);assert.equal(elements.get('error').hidden,false);}
});
