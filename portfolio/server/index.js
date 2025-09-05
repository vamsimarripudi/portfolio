/* Simple Express server to accept contact form submissions and send email via nodemailer.
   Configure SMTP using environment variables (see .env.example).
*/
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const fs = require('fs')
let sendgrid
try{
  sendgrid = require('@sendgrid/mail')
}catch(err){
  // SendGrid not installed — server will fall back to SMTP or local storage
  sendgrid = null
}
const path = require('path')
const cookieParser = require('cookie-parser')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

// simple file logger
function logToFile(line){
  try{
    const ts = new Date().toISOString()
    fs.appendFileSync(path.join(__dirname,'server.log'), `[${ts}] ${line}\n`)
  }catch(e){
    console.error('Failed to write server.log', e)
  }
}

const PORT = process.env.PORT || 3001

function countWords(text){
  if(!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

app.post('/api/contact', async (req, res) => {
  try{
    const { name, email, siteType, budget, description } = req.body
    if(!name || !email) return res.status(400).json({ error: 'Name and email are required' })
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' })
    if(countWords(description) > 300) return res.status(400).json({ error: 'Description must be 300 words or fewer' })


  // Instead of sending an email, persist submissions to the JSON "database".
  const mailContent = `New inquiry from ${name} <${email}>\n\nType: ${siteType}\nBudget: ${budget}\n\nDescription:\n${description}`
  console.log('Saving submission to local database:\n', mailContent)
  logToFile(`Saved to DB from ${email} (${name})`)
  saveSubmission({ name, email, siteType, budget, description, via: 'db', ts: Date.now() })
  return res.status(201).json({ message: 'Submission saved' })

  }catch(err){
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// Serve static build if needed (optional)
app.use(express.static(path.join(__dirname, '..', 'dist')))

app.listen(PORT, ()=>{
  console.log('Server listening on port', PORT)
  // write startup info to server.log so we have a persistent record
  logToFile(`Server started on port ${PORT}`)
})

// simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', pid: process.pid, port: PORT })
})

// helper: save submission to file
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json')
function saveSubmission(obj){
  try{
    let list = []
    if(fs.existsSync(SUBMISSIONS_FILE)){
      const raw = fs.readFileSync(SUBMISSIONS_FILE,'utf8')
      list = JSON.parse(raw || '[]')
    }
    list.unshift(obj)
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(list.slice(0,100), null, 2))
  }catch(err){
    console.error('Failed to save submission', err)
  }
}

// Protected endpoint to read submissions: ?key=ADMIN_KEY
app.get('/api/submissions', (req, res)=>{
  // Accept either query key or cookie named 'admin_key'
  const key = req.query.key || (req.cookies && req.cookies.admin_key)
  if(!process.env.ADMIN_KEY || !key || key !== process.env.ADMIN_KEY) {
    logToFile(`Unauthorized /api/submissions access from ${req.ip} (has_key:${key? 'yes':'no'})`)
    return res.status(401).json({ error: 'Unauthorized' })
  }
  let list = []
  try{
    if(fs.existsSync(SUBMISSIONS_FILE)) list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE,'utf8') || '[]')
  }catch(err){
    console.error(err)
  }
  res.json({ submissions: list })
})
// Login endpoint: set HttpOnly cookie if key matches ADMIN_KEY
app.post('/login', (req, res) => {
  const key = req.body && req.body.key
  logToFile(`Login attempt from ${req.ip} (provided_key:${key ? '[present]' : '[missing]'})`)
  if(!process.env.ADMIN_KEY || !key || key !== process.env.ADMIN_KEY) {
    logToFile(`Login FAILED for ${req.ip}`)
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // set cookie for 7 days; HttpOnly for security
  res.cookie('admin_key', key, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'Lax', path: '/' })
  logToFile(`Login SUCCESS for ${req.ip}`)
  res.json({ message: 'ok' })
})

// Logout clears the cookie
app.post('/logout', (req, res) => {
  res.clearCookie('admin_key', { path: '/' })
  res.json({ message: 'ok' })
})

