const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = process.env.GITHUB_TOKEN;
const REPO  = process.env.REPO || 'perickko-source/oeste-api';
const FILE  = 'records.json';

let records = [];
let saveTimer = null;

async function loadFromGitHub(){
  try{
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers:{ Authorization:`Bearer ${TOKEN}`, 'User-Agent':'oeste-api' }
    });
    if(r.ok){
      const j = await r.json();
      records = JSON.parse(Buffer.from(j.content,'base64').toString('utf8'));
    }
  }catch(e){ console.log('load fail:', e.message); }
}

function saveToGitHub(){
  if(saveTimer) return;
  saveTimer = setTimeout(async ()=>{
    saveTimer = null;
    try{
      let sha;
      const g = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        headers:{ Authorization:`Bearer ${TOKEN}`, 'User-Agent':'oeste-api' }
      });
      if(g.ok) sha = (await g.json()).sha;
      await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        method:'PUT',
        headers:{ Authorization:`Bearer ${TOKEN}`, 'User-Agent':'oeste-api', 'Content-Type':'application/json' },
        body: JSON.stringify({
          message:'record '+new Date().toISOString(),
          content: Buffer.from(JSON.stringify(records)).toString('base64'),
          ...(sha ? {sha} : {})
        })
      });
    }catch(e){ console.log('save fail:', e.message); }
  }, 5000);
}

app.get('/api/top', (req,res)=>{
  res.json([...records].sort((a,b)=>b.score-a.score).slice(0,10));
});

app.post('/api/record', (req,res)=>{
  const name  = String(req.body.name||'Anónimo').slice(0,14);
  const score = parseInt(req.body.score)||0;
  if(score>0){
    records.push({name, score, fecha:new Date().toISOString()});
    records = records.sort((a,b)=>b.score-a.score).slice(0,50);
    saveToGitHub();
  }
  res.json({ok:true});
});

app.get('/api/ping', (req,res)=>res.json({ok:true}));

const PORT = process.env.PORT || 10000;
loadFromGitHub().then(()=> app.listen(PORT, ()=>console.log('oeste-api listo')));