import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Only deployment paths and browser-storage names change. Artwork, fonts,
// scene geometry and animation parameters remain identical to the original.
const browserKeys=new Set(['lr-theme','lr-opening-seen','lr-position','lr-selected-project','online_session','battleship_room_connection','battleship-local-diagnostics-v1']);
export function rewriteForPages(code,{basePath='',namespace=''},filename=''){
  if(basePath&&!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath))throw Error('Invalid Pages base path.');
  if(namespace&&!/^[a-zA-Z0-9_-]+$/.test(namespace))throw Error('Invalid browser-storage namespace.');
  // The viewer validates a canonical path relative to its own module URL.
  if(basePath&&path.basename(filename)!=='image-viewer.js'){
    code=code.replace(/(["'`])(\/(?:assets|downloads|media)\/)/g,(_,quote,route)=>quote+basePath+route);
    code=code.replace(/url\((\/(?:assets|downloads|media)\/)/g,(_,route)=>'url('+basePath+route);
  }
  if(namespace)code=code.replace(/(["'`])([^"'`\r\n]+)\1/g,(literal,quote,key)=>browserKeys.has(key)?quote+namespace+':'+key+quote:literal);
  return code;
}
export async function preparePagesSubpath(root,options){
  let changed=0;
  async function visit(directory){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())await visit(file);
      else if(/\.(?:js|html|css|json)$/.test(entry.name)){
        const before=await readFile(file,'utf8'),after=rewriteForPages(before,options,file);
        if(before!==after){await writeFile(file,after);changed++;}
      }
    }
  }
  await visit(root);
  return changed;
}