// Simple GET page to allow manual browser login testing
app.get('/login', (req, res) => {
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Login</title>
    <style>
      html,body{height:100%}
      body{margin:0;font-family:system-ui,Segoe UI,Roboto,Arial;background:#0b0c10}
      .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
      .modal{width:min(92vw, 380px);background:#111318;border:1px solid #242837;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:20px 20px 16px;color:#e8eaf0}
      .title{margin:0 0 12px 0;font-size:20px;font-weight:700;letter-spacing:.2px}
      .desc{margin:0 0 16px 0;color:#9aa0b4;font-size:13px}
      .row{display:flex;gap:8px}
      .input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid #2b3042;background:#0f1117;color:#e8eaf0;outline:none}
      .input:focus{border-color:#3a71ff;box-shadow:0 0 0 3px rgba(58,113,255,.15)}
      .btn{padding:10px 14px;border-radius:10px;border:0;background:#3a71ff;color:#fff;font-weight:600;cursor:pointer}
      .btn:disabled{opacity:.7;cursor:not-allowed}
      .msg{margin-top:10px;height:18px;color:#ff6b6b;font-size:13px}
      .footer{margin-top:12px;color:#7c8399;font-size:12px;text-align:center}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="sha512-ZQqU9uEw5bRk4oSxkq0m1M9k7kZ6q1v2D6q5i2v7oQ0g2S3bUu7q8mXlFJ8yXo5uIh3gU1mOq1R1O8E0m2m8xw==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  </head>
  <body>
    <div class="backdrop" id="backdrop" aria-modal="true" role="dialog">
      <div class="modal" id="modal">
        <h1 class="title">Admin Login</h1>
        <p class="desc">Enter your ADMIN_KEY to view submissions.</p>
        <form id="f" autocomplete="off">
          <div class="row">
            <input id="key" name="key" class="input" placeholder="ADMIN_KEY" aria-label="Admin key" />
            <button id="loginBtn" class="btn" type="submit">Login</button>
          </div>
          <div id="msg" class="msg"></div>
        </form>
        <div class="footer">Your key is stored in a secure HttpOnly cookie.</div>
      </div>
    </div>
    <script>
      const modal = document.getElementById('modal');
      const backdrop = document.getElementById('backdrop');
      const msgEl = document.getElementById('msg');
      const keyEl = document.getElementById('key');
      const btnEl = document.getElementById('loginBtn');

      // Entrance animation
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(modal, { opacity: 0, y: 12, scale: 0.96 });
      gsap.to(backdrop, { opacity: 1, duration: 0.25, ease: 'power1.out' });
      gsap.to(modal, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out', delay: 0.05 });

      function setBusy(b){ btnEl.disabled = b; keyEl.disabled = b; }

      document.getElementById('f').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const key = keyEl.value.trim();
        msgEl.textContent = '';
        if(!key){
          msgEl.textContent = 'Please enter your ADMIN_KEY';
          gsap.fromTo(modal, { x: -6 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.4)', keyframes:[{x:-8},{x:8},{x:-6},{x:6},{x:0}] });
          return;
        }
        try{
          setBusy(true);
          const r = await fetch('/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ key }), credentials: 'same-origin' });
          if(!r.ok){
            throw new Error('Unauthorized');
          }
          // Success: animate out then redirect
          await Promise.all([
            gsap.to(modal, { opacity: 0, y: -10, scale: 0.98, duration: 0.25, ease: 'power1.in' }).then(()=>{}),
            gsap.to(backdrop, { opacity: 0, duration: 0.25, ease: 'power1.in' }).then(()=>{})
          ]);
          location.href = '/responses';
        }catch(err){
          msgEl.textContent = 'Login failed. Check your ADMIN_KEY.';
          // Shake animation on error
          gsap.fromTo(modal, { x: -10 }, { x: 0, duration: 0.3, ease: 'power2.out', keyframes:[{x:-10},{x:10},{x:-8},{x:8},{x:-4},{x:4},{x:0}] });
        }finally{
          setBusy(false);
        }
      });

      // Focus input on open
      keyEl.focus();
    </script>
  </body>
  </html>`
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.send(html)
})

// Simple page to view responses (reads via the protected API)
app.get('/responses', (req, res) => {
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Submissions</title>
    <style>
      body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;background:#f7f7f9}
      .card{background:#fff;border:1px solid #e2e2e8;padding:16px;margin-bottom:12px;border-radius:8px}
      .meta{font-size:12px;color:#666;margin-bottom:8px}
      .desc{white-space:pre-wrap}
    </style>
  </head>
  <body>
    <h1>Saved Submissions</h1>
    <div id="list">Loading…</div>
    <script>
      // Use server-side HttpOnly cookie: call POST /login to set cookie
      async function load(){
        // build a tiny login UI
        const loginDiv = document.createElement('div')
        loginDiv.style.marginBottom = '12px'
        loginDiv.innerHTML = '<input id="keyInput" placeholder="ADMIN_KEY" style="padding:8px;margin-right:8px" /><button id="loginBtn">Login</button><button id="logoutBtn" style="margin-left:8px">Logout</button>'
        document.getElementById('list').appendChild(loginDiv)
        document.getElementById('loginBtn').addEventListener('click', async ()=>{
          const key = document.getElementById('keyInput').value
          if(!key) return alert('Enter key')
          try{
            const r = await fetch('/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ key }) })
            if(!r.ok) throw new Error('Unauthorized')
            // success: reload to fetch submissions using cookie
            location.reload()
          }catch(err){ alert('Login failed: '+err.message) }
        })
        document.getElementById('logoutBtn').addEventListener('click', async ()=>{
          try{ await fetch('/logout', { method: 'POST' }) }catch(e){}
          location.reload()
        })

        // now try to fetch submissions (cookie will be sent automatically)
        try{
          const r = await fetch('/api/submissions')
          if(r.status === 401) { document.getElementById('list').innerHTML = '<i>Unauthorized — please login above</i>'; return }
          if(!r.ok) throw new Error('Failed to load')
          const j = await r.json()
          const list = j.submissions || []
          if(list.length===0) { document.getElementById('list').innerHTML = '<i>No submissions</i>'; return }
          // render results
          document.getElementById('list').innerHTML = ''
          const ctrl2 = document.createElement('div')
          ctrl2.style.marginBottom = '12px'
          ctrl2.innerHTML = '<button id="logout2">Logout</button>'
          document.getElementById('list').appendChild(ctrl2)
          document.getElementById('logout2').addEventListener('click', async ()=>{ try{ await fetch('/logout',{ method:'POST' }) }catch(e){}; location.reload() })
          list.forEach(s => {
            const div = document.createElement('div')
            div.className = 'card'
            const meta = new Date(s.ts).toLocaleString() + ' — ' + s.name + ' <' + s.email + '> — ' + s.siteType + ' — $' + s.budget
            const desc = (s.description||'').replace(/</g,'&lt;')
            div.innerHTML = '<div class="meta">' + meta + '</div><div class="desc">' + desc + '</div>'
            document.getElementById('list').appendChild(div)
          })
        }catch(err){ document.getElementById('list').innerText = 'Failed to load: '+err.message }
      }
      load()
    </script>
  </body>
  </html>`
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.send(html)
})
