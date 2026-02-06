/* ================= 1. DATABASE INITIALIZATION ================= */
const db = {
    users: JSON.parse(localStorage.getItem('ag_users')) || [],
    bookings: JSON.parse(localStorage.getItem('ag_bookings')) || [],
    // 12 Rooms: Floor 1 (101-106), Floor 2 (201-206)
    rooms: JSON.parse(localStorage.getItem('ag_rooms')) || Array.from({length: 12}, (_, i) => ({
        id: i < 6 ? 101+i : 201+(i-6), 
        status: 'vacant'
    })),
    feedback: JSON.parse(localStorage.getItem('ag_feedback')) || [], 
    active: null,
    save() {
        localStorage.setItem('ag_users', JSON.stringify(this.users));
        localStorage.setItem('ag_bookings', JSON.stringify(this.bookings));
        localStorage.setItem('ag_rooms', JSON.stringify(this.rooms));
        localStorage.setItem('ag_feedback', JSON.stringify(this.feedback));
    }
};

/* ================= 2. AUTHENTICATION (US002/US003) ================= */
function login() {
    const id = document.getElementById('lUser').value.trim();
    const p = document.getElementById('lPass').value.trim();

    if (!id || !p) return alert("Please enter credentials.");

    // Admin Access
    if(id === 'admin' && p === 'Admin@123') {
        db.active = {name:'Administrator', role:'admin', uid:'ADMIN'};
        startApp();
    } else {
        // Guest Access
        const u = db.users.find(x => (x.uid === id || x.user === id || x.name === id) && x.pass === p);
        if(u) {
            db.active = u;
            startApp();
        } else {
            alert("Invalid Credentials. Please check ID and Password.");
        }
    }
}

function startApp() {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    
    document.getElementById("userName").innerText = db.active.name;
    document.getElementById("userDisplay").innerText = "MEMBER ID: " + db.active.uid;
    
    renderNav();
    renderTiles();
    renderExp();
    setupDates();
    showPage('home');
}

/* ================= 3. DYNAMIC NAVIGATION & TILES ================= */
function renderNav() {
    let html = `<a onclick="showPage('home')">Home</a>
                <a onclick="showPage('res')">Reservation</a>
                <a onclick="showPage('status')">Room Status</a>
                <a onclick="showPage('bill')">Billing</a>
                <a onclick="showPage('concierge')">Concierge</a>`; 
    
    if(db.active.role === 'admin') {
        html += `<a onclick="showPage('admin-queue')" style="color:var(--accent)">Approvals</a>`;
    }
    html += `<a onclick="location.reload()" style="color:red">Logout</a>`;
    document.getElementById('mainNav').innerHTML = html;
}

function renderTiles() {
    const area = document.getElementById('dashboardTiles');
    if(db.active.role === 'admin') {
        area.innerHTML = `
            <div class="tile" onclick="showPage('admin-queue')"><i class="fas fa-tasks"></i><h3>Approvals</h3><p>Manage Queue</p></div>
            <div class="tile" onclick="showPage('status')"><i class="fas fa-door-open"></i><h3>Inventory</h3><p>Rooms Status</p></div>
            <div class="tile" onclick="showPage('concierge')"><i class="fas fa-comments"></i><h3>Complaints</h3><p>Guest Messages</p></div>`;
    } else {
        area.innerHTML = `
            <div class="tile" onclick="showPage('res')"><i class="fas fa-bed"></i><h3>Reserve Suite</h3><p>Luxury Stay</p></div>
            <div class="tile" onclick="showPage('status')"><i class="fas fa-map"></i><h3>Floor Map</h3><p>Live Inventory</p></div>
            <div class="tile" onclick="showPage('bill')"><i class="fas fa-receipt"></i><h3>My Bill</h3><p>Payments</p></div>`;
    }
}

/* ================= 4. ROUTING LOGIC (ID SYNC) ================= */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    
    // Exact mapping to your HTML IDs
    const target = document.getElementById("p-" + id);
    if(target) target.classList.remove("hidden");

    if(id === 'status') renderRooms();
    if(id === 'bill') renderBilling();
    if(id === 'admin-queue') renderAdminQueue();
    if(id === 'admin-history') renderHistory();
    if(id === 'concierge') renderConcierge();
}

/* ================= 5. ADMIN APPROVAL QUEUE (FIXED) ================= */
function renderAdminQueue() {
    const area = document.getElementById('queue-list'); // Matching your index.html
    if(!area) return;

    const pending = db.bookings.filter(b => b.status === 'pending');
    
    area.innerHTML = pending.length ? pending.map(b => `
        <div class="glass-card" style="margin-bottom:15px; text-align:left; max-width:100%">
            <p><strong>Member:</strong> ${b.guest} (${b.uid})</p>
            <p><strong>Suite:</strong> $${b.price} | Date: ${b.cin}</p>
            <div style="display:flex; gap:10px; margin-top:10px">
                <button class="btn btn-gold" style="width:120px; padding:10px" onclick="approveStay('${b.id}')">Approve</button>
                <button class="btn btn-outline" style="width:120px; padding:10px; margin-top:0" onclick="rejectStay('${b.id}')">Reject</button>
            </div>
        </div>`).join('') : "<div class='glass-card'><p style='opacity:0.6'>Queue is clear.</p></div>";
}

