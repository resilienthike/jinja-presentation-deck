// Presentation Navigation Script

document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slideCounter = document.getElementById('slideCounter');

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Initialize - show only first slide
    function showSlide(index) {
        slides.forEach((slide, i) => {
            if (i === index) {
                slide.style.display = 'block';
                // If this is the GNN slide, resize canvas
                if (slide.id === 'gnn-slide' && window.gnnViz) {
                    window.gnnViz.resize();
                    window.gnnViz.startLoop();
                }
                slide.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                slide.style.display = 'none';
            }
        });

        // Update counter
        if (slideCounter) slideCounter.textContent = `${index + 1} / ${totalSlides}`;

        // Update button states
        if (prevBtn) {
            prevBtn.disabled = index === 0;
            if (index === 0) {
                prevBtn.style.opacity = '0.5';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                prevBtn.style.opacity = '1';
                prevBtn.style.cursor = 'pointer';
            }
        }

        if (nextBtn) {
            nextBtn.disabled = index === totalSlides - 1;
            if (index === totalSlides - 1) {
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }
    }

    // Navigation handlers
    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            showSlide(currentSlide);
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    }

    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'Home') {
            e.preventDefault();
            currentSlide = 0;
            showSlide(currentSlide);
        } else if (e.key === 'End') {
            e.preventDefault();
            currentSlide = totalSlides - 1;
            showSlide(currentSlide);
        }
    });

    // Initialize presentation
    showSlide(currentSlide);

    // Initialize GNN Visualization
    window.gnnViz = new GNNVisualizer();
});

// --- GNN Visualization Class ---
class GNNVisualizer {
    constructor() {
        this.canvas = document.getElementById('gnn-canvas');
        this.container = document.getElementById('gnn-container');
        this.logsDiv = document.getElementById('gnn-logs');
        
        if (!this.canvas || !this.container) return;

        this.ctx = this.canvas.getContext('2d');
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        this.nodes = [];
        this.edges = [];
        this.commuters = [];
        this.logs = ['> System Ready.'];
        
        this.layoutMode = 'GNN'; // 'GNN' or 'NN'
        this.isPlaying = false;
        this.animationId = null;

        // Config
        this.colors = {
            background: '#0f1115',
            node: '#333333',
            nodeActive: '#ffffff',
            edge: '#2a2a2a',
            commuter: '#00ff9d',
            accent: '#0ea5e9'
        };

        // Bind controls
        document.getElementById('gnn-toggle-layout')?.addEventListener('click', () => this.toggleLayout());
        document.getElementById('gnn-run')?.addEventListener('click', () => this.runSignal());
        document.getElementById('gnn-reset')?.addEventListener('click', () => this.reset());

        // Initial Setup
        this.resize();
        this.initGraph();
        this.startLoop();
        
        // Resize observer
        new ResizeObserver(() => this.resize()).observe(this.container);
    }

    log(msg) {
        this.logs.unshift(msg);
        if (this.logs.length > 5) this.logs.pop();
        if (this.logsDiv) {
            this.logsDiv.innerHTML = this.logs.map((l, i) => 
                `<div style="${i === 0 ? 'color: #00ff9d' : ''}">${l}</div>`
            ).join('');
        }
    }

    resize() {
        if (!this.container) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.initGraph(); // Re-init graph on resize to fit
    }

