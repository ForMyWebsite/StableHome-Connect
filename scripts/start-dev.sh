#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if node -e 'fetch("http://localhost:3000/api/health").then(r=>r.json()).then(d=>process.exit(d.app==="stablehome-connect"?0:1)).catch(()=>process.exit(1))'; then
  echo 'StableHome Connect is already running on port 3000.'
  exit 0
fi
nohup npm run dev > /tmp/stablehome-connect-dev.log 2>&1 < /dev/null &
echo "$!" > /tmp/stablehome-connect-dev.pid
node --input-type=module <<'JS'
for(let attempt=0;attempt<30;attempt++){
 try{const r=await fetch('http://localhost:3000/api/health');if(r.ok&&(await r.json()).app==='stablehome-connect'){console.log('StableHome Connect is ready on forwarded port 3000.');process.exit(0);}}catch{}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
console.error('Startup did not become ready. Inspect /tmp/stablehome-connect-dev.log.');process.exit(1);
JS