function approveStay(bid) {
    const b = db.bookings.find(x => x.id === bid);
    const vacantRoom = db.rooms.find(r => r.status === 'vacant');
    
    if(!vacantRoom) return alert("Hotel is full! No rooms left.");
    
    b.status = 'approved';
    b.roomNo = vacantRoom.id;
    vacantRoom.status = 'booked';
    db.save();
    renderAdminQueue();
    alert(`Approved! Suite ${vacantRoom.id} assigned.`);
}

function rejectStay(bid) {
    db.bookings = db.bookings.filter(x => x.id !== bid);
    db.save();
    renderAdminQueue();
}

/* ================= 6. BILLING SYSTEM (US014) ================= */
function renderBilling() {
    const b = db.bookings.find(x => (x.uid === db.active.uid || x.guest === db.active.name) && x.status === 'approved');
    const paid = db.bookings.find(x => (x.uid === db.active.uid || x.guest === db.active.name) && x.status === 'paid');
    const area = document.getElementById('billing-content');
    if(!area) return;

    if(paid) {
        area.innerHTML = `<div class="glass-card" style="background:#fff; color:#333; text-align:left;">
            <h2 style="color:#2ecc71">Statement: RCP-${paid.id}</h2>
            <hr style="opacity:0.1; margin:15px 0">
            <p><strong>Room:</strong> Suite ${paid.roomNo}</p>
            <p><strong>Total Paid:</strong> $${paid.price}</p>
            <button class="btn btn-gold" style="margin-top:20px" onclick="window.print()">Print Invoice</button>
        </div>`;
    } else if(b) {
        area.innerHTML = `<div class="glass-card" style="max-width:550px; text-align:left;">
            <h3 style="color:var(--accent)">Approved Stay - Fee: $${b.price}</h3>
            <p style="font-size:11px; margin-bottom:15px; opacity:0.6">Room Assigned: ${b.roomNo}</p>
            <div class="form-grid" style="margin-top:20px">
                <div class="form-group full-width"><label>Account Holder</label><input type="text" id="pName" placeholder="Min 10 characters"></div>
                <div class="form-group"><label>Card Number (16 Digits)</label><input type="text" id="pCard" maxlength="16"></div>
                <div class="form-group"><label>CVV (3 Digits)</label><input type="password" id="pCvv" maxlength="3"></div>
            </div>
            <button class="btn btn-gold" onclick="payStay('${b.id}')">Submit Secure Payment</button>
        </div>`;
    } else {
        area.innerHTML = `<div class="glass-card"><p style="opacity:0.6">No pending bills found.</p></div>`;
    }
}

function payStay(bid) {
    const n = document.getElementById('pName').value, c = document.getElementById('pCard').value, v = document.getElementById('pCvv').value;
    if(n.length < 10 || c.length !== 16 || v.length !== 3) return alert("Validation Failed (Name 10+, Card 16, CVV 3)");
    
    const b = db.bookings.find(x => x.id === bid);
    b.status = 'paid';
    db.save();
    alert("Payment Successful!");
    renderBilling();
}

/* ================= 7. CONCIERGE (US016) ================= */
function renderConcierge() {
    const area = document.getElementById('concierge-content');
    if(!area) return;

    if(db.active.role === 'admin') {
        area.innerHTML = db.feedback.length ? db.feedback.map(f => `
            <div class="glass-card" style="margin-bottom:10px; text-align:left; max-width:100%"><p><strong>${f.user}:</strong> ${f.msg}</p></div>`).join('') : "<p>No messages.</p>";
    } else {
        area.innerHTML = `
            <div class="glass-card" style="max-width:550px; text-align:left; margin-bottom:20px">
                <h3 style="color:var(--accent)">Luxury Support Desk</h3>
                <p style="font-size:13px; margin:10px 0">ðŸ“ž Phone: +1 800-AURELION</p>
                <p style="font-size:13px; margin:10px 0">ðŸ“§ Email: support@aureliongrand.com</p>
            </div>
            <div class="glass-card" style="max-width:550px; text-align:left;">
                <h3 style="color:var(--accent); margin-bottom:15px;">Send us a message</h3>
                <div class="form-group"><label>Message</label>
                <textarea id="fMsg" rows="4" style="width:100%; background:rgba(255,255,255,0.05); color:white; border-radius:10px; padding:10px; border:1px solid rgba(255,255,255,0.1); outline:none;"></textarea></div>
                <button class="btn btn-gold" onclick="sendF()">Submit</button>
            </div>`;
    }
}
function sendF() { 
    const msg = document.getElementById('fMsg').value;
    if(!msg) return;
    db.feedback.push({user: db.active.name, msg: msg}); 
    db.save(); alert("Concierge notified!"); showPage('home'); 
}

