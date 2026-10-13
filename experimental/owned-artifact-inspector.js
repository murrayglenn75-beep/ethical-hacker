'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAX_BYTES=2*1024*1024;
const EXT=new Set(['.js','.cjs','.mjs']);
const RULES=[
{id:'ARTIFACT-DYNAMIC-EVAL',severity:'medium',re:/\b(?:eval\s*\(|new\s+Function\s*\()/g},
{id:'ARTIFACT-SHELL-EXEC',severity:'high',re:/\b(?:execSync|spawnSync)\s*\(/g},
{id:'ARTIFACT-CHILD-PROCESS',severity:'review',re:/\brequire\s*\(\s*['"]node:child_process['"]\s*\)/g}
];
function inspectOwnedArtifact({root,relativePath,authorized=false}={}){
 if(authorized!==true)throw Error('EXPLICIT_AUTHORIZATION_REQUIRED');
 if(typeof root!=='string'||typeof relativePath!=='string'||!root||!relativePath)throw Error('INVALID_PATH');
 if(path.isAbsolute(relativePath)||relativePath.replaceAll(String.fromCharCode(92),'/').split('/').some(s=>!s||s==='.'||s==='..'))throw Error('PATH_OUTSIDE_ROOT');
 const rootReal=fs.realpathSync(root);
 if(!fs.lstatSync(rootReal).isDirectory())throw Error('INVALID_ROOT');
 let cursor=rootReal;
 for(const segment of relativePath.replaceAll(String.fromCharCode(92),'/').split('/')){cursor=path.join(cursor,segment);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('SYMLINK_REFUSED');}
 const target=path.resolve(rootReal,relativePath);
 if(!target.startsWith(rootReal+path.sep))throw Error('PATH_OUTSIDE_ROOT');
 if(!EXT.has(path.extname(target).toLowerCase()))throw Error('UNSUPPORTED_FORMAT');
 const st=fs.lstatSync(target);
 if(!st.isFile())throw Error('NOT_REGULAR_FILE');
 if(st.size>MAX_BYTES)throw Error('FILE_TOO_LARGE');
 const fd=fs.openSync(target,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 let content;
 try{if(fs.fstatSync(fd).size>MAX_BYTES)throw Error('FILE_TOO_LARGE');content=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
 if(content.length>MAX_BYTES)throw Error('FILE_TOO_LARGE');
 if(content.includes(0))throw Error('BINARY_CONTENT_UNSUPPORTED');
 const sha256=crypto.createHash('sha256').update(content).digest('hex');
 const lines=new TextDecoder('utf-8',{fatal:true}).decode(content).split(/\r?\n/),findings=[];
 lines.forEach((line,i)=>{for(const rule of RULES){rule.re.lastIndex=0;for(const match of line.matchAll(rule.re)){
 findings.push({id:rule.id,severity:rule.severity,line:i+1,column:match.index+1,
 evidence:{artifactSha256:sha256,line:i+1,column:match.index+1,token:match[0]},
 status:'static_indicator_not_confirmed_vulnerability'});
 if(findings.length>=1000)throw Error('FINDING_LIMIT_EXCEEDED');
 }}}); 
 return {schemaVersion:1,mode:'static-read-only',relativePath:relativePath.replace(/\\/g,'/'),sha256,bytes:content.length,inspectedLines:lines.length,findings};
}
module.exports={inspectOwnedArtifact};