    initGraph() {
        this.nodes = [];
        this.edges = [];
        const layers = 4;
        const nodesPerLayer = [5, 7, 7, 4];
        let idCounter = 0;

        // Generate Nodes
        nodesPerLayer.forEach((count, layerIdx) => {
            for (let i = 0; i < count; i++) {
                let x, y;
                if (this.layoutMode === 'NN') {
                    // Grid
                    const xStep = this.width / (layers + 1);
                    const yStep = this.height / (count + 1);
                    x = xStep * (layerIdx + 1);
                    y = yStep * (i + 1);
                } else {
                    // Organic
                    const xStep = this.width / (layers + 1);
                    const xNoise = (Math.random() - 0.5) * (this.width * 0.2);
                    const yNoise = (Math.random() - 0.5) * (this.height * 0.6);
                    x = (xStep * (layerIdx + 1)) + xNoise;
                    y = (this.height / 2) + yNoise;
                    
                    // Clamp
                    x = Math.max(50, Math.min(this.width - 50, x));
                    y = Math.max(50, Math.min(this.height - 50, y));
                }

                this.nodes.push({
                    id: idCounter++,
                    x, y,
                    layer: layerIdx,
                    active: 0,
                    radius: this.layoutMode === 'NN' ? 8 : 6 + Math.random() * 6
                });
            }
        });

        // Generate Edges
        this.nodes.forEach(source => {
            this.nodes.forEach(target => {
                let shouldConnect = false;
                if (this.layoutMode === 'NN') {
                    if (source.layer === target.layer - 1 && Math.random() > 0.2) shouldConnect = true;
                } else {
                    const dist = Math.hypot(source.x - target.x, source.y - target.y);
                    const isForward = target.layer > source.layer;
                    if (dist < 200 && isForward && Math.random() > 0.4) shouldConnect = true;
                    if (isForward && Math.random() > 0.95) shouldConnect = true; // Long range
                }

                if (shouldConnect) {
                    this.edges.push({ source: source.id, target: target.id });
                }
            });
        });
    }

    toggleLayout() {
        this.layoutMode = this.layoutMode === 'NN' ? 'GNN' : 'NN';
        this.log(`> Switched to ${this.layoutMode} Mode`);
        this.initGraph();
    }

    runSignal() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.log('> Executing Message Passing...');
        
        // Create commuters
        this.edges.forEach(edge => {
            const s = this.nodes.find(n => n.id === edge.source);
            const t = this.nodes.find(n => n.id === edge.target);
            if (s && t) {
                this.commuters.push({
                    x: s.x, y: s.y,
                    targetId: t.id,
                    startX: s.x, startY: s.y,
                    targetX: t.x, targetY: t.y,
                    progress: 0,
                    speed: 0.01 + Math.random() * 0.02
                });
            }
        });
    }

    reset() {
        this.isPlaying = false;
        this.commuters = [];
        this.nodes.forEach(n => n.active = 0);
        this.log('> System Reset.');
    }

    startLoop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        const loop = () => {
            this.draw();
            this.update();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    update() {
        if (!this.isPlaying) return;

        for (let i = this.commuters.length - 1; i >= 0; i--) {
            const c = this.commuters[i];
            c.progress += c.speed;
            
            c.x = c.startX + (c.targetX - c.startX) * c.progress;
            c.y = c.startY + (c.targetY - c.startY) * c.progress;

            if (c.progress >= 1) {
                this.commuters.splice(i, 1);
                const node = this.nodes.find(n => n.id === c.targetId);
                if (node) {
                    node.active = 1.0; // Flash
                }
            }
        }
        
        // Stop if empty
        if (this.commuters.length === 0 && this.isPlaying) {
            // Optional: this.isPlaying = false;
        }
    }

    draw() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Edges
        this.ctx.lineWidth = this.layoutMode === 'NN' ? 0.5 : 1;
        this.edges.forEach(edge => {
            const s = this.nodes.find(n => n.id === edge.source);
            const t = this.nodes.find(n => n.id === edge.target);
            if (!s || !t) return;

            const grad = this.ctx.createLinearGradient(s.x, s.y, t.x, t.y);
            grad.addColorStop(0, 'rgba(255,255,255,0.05)');
            grad.addColorStop(1, 'rgba(255,255,255,0.05)');
            this.ctx.strokeStyle = grad;
            this.ctx.beginPath();
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(t.x, t.y);
            this.ctx.stroke();
        });

        // Draw Commuters
        this.ctx.fillStyle = this.colors.commuter;
        this.ctx.shadowColor = this.colors.commuter;
        this.ctx.shadowBlur = 10;
        this.commuters.forEach(c => {
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;

        // Draw Nodes
        this.nodes.forEach(node => {
            if (node.active > 0) {
                this.ctx.shadowColor = this.colors.accent;
                this.ctx.shadowBlur = node.active * 20;
                node.active *= 0.95; // Decay
            } else {
                this.ctx.shadowBlur = 0;
            }

            this.ctx.fillStyle = node.active > 0.1 ? this.colors.nodeActive : this.colors.node;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            this.ctx.stroke();
        });
    }
}