/* ================= 8. ROOM STATUS & RESERVATION ================= */
function renderRooms() {
    document.getElementById('roomContainer').innerHTML = db.rooms.map(r => `
        <div class="room-box ${r.status === 'booked' ? 'booked' : 'vacant'}">
            ${r.id}<br><small>${r.status.toUpperCase()}</small>
        </div>`).join('');
}

function submitBooking() {
    const cin = document.getElementById('cin').value;
    if(!cin) return alert("Select stay dates.");
    db.bookings.push({ 
        id: "BK"+Math.floor(Math.random()*9000), 
        guest: db.active.name, uid: db.active.uid, 
        price: document.getElementById('suitePrice').value, 
        status: 'pending', cin: cin 
    });
    db.save(); alert("Stay requested! Waiting for Approval."); showPage('home');
}

/* ================= ðŸ’  UTILS & EXPERIENCES ================= */
const experiences = [
    {id:'d', title:'Fine Dining', img:'https://t4.ftcdn.net/jpg/06/38/59/93/240_F_638599315_VshacCTGKadE4Ra5skcmKtGlhJOg9QvS.jpg', points:['Michelin Star','Vintage Wine']},
    {id:'p', title:'Infinity Pool', img:'https://t4.ftcdn.net/jpg/08/99/06/37/240_F_899063726_T4aVvGldrqI36v9a5IwQfOKmmLFfrL3v.jpg', points:['Skyline View','Sunset Cocktails']},
    {id:'s', title:'Luxury Spa', img:'https://static.wixstatic.com/media/48e637_0c24c903633e434e9dd9726d85485654~mv2.jpg', points:['Ancient Healing','Essential Oils']},
    {id:'g', title:'Fitness Gym', img:'https://thumbs.dreamstime.com/b/luxury-hotel-gym-city-view-treadmills-cardio-equipment-weights-elliptical-machines-modern-interior-natural-light-panoramic-412788987.jpg', points:['High-End Gear','Private Coach']},
    {id:'l', title:'Lounge & Bar', img:'https://img.freepik.com/free-photo/luxurious-hotel-bar-lounge_23-2151933842.jpg', points:['Artisanal Cocktails','Jazz Night']},
    {id:'c', title:'Concierge', img:'https://t3.ftcdn.net/jpg/07/64/24/32/360_F_764243293_f6TxCProPiXzLWSIwIshQ9p3YE33usxG.jpg', points:['24/7 Care','Local Tours']}
];

function renderExp() {
    document.getElementById('expGrid').innerHTML = experiences.map(e => `
        <div class="exp-card" onclick="openExp('${e.id}')">
            <img src="${e.img}"><div class="exp-overlay">${e.title}</div>
        </div>`).join('');
}

function openExp(id) {
    const e = experiences.find(x => x.id === id);
    document.getElementById('modal-body').innerHTML = `
        <span onclick="closeModal()" style="position:absolute; right:20px; top:10px; font-size:30px; cursor:pointer; color:var(--accent); z-index:10;">&times;</span>
        <img src="${e.img}" style="width:100%; border-radius:15px; margin-bottom:20px;">
        <h2 style="font-family:'Playfair Display'">${e.title}</h2>
        <ul style="list-style:none; margin:15px 0">${e.points.map(p => `<li>âœ¦ ${p}</li>`).join('')}</ul>
        <button class="btn btn-gold" onclick="closeModal(); showPage('res')">Reserve Now</button>`;
    document.getElementById('exp-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('exp-modal').classList.add('hidden'); }
function setupDates() { if(document.getElementById('cin')) document.getElementById('cin').min = new Date().toISOString().split("T")[0]; }
function limitCout() { document.getElementById('cout').min = document.getElementById('cin').value; }

function showAuth(id) {
    document.getElementById('login-card').classList.add('hidden');
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('success-card').classList.add('hidden');
    document.getElementById(id + '-card').classList.remove('hidden');
}

function register() {
    const n = document.getElementById('rName').value, p = document.getElementById('rPass').value, c = document.getElementById('rConf').value, u = document.getElementById('rUser').value;
    if(p !== c) return alert("Mismatch");
    const uid = "AG-" + Math.floor(Math.random()*90000+10000);
    db.users.push({name:n, user:u, pass:p, uid: uid, role:'guest'});
    db.save(); document.getElementById('newUid').innerText = uid; showAuth('success');
}

function renderHistory() {
    const paid = db.bookings.filter(b => b.status === 'paid');
    document.getElementById('history-table').innerHTML = `<tr><th>Guest</th><th>Suite</th><th>Paid</th></tr>` + paid.map(p => `<tr><td>${p.guest}</td><td>${p.roomNo}</td><td>$${p.price}</td></tr>`).join('');
}

window.onload = () => showAuth('login');
