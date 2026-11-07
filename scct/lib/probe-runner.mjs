/* SPDX-License-Identifier: Apache-2.0 */
// T0 independent adversarial challenge runner for every constitutional gate.
// This runner MUST NOT accept a zero exit as proof without a counterexample.
// Any inability to reproduce an unmutated gate is a HOLD, never a PASS.
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const BLOCKED=new Set(['.git','node_modules','.lake','dist','build']);
function inside(base,point){
 const rel=relative(base,point);
 return rel===''||(rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel));
}
function canonicalFile(root,p){
 if(typeof p!=='string'||!p||isAbsolute(p)||p.split(/[\\/]/).includes('..')||
    p.startsWith('.git/')||p.split(/[\\/]/).some(part=>BLOCKED.has(part))) {
  throw Error('NON_CANONICAL_PROBE_PATH');
 }
 const candidate=resolve(root,p);
 if(!inside(root,candidate)||!existsSync(candidate)||!inside(realpathSync(root),realpathSync(candidate))||
    !statSync(candidate).isFile())throw Error('PROBE_PATH_OUT_OF_SCOPE');
 return candidate;
}
function challengeRun(stage,argv){
 const result=spawnSync(argv[0],argv.slice(1),{
  cwd:stage,encoding:'utf8',timeout:12000,maxBuffer:160000
 });
 if(result.error||result.signal||typeof result.status!=='number')throw Error('PROBE_RUNNER_ERROR');
 return result.status;
}
function locate(document,pointer){
 if(typeof pointer!=='string'||!pointer.startsWith('/'))throw Error('INVALID_JSON_POINTER');
 const names=pointer.slice(1).split('/').map(n=>n.replace(/~1/g,'/').replace(/~0/g,'~'));
 let current=document;
 for(const name of names){
  if(name==='__proto__'||name==='prototype'||name==='constructor')throw Error('UNSAFE_JSON_POINTER');
  if(current===null||typeof current!=='object'||!Object.hasOwn(current,name))
   throw Error('PROBE_POINTER_MISSING');
  current=current[name];
 }
 return current;
}
function modify(file,mutation){
 const before=readFileSync(file,'utf8');
 if(before.length>1048576)throw Error('PROBE_INPUT_TOO_LARGE');
 let after;
 if(mutation.kind==='replace-text'){
  const find=mutation.find,replace=mutation.replace;
  if(typeof find!=='string'||!find||typeof replace!=='string'||
     before.indexOf(find)!==before.lastIndexOf(find)||!before.includes(find))
   throw Error('PROBE_REPLACE_NOT_UNIQUE');
  after=before.replace(find,replace);
 } else if(mutation.kind==='append-text'){
  if(typeof mutation.text!=='string'||!mutation.text||mutation.text.length>4096)
   throw Error('INVALID_APPEND_PROBE');
  after=before+mutation.text;
 } else if(mutation.kind==='json-set'||mutation.kind==='json-append'){
  const body=JSON.parse(before);
  const pointer=mutation.pointer;
  if(mutation.kind==='json-append'){
   const target=locate(body,pointer);
   if(!Array.isArray(target))throw Error('PROBE_TARGET_NOT_ARRAY');
   target.push(mutation.value);
  } else {
   const names=pointer.slice(1).split('/');
   const leaf=names.pop().replace(/~1/g,'/').replace(/~0/g,'~');
   const parent=names.length?locate(body,'/'+names.join('/')):body;
   if(leaf==='__proto__'||leaf==='constructor'||leaf==='prototype'||
      !parent||typeof parent!=='object'||!Object.hasOwn(parent,leaf))
    throw Error('PROBE_SET_MISSING_LEAF');
   parent[leaf]=mutation.value;
  }
  after=JSON.stringify(body,null,2)+'\n';
 }else throw Error('PROBE_KIND_NOT_SUPPORTED');
 if(after===before)throw Error('PROBE_NO_SEMANTIC_CHANGE');
 writeFileSync(file,after);
}
export function verifyNegativeProbes(root,gate){
 const probes=gate?.probes;
 if(!Array.isArray(probes)||probes.length<1||probes.length>3)
  return {ok:false,reason:'T0_HOLD:AT_LEAST_ONE_NEGATIVE_PROBE_REQUIRED'};
 for(const [index,probe] of probes.entries()){
  let scratch;
  try{
   canonicalFile(root,probe.path);
   if(probe.path===gate.argv[1])throw Error('PROBE_MUTATES_GATE_EXECUTABLE');
   scratch=mkdtempSync(join(tmpdir(),'scct-challenge-'));
   const stage=join(scratch,'candidate');
   cpSync(root,stage,{recursive:true,force:false,errorOnExist:false,
    filter:(source)=>{
     const rel=relative(root,source);
     if(!rel)return true;
     if(rel.split(sep).some(v=>BLOCKED.has(v)))return false;
     return !lstatSync(source).isSymbolicLink();
    }
   });
   const file=canonicalFile(stage,probe.path);
   // The unmutated cloned baseline MUST run first: absent dependencies,
   // invalid copy or a gate that always fails is not evidence of detection.
   if(challengeRun(stage,gate.argv)!==0)throw Error('ISOLATED_CONTROL_GATE_FAILED');
   modify(file,probe);
   if(challengeRun(stage,gate.argv)===0)throw Error('GATE_ACCEPTED_FORBIDDEN_MUTATION');
  }catch(error){
   return {ok:false,reason:'T0_HOLD:PROBE_'+index+':'+String(error?.message||error).slice(0,180)};
  }finally{
   if(scratch)rmSync(scratch,{recursive:true,force:true});
  }
 }
 return {ok:true};
}
