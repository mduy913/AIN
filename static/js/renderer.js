/**
 * renderer.js - Vẽ thế giới lên Canvas
 */

class WorldRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
        
        // Zoom & Pan
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.setupControls();
    }
    
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    setupControls() {
        // Zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom = Math.max(0.1, Math.min(5, this.zoom + delta));
        });
        
        // Pan
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragOffsetX = this.offsetX;
            this.dragOffsetY = this.offsetY;
            this.canvas.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.offsetX = this.dragOffsetX + (e.clientX - this.dragStartX);
                this.offsetY = this.dragOffsetY + (e.clientY - this.dragStartY);
            }
        });
        
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        // Touch support
        let touchStartX = 0, touchStartY = 0;
        let touchOffsetX = 0, touchOffsetY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchOffsetX = this.offsetX;
            touchOffsetY = this.offsetY;
        }, { passive: true });
        
        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.offsetX = touchOffsetX + (touch.clientX - touchStartX);
            this.offsetY = touchOffsetY + (touch.clientY - touchStartY);
        }, { passive: true });
    }
    
    worldToScreen(wx, wy) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const sx = cx + (wx - this.offsetX) * this.zoom;
        const sy = cy + (wy - this.offsetY) * this.zoom;
        return { x: sx, y: sy };
    }
    
    screenToWorld(sx, sy) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const wx = this.offsetX + (sx - cx) / this.zoom;
        const wy = this.offsetY + (sy - cy) / this.zoom;
        return { x: wx, y: wy };
    }
    
    clear() {
        this.ctx.fillStyle = '#0d1421';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const step = 50;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        
        // Tính phạm vi grid
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.width, this.height);
        
        const startX = Math.floor(topLeft.x / step) * step;
        const startY = Math.floor(topLeft.y / step) * step;
        const endX = Math.ceil(bottomRight.x / step) * step;
        const endY = Math.ceil(bottomRight.y / step) * step;
        
        for (let x = startX; x <= endX; x += step) {
            const sp = this.worldToScreen(x, 0);
            ctx.beginPath();
            ctx.moveTo(sp.x, 0);
            ctx.lineTo(sp.x, this.height);
            ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += step) {
            const sp = this.worldToScreen(0, y);
            ctx.beginPath();
            ctx.moveTo(0, sp.y);
            ctx.lineTo(this.width, sp.y);
            ctx.stroke();
        }
    }
    
    drawNPC(npc) {
        const ctx = this.ctx;
        const pos = this.worldToScreen(npc.position[0], npc.position[1]);
        const size = 8 * this.zoom;
        
        // Bóng
        ctx.shadowColor = 'rgba(72, 219, 251, 0.2)';
        ctx.shadowBlur = 10;
        
        // Màu theo cảm xúc
        const colors = {
            'Vui vẻ': '#4ade80',
            'Bình thường': '#48dbfb',
            'Tức giận': '#ff6b6b',
            'Sợ hãi': '#facc15',
            'Mệt mỏi': '#8395a7',
            'Cô đơn': '#a29bfe',
            'Lo lắng': '#fd79a8',
            'Hào hứng': '#00d2d3',
            'Tò mò': '#0984e3',
            'Thư thái': '#00b894'
        };
        const color = colors[npc.emotion] || '#48dbfb';
        
        // Body
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Viền
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Tên
        if (this.zoom > 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = `${10 * this.zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(npc.name, pos.x, pos.y - size - 4);
        }
        
        // Trạng thái
        if (this.zoom > 0.8) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = `${8 * this.zoom}px Arial`;
            ctx.fillText(npc.current_action || '', pos.x, pos.y + size + 14);
        }
    }
    
    drawNPCs(npcs) {
        for (const npc of npcs) {
            if (npc.is_alive) {
                this.drawNPC(npc);
            }
        }
    }
    
    render(worldState) {
        this.clear();
        this.drawGrid();
        
        if (worldState && worldState.npcs) {
            this.drawNPCs(worldState.npcs);
        }
    }
}

// Khởi tạo renderer
const renderer = new WorldRenderer('world-canvas');
