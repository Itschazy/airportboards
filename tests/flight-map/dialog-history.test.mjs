import test from 'node:test';import assert from 'node:assert/strict';
import {createDialogHistory} from '../../public/flight-map/v8/dialogs.js';
function fixture(){
 const events=[],stack=[{}];let backs=0,abort=false;
 const ds=['add','share','backup'].map(id=>({id,open:false,dataset:{},showModal(){this.open=true;},close(){if(!this.open)return;this.open=false;events.push(()=>controller.closed(this));}}));
 const history={get state(){return stack.at(-1);},url:()=>'/map',pushState:s=>stack.push(s),back(){backs++;events.push(()=>{stack.pop();controller.pop();});}};
 const controller=createDialogHistory({history,dialogs:()=>ds,onOpen(){},onClose(){},aborted:()=>abort});
 return {controller,ds,stack,events,flush(){while(events.length)events.shift()();},abort(){abort=true;},get backs(){return backs;}};
}
test('immediate share after saving waits for the form history entry to close',()=>{
 const f=fixture(),[add,share]=f.ds;let exports=0;
 f.controller.open(add);f.controller.close(add);f.controller.open(share,()=>exports++);
 assert.equal(share.open,false);assert.equal(exports,0);f.flush();
 assert.equal(share.open,true);assert.equal(exports,1);assert.equal(f.backs,1);assert.equal(f.stack.length,2);
 f.stack.pop();f.controller.pop();f.flush();assert.equal(share.open,false);assert.equal(f.backs,1);
});
test('native close and queued restore use one back; abort cancels a queued next sheet',()=>{
 const f=fixture(),[add,share,backup]=f.ds;
 f.controller.open(add);add.close();f.flush();assert.equal(f.backs,1);
 f.controller.open(backup);f.controller.close(backup,()=>f.controller.open(add));f.flush();assert.equal(add.open,true);
 f.controller.close(add);f.controller.open(share);f.abort();f.flush();assert.equal(share.open,false);
});
