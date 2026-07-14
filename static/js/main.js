/**
 * main.js - Logic chính của web
 */

// ============================================================
// STATE
// ============================================================

let worldState = null;
let isPaused = false;
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

// ============================================================
// WEBSOCKET
// ============================================================

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        reconnectAttempts = 0;
        document.getElementById('connection-status').textContent = '🟢 Online';
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (e) {
            console.error('WebSocket error:', e);
        }
    };
    
    ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        document.getElementById('connection-status').textContent = '🔴 Offline';
        
        // Reconnect
        if (reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            setTimeout(connectWebSocket, 3000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'npc_info') {
        showNpcInfo(data.data);
    } else {
        // World state update
        worldState = data;
        updateUI(worldState);
        renderer.render(worldState);
    }
}

// ============================================================
// UI UPDATE
// ============================================================

function updateUI(state) {
    if (!state) return;
    
    // Time
    const time = state.time || {};
    const timeStr = `${String(time.hours || 0).padStart(2, '0')}:00`;
    const dateStr = `Ngày ${(time.days || 0) + 1}/${(time.months || 0) + 1}/${(time.years || 0) + 1}`;
    document.getElementById('time-display').textContent = `${dateStr} - ${timeStr}`;
    
    // Weather
    const weather = state.weather || {};
    document.getElementById('weather-display').textContent = 
        `${weather.weather || '☀️'} ${weather.temperature || 25}°C`;
    
    // NPC count
    document.getElementById('npc-count').textContent = `👥 ${state.npc_count || 0}`;
    
    // Stats
    document.getElementById('stat-total').textContent = state.total_npc || 0;
    document.getElementById('stat-alive').textContent = state.npc_count || 0;
    
    // Profession stats
    if (state.npcs && state.npcs.length > 0) {
        const profs = {};
        const emotions = {};
        
        for (const npc of state.npcs) {
            if (npc.is_alive) {
                profs[npc.profession] = (profs[npc.profession] || 0) + 1;
                emotions[npc.emotion] = (emotions[npc.emotion] || 0) + 1;
            }
        }
        
        // Most common profession
        let maxProf = '';
        let maxCount = 0;
        for (const [prof, count] of Object.entries(profs)) {
            if (count > maxCount) {
                maxCount = count;
                maxProf = prof;
            }
        }
        document.getElementById('stat-prof').textContent = maxProf || '-';
        
        // Most common emotion
        let maxEmo = '';
        let maxEmoCount = 0;
        for (const [emo, count] of Object.entries(emotions)) {
            if (count > maxEmoCount) {
                maxEmoCount = count;
                maxEmo = emo;
            }
        }
        document.getElementById('stat-emotion').textContent = maxEmo || '-';
    }
    
    // NPC list
    updateNpcList(state.npcs || []);
}

function updateNpcList(npcs) {
    const list = document.getElementById('npc-list');
    list.innerHTML = '';
    
    const alive = npcs.filter(n => n.is_alive).slice(0, 20);
    
    for (const npc of alive) {
        const item = document.createElement('div');
        item.className = 'npc-item';
        item.innerHTML = `
            <span class="name">${npc.name}</span>
            <span class="status alive">${npc.emotion || 'Bình thường'}</span>
        `;
        item.onclick = () => requestNpcInfo(npc.id);
        list.appendChild(item);
    }
}

// ============================================================
// NPC INFO
// ============================================================

function requestNpcInfo(npcId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'click_npc',
            npc_id: npcId
        }));
    }
}

function showNpcInfo(npc) {
    const modal = document.getElementById('npc-modal');
    const info = document.getElementById('npc-info');
    
    let html = `
        <h2>${npc.name}</h2>
        <div class="field"><span class="label">Giới tính</span><span class="value">${npc.gender}</span></div>
        <div class="field"><span class="label">Tuổi</span><span class="value">${npc.age}</span></div>
        <div class="field"><span class="label">Nghề nghiệp</span><span class="value">${npc.profession}</span></div>
        <div class="field"><span class="label">Cảm xúc</span><span class="value">${npc.emotion}</span></div>
        <div class="field"><span class="label">Sức khỏe</span><span class="value">${npc.health}%</span></div>
        <div class="field"><span class="label">Năng lượng</span><span class="value">${npc.energy}%</span></div>
        <div class="field"><span class="label">Đói</span><span class="value">${npc.hunger}%</span></div>
        <div class="field"><span class="label">Khát</span><span class="value">${npc.thirst}%</span></div>
        <div class="field"><span class="label">Tiền</span><span class="value">${npc.money.toLocaleString()}đ</span></div>
        <div class="field"><span class="label">Hành động</span><span class="value">${npc.current_action || 'Đứng yên'}</span></div>
    `;
    
    // Memory
    if (npc.memory && npc.memory.recent && npc.memory.recent.length > 0) {
        html += `<div style="margin-top:12px;"><strong>📝 Ký ức gần đây:</strong>`;
        for (const mem of npc.memory.recent) {
            html += `<div style="font-size:12px;color:#8395a7;padding:2px 0;">• ${mem}</div>`;
        }
        html += `</div>`;
    }
    
    info.innerHTML = html;
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('npc-modal').classList.remove('show');
}

// Click outside modal to close
document.getElementById('npc-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

// ============================================================
// CONTROLS
// ============================================================

async function togglePause() {
    const state = isPaused ? 'resume' : 'pause';
    try {
        const response = await fetch(`/api/world/control/${state}`, { method: 'POST' });
        const result = await response.json();
        if (result.status === 'paused' || result.status === 'resumed') {
            isPaused = !isPaused;
            document.getElementById('controls').querySelector('button:first-child').textContent = 
                isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
        }
    } catch (e) {
        console.error('Control error:', e);
    }
}

async function setSpeed(speed) {
    try {
        const response = await fetch(`/api/world/control/speed?speed=${speed}`, { method: 'POST' });
        const result = await response.json();
        console.log(`Speed set to ${speed}x`);
    } catch (e) {
        console.error('Speed error:', e);
    }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'p') {
        e.preventDefault();
        togglePause();
    }
    if (e.key === '1') setSpeed(1);
    if (e.key === '2') setSpeed(2);
    if (e.key === '5') setSpeed(5);
    if (e.key === 'Escape') closeModal();
});

// ============================================================
// INIT
// ============================================================

console.log('🌍 Thế giới AI - Web Interface');
console.log('📌 Shortcuts: Space=Pause, 1=1x, 2=2x, 5=5x');

// Kết nối WebSocket
connectWebSocket();

// Click canvas để tạo NPC mới
document.getElementById('world-canvas').addEventListener('dblclick', async () => {
    try {
        const response = await fetch('/api/world/npc/create', { method: 'POST' });
        const result = await response.json();
        console.log('NPC created:', result);
    } catch (e) {
        console.error('Create NPC error:', e);
    }
});

console.log('✅ Web loaded!');
