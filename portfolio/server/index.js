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

// Serve /server/index.css with correct MIME type
app.get('/server/index.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'index.css'));
});

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
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login</title></head>
  <body style="font-family:system-ui,Arial;margin:24px">
    <h1>Admin Login</h1>
    <form id="f">
      <input id="key" name="key" placeholder="ADMIN_KEY" style="padding:8px;width:320px" />
      <button type="submit" style="padding:8px 12px;margin-left:8px">Login</button>
    </form>
    <div id="msg" style="margin-top:12px;color:#a00"></div>
    <script>
      document.getElementById('f').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const key = document.getElementById('key').value;
        try{
          const r = await fetch('/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ key }), credentials: 'same-origin' });
          if(!r.ok) throw new Error('Login failed');
          // on success, go to responses
          location.href = '/responses';
        }catch(err){ document.getElementById('msg').innerText = err.message }
      })
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
  <link rel="stylesheet" href="/server/index.css" />
  </head>
  <body>
    <h1>Saved Submissions</h1>
    <div id="list"><div id="spinner" class="spinner"></div></div>
    <div class="submissions-container" id="submissions"></div>
    <script>
      async function load(){
        document.getElementById('spinner').style.display = 'block';
        let authorized = false;
        let submissions = [];
        try{
          const r = await fetch('/api/submissions');
          if(r.status === 401) {
            authorized = false;
          } else if(r.ok) {
            authorized = true;
            const j = await r.json();
            submissions = j.submissions || [];
          }
        }catch(e){ authorized = false; }
        document.getElementById('spinner').style.display = 'none';

        if(!authorized){
          const loginDiv = document.createElement('div');
          loginDiv.style.marginBottom = '12px';
          loginDiv.innerHTML = '<input id="keyInput" placeholder="ADMIN_KEY" style="padding:8px;margin-right:8px" /><button id="loginBtn" class="button">Login</button>';
          document.getElementById('list').appendChild(loginDiv);
          document.getElementById('loginBtn').addEventListener('click', async ()=>{
            const key = document.getElementById('keyInput').value;
            if(!key) return alert('Enter key');
            try{
              const r = await fetch('/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ key }) });
              if(!r.ok) throw new Error('Unauthorized');
              location.reload();
            }catch(err){ alert('Login failed: '+err.message); }
          });
        }else{
          document.getElementById('list').innerHTML = '';
          const ctrl2 = document.createElement('div');
          ctrl2.style.marginBottom = '12px';
          ctrl2.innerHTML = '<button id="logout2" class="logout-button">Logout</button>';
          document.getElementById('list').appendChild(ctrl2);
          document.getElementById('logout2').addEventListener('click', async ()=>{ try{ await fetch('/logout',{ method:'POST' }) }catch(e){}; location.reload(); });
          const submissionsContainer = document.getElementById('submissions');
          submissionsContainer.innerHTML = '';
          if(submissions.length===0){
            submissionsContainer.innerHTML = '<i>No submissions</i>';
            return;
          }
          submissions.forEach(s => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML =
              '<h3 class="card-title">Submission</h3>' +
              '<div class="card-row"><span class="card-label">👤 Name:</span> ' + s.name + '</div>' +
              '<div class="card-row"><span class="card-label">✉️ Email:</span> ' + s.email + '</div>' +
              '<div class="card-row"><span class="card-label">🌐 Type:</span> ' + s.siteType + '</div>' +
              '<div class="card-row"><span class="card-label">💰 Budget:</span> $' + s.budget + '</div>' +
              '<div class="card-row"><span class="card-label">📝 Description:</span> <span class="card-desc">' + (s.description||'').replace(/</g,'&lt;') + '</span></div>' +
              '<div class="card-meta"><span class="card-label">⏰ Submitted:</span> ' + new Date(s.ts).toLocaleString() + '</div>';
            submissionsContainer.appendChild(div);
          });
        }
      }
      load();
    </script>
  </body>
  </html>`
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.send(html)
})
