(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[931],{8343:function(e,t,r){Promise.resolve().then(r.bind(r,229))},229:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return c}});var o=r(7437),n=r(2265);r(1068);var s=e=>{let{messages:t,messagesEndRef:r}=e,[s,i]=(0,n.useState)(!1),a=e=>{navigator.clipboard.writeText(e).then(()=>{console.log("Text copied to clipboard"),i(!0),setTimeout(()=>i(!1),2e3)},e=>console.error("Could not copy text: ",e))};return(0,o.jsxs)("div",{style:{height:"450px",overflowY:"auto",marginBottom:"10px",padding:"10px",border:"1px solid #ccc",borderRadius:"8px",whiteSpace:"pre-wrap"},children:[t.map((e,t)=>(0,o.jsx)("div",{style:{textAlign:"user"===e.type?"right":"left",margin:"10px 0"},children:"image"===e.type?(0,o.jsx)("img",{src:e.imageUrl,alt:"Uploaded",style:{margin:"0 0 0 auto",maxWidth:"200px",maxHeight:"200px",borderRadius:"8px"}}):(0,o.jsx)("span",{style:{padding:"10px",borderRadius:"20px",background:"user"===e.type?"#007bff":"#eee",color:"user"===e.type?"white":"black",display:"inline-block",maxWidth:"70%",wordWrap:"break-word",fontSize:"思考中......"===e.text?"13px":"15px",fontStyle:"思考中......"===e.text?"italic":"normal",cursor:"default"},onClick:()=>a(e.text),children:e.text})},t)),s&&(0,o.jsx)("div",{style:{fontSize:"13px",position:"fixed",bottom:"50px",left:"50%",transform:"translateX(-50%)",background:"green",color:"white",padding:"8px",borderRadius:"4px",zIndex:1e3},children:"已复制到剪贴板"}),(0,o.jsx)("div",{ref:r})]})},i=e=>{let{onUpload:t}=e,[r,s]=(0,n.useState)(null),[i,a]=(0,n.useState)(!1),l=[".txt",".docx",".pdf"],c=async()=>{if(r){a(!0);try{await t(r)}catch(e){console.error("上传失败:",e)}a(!1)}else alert("请选择一个文件上传！")};return(0,o.jsxs)("div",{style:{display:"flex",justifyContent:"flex-end",alignItems:"center",marginBottom:"10px"},children:[(0,o.jsx)("input",{type:"file",accept:l.join(","),onChange:e=>{var t;let r=null===(t=e.target.files)||void 0===t?void 0:t[0];r&&(r.size>5242880?(alert("文件大小不能超过5MB！"),e.target.value="",s(null)):s(r))},style:{marginRight:"10px",fontSize:"14px",padding:"6px",borderRadius:"5px",border:"1px solid #ccc"},title:"支持格式: ".concat(l.map(e=>"".concat(e)).join("/"))}),(0,o.jsx)("button",{onClick:c,style:{padding:"6px 10px",marginRight:"5px",borderRadius:"5px",border:"1px solid #ccc",background:i?"#ccc":"#004080",color:"white",fontSize:"14px",cursor:"pointer"},children:i?"文件处理":"上传文件"})]})},a=e=>{let{uploadedFiles:t,onFileSelect:r,refreshTrigger:s}=e,[i,a]=(0,n.useState)([]),[l,c]=(0,n.useState)(null);(0,n.useEffect)(()=>{(async()=>{try{let e=await fetch("https://chatbot-n.azurewebsites.net/get-filenames",{method:"GET",credentials:"include"});if(!e.ok)throw Error("Network response was not ok");let r=await e.json();t.length>0&&r.push(t[t.length-1]),a(r),t.length>0&&r.length>0&&c(r[r.length-1])}catch(e){console.error("Error:",e)}})()},[s]);let d=e=>{c(e),r(e)};return(0,o.jsxs)("div",{style:{width:"200px",borderRight:"1px solid #ccc",padding:"20px"},children:[(0,o.jsx)("h2",{style:{fontSize:"14px",marginBottom:"10px"},children:"已上传文件"}),(0,o.jsx)("ul",{style:{listStyle:"none",padding:10,border:"1px solid #ccc",borderRadius:"5px",backgroundColor:"#f9f9f9",marginBottom:"10px"},children:i.map((e,t)=>(0,o.jsx)("li",{style:{marginBottom:"5px",cursor:"pointer"},onClick:()=>d(e),children:(0,o.jsx)("span",{style:{backgroundColor:l===e?"#004080":"transparent",color:l===e?"white":"black",padding:"5px 10px",borderRadius:"5px",display:"inline-block",wordBreak:"break-word",fontSize:"13px"},children:e})},t))})]})};let l="https://chatbot-n.azurewebsites.net/";function c(){let[e,t]=(0,n.useState)([{type:"system",text:"请提问，根据文档问答请先选择文件并上传"}]),[r,c]=(0,n.useState)(""),[d,p]=(0,n.useState)(!1),u=(0,n.useRef)(null),[x,f]=(0,n.useState)([]),[h,g]=(0,n.useState)(null),[y,m]=(0,n.useState)(!1);(0,n.useEffect)(()=>{document.title="文档助手Chatbot"},[]);let b=()=>{var e;null===(e=u.current)||void 0===e||e.scrollIntoView({behavior:"smooth"})};(0,n.useEffect)(()=>{b()},[e]);let[w,j]=(0,n.useState)(""),[S,k]=(0,n.useState)({});(0,n.useEffect)(()=>{fetch(l+"prompts",{credentials:"include"}).then(e=>e.json()).then(e=>{k(e),e&&Object.keys(e).length>0&&j(Object.keys(e)[0])}).catch(e=>console.error("Error fetching prompts:",e))},[]);let v=async e=>{let t=new FormData;t.append("file",e);try{(await fetch(l+"upload",{method:"POST",body:t,credentials:"include"})).ok?(alert("文件上传成功！较长文档需等待系统处理10秒以上再检索。"),j("1"),f(t=>[...t,e.name]),g(e.name)):alert("文件上传失败！")}catch(e){console.error("上传错误:",e)}m(e=>!e)},_=async()=>{let e=Date.now();t(t=>[...t,{type:"user",text:r},{type:"system",text:"思考中......",id:e}]),p(!0);let o=async r=>{let o=new TextDecoder,n="";for(;;){let{value:s,done:i}=await r.read();if(i)break;let a=(n+=o.decode(s,{stream:!0})).split("\n");for(let r of a.slice(0,-1))if(r.startsWith("data: "))try{let o=r.replace("data: ",""),n=JSON.parse(o);t(t=>t.map(t=>t.id===e?{...t,text:n.data}:t))}catch(e){console.error("Error parsing message:",e)}n=a[a.length-1]}};try{let e=await fetch(l+"message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_input:r,prompt_template:w,selected_file:h}),credentials:"include"});if(!e.ok)throw Error("HTTP error! status: ".concat(e.status));if(e.body){let t=e.body.getReader();o(t)}else console.error("Response body is null")}catch(e){console.error("Error sending message:",e)}c(""),p(!1)};return(0,o.jsxs)("div",{style:{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center"},children:[(0,o.jsxs)("div",{style:{width:"80%",maxWidth:"600px"},children:[(0,o.jsx)(s,{messages:e,messagesEndRef:u})," ",(0,o.jsxs)("div",{style:{display:"flex",marginBottom:"20px",alignItems:"center"},children:[(0,o.jsx)("select",{style:{width:"175px"},value:w,onChange:e=>j(e.target.value),className:"custom-select",children:Object.entries(S).map((e,t)=>{let[r,n]=e;return(0,o.jsx)("option",{value:t,children:"string"==typeof n?n:String(n)},r)})}),(0,o.jsx)("textarea",{value:r,onChange:e=>c(e.target.value),style:{fontSize:"14px",flex:1,padding:"6px",paddingLeft:"10px",borderRadius:"5px",border:"1px solid #ccc",marginRight:"5px"},disabled:d,rows:3,placeholder:"在此输入..."}),(0,o.jsx)("button",{onClick:_,style:{padding:"5px",borderRadius:"5px",border:"1px solid #ccc",background:d?"#ccc":"#007bff",color:d?"#666":"white",width:"70px",marginRight:"5px",fontSize:"14px"},disabled:d,children:d?"已发送":"发送"})]}),(0,o.jsx)(i,{onUpload:v})," "]}),(0,o.jsx)(a,{uploadedFiles:x,onFileSelect:e=>{g(e),j("1")},refreshTrigger:y}),"    "]})}},1068:function(){},622:function(e,t,r){"use strict";var o=r(2265),n=Symbol.for("react.element"),s=(Symbol.for("react.fragment"),Object.prototype.hasOwnProperty),i=o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a={key:!0,ref:!0,__self:!0,__source:!0};function l(e,t,r){var o,l={},c=null,d=null;for(o in void 0!==r&&(c=""+r),void 0!==t.key&&(c=""+t.key),void 0!==t.ref&&(d=t.ref),t)s.call(t,o)&&!a.hasOwnProperty(o)&&(l[o]=t[o]);if(e&&e.defaultProps)for(o in t=e.defaultProps)void 0===l[o]&&(l[o]=t[o]);return{$$typeof:n,type:e,key:c,ref:d,props:l,_owner:i.current}}t.jsx=l,t.jsxs=l},7437:function(e,t,r){"use strict";e.exports=r(622)}},function(e){e.O(0,[428,971,938,744],function(){return e(e.s=8343)}),_N_E=e.O()}]);