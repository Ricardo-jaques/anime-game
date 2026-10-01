let vs = document.getElementById("vs");
let btnCPU = document.getElementById("btnCPU");
let selecao = document.getElementById("selecao");
let jogador = null;
let inimigo = null;
let nometela = document.getElementById("texto");
let arena = document.getElementById("arena");
let imgJogador = document.getElementById("imgJogador");
let imgCPU = document.getElementById("imgCPU");
let turno = "jogador";
let bolinhasRestantes = 0;
let tempoMinigame;
let jogoFinalizado = false;

/* --- CONTROLE DA EXPANSÃO E MINIGAME --- */
let donoDominio = null;
let intervaloEfeitoCortes = null;
let qteRodando = false;
let acertosMecanica = 0;
let notasAtivas = [];
let dominioRodadasRestantes = 0;
let danoExtraPorRodada = 0;
let modoMeguna = null; // "mahoraga" ou "adaptacao"
let intervaloMahoraga = null;
let adaptacaoInfo = {
    usoMesmoAtaque: {},
    nivel: 0 // 0, 25, 50
};

/* --- CONTROLE DO MEGUNA DA CPU (Mahoraga / Adaptação) --- */
let modoMegunaCPU = null;
let adaptacaoInfoCPU = {
    usoMesmoAtaque: {},
    nivel: 0
};

const teclasValidas = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
const iconesTeclas  = { ArrowRight:'➡️', ArrowUp:'⬆️', ArrowDown:'⬇️', ArrowLeft:'⬅️' };
const colunaTeclas  = { ArrowRight:'307px', ArrowUp:'117px', ArrowDown:'212px', ArrowLeft:'22px' };

/* --- AJUSTE FINO DE POSIÇÃO POR FORMA ---
   Algumas imagens têm "espaço vazio" (padding transparente) diferente ao redor
   do personagem. Isso faz com que o centro calculado pelo getBoundingClientRect
   não bata com o centro visual do personagem, e os efeitos (raio, agito, etc.)
   parecem "fora do lugar" quando o personagem muda de forma.
   Ajuste os valores de x/y (em pixels) aqui se algum efeito ainda estiver deslocado. */
const ajustesPosicaoForma = {
    sukuna: {
        base:   { x: 0,  y: 0 },
        meguna: { x: 0,  y: 0 },
        heian:  { x: 0,  y: 0 }
    }
};


/* --- CANVAS VFX SYSTEM & PARTICLE ENGINE --- */
class VFXParticle {
    constructor(x, y, vx, vy, color, size, life, gravity = 0, fade = true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.gravity = gravity;
        this.fade = fade;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
    }
    draw(ctx) {
        let alpha = this.fade ? (this.life / this.maxLife) : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

class VFXShockwave {
    constructor(x, y, maxRadius, duration, color = "#ffffff", strokeWidth = 3) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.life = duration;
        this.color = color;
        this.strokeWidth = strokeWidth;
    }
    update() {
        this.life--;
        let progress = 1 - (this.life / this.duration);
        this.radius = this.maxRadius * progress;
    }
    draw(ctx) {
        let alpha = this.life / this.duration;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.strokeWidth;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

class VFXSlash {
    constructor(x, y, length, angle, duration, color = "#ff0055") {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.duration = duration;
        this.life = duration;
        this.color = color;
    }
    update() {
        this.life--;
    }
    draw(ctx) {
        let progress = 1 - (this.life / this.duration);
        let alpha = this.life / this.duration;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4 + (1 - progress) * 8;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.lineCap = "round";

        let startX = this.x - Math.cos(this.angle) * (this.length / 2) * progress;
        let startY = this.y - Math.sin(this.angle) * (this.length / 2) * progress;
        let endX = this.x + Math.cos(this.angle) * (this.length / 2) * progress;
        let endY = this.y + Math.sin(this.angle) * (this.length / 2) * progress;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

class VFXBeam {
    constructor(fromX, fromY, toX, toY, width, color, duration, beamColor = "#ffffff") {
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.maxWidth = width;
        this.color = color;
        this.beamColor = beamColor;
        this.duration = duration;
        this.life = duration;
    }
    update() {
        this.life--;
        if (this.life > 2) {
            let count = 3;
            for (let i = 0; i < count; i++) {
                let angle = (Math.random() - 0.5) * Math.PI * 1.5;
                let speed = 4 + Math.random() * 8;
                let vx = Math.cos(angle) * speed * (this.fromX < this.toX ? 1 : -1);
                let vy = Math.sin(angle) * speed;
                canvasVFX.addParticle(new VFXParticle(this.toX, this.toY, vx, vy, this.color, 2 + Math.random() * 4, 15 + Math.random() * 15, 0.15));
            }
        }
    }
    draw(ctx) {
        let progress = this.life / this.duration;
        let alpha = Math.sin(progress * Math.PI);
        ctx.save();
        ctx.globalAlpha = alpha;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.maxWidth;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.toX, this.toY);
        ctx.stroke();

        ctx.strokeStyle = this.beamColor;
        ctx.lineWidth = this.maxWidth * 0.4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.beamColor;
        ctx.beginPath();
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.toX, this.toY);
        ctx.stroke();
        
        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

class VFXLightning {
    constructor(startX, startY, endX, endY, color = "#00d4ff", duration = 12) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = color;
        this.duration = duration;
        this.life = duration;
        this.points = [];
        this.generatePoints();
    }
    generatePoints() {
        let dx = this.endX - this.startX;
        let dy = this.endY - this.startY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let segments = Math.max(4, Math.floor(distance / 30));
        
        this.points = [{ x: this.startX, y: this.startY }];
        for (let i = 1; i < segments; i++) {
            let t = i / segments;
            let px = this.startX + dx * t;
            let py = this.startY + dy * t;
            
            let perpX = -dy / distance;
            let perpY = dx / distance;
            let offset = (Math.random() - 0.5) * 30;
            
            this.points.push({ x: px + perpX * offset, y: py + perpY * offset });
        }
        this.points.push({ x: this.endX, y: this.endY });
    }
    update() {
        this.life--;
        if (this.life > 6) {
            for (let i = 0; i < 2; i++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = 3 + Math.random() * 5;
                canvasVFX.addParticle(new VFXParticle(this.endX, this.endY, Math.cos(angle) * speed, Math.sin(angle) * speed, this.color, 1.5 + Math.random() * 3, 10 + Math.random() * 10, 0.1));
            }
        }
    }
    draw(ctx) {
        let alpha = this.life / this.duration;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3 + Math.random() * 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = ctx.lineWidth * 0.3;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

class VFXWind {
    constructor(startX, startY, endX, endY, color = "#00ff88", duration = 15) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.x = startX;
        this.y = startY;
        this.color = color;
        this.duration = duration;
        this.life = duration;
    }
    update() {
        this.life--;
        let progress = 1 - (this.life / this.duration);
        this.x = this.startX + (this.endX - this.startX) * progress;
        this.y = this.startY + (this.endY - this.startY) * progress;
        canvasVFX.addParticle(new VFXParticle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, this.color, 2 + Math.random() * 2, 10, -0.02));
    }
    draw(ctx) {
        let progress = 1 - (this.life / this.duration);
        ctx.save();
        ctx.globalAlpha = this.life / this.duration;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        let size = 15 + progress * 25;
        let dir = this.startX < this.endX ? 1 : -1;
        
        ctx.arc(this.x - dir * size * 0.5, this.y, size, -Math.PI/3, Math.PI/3);
        ctx.arc(this.x - dir * size * 0.8, this.y, size * 0.8, Math.PI/3, -Math.PI/3, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    isFinished() {
        return this.life <= 0;
    }
}

const canvasVFX = {
    canvas: null,
    ctx: null,
    particles: [],
    animations: [],
    loopActive: false,

    init() {
        let container = document.getElementById("efeitos");
        if (!container) return;
        
        this.canvas = document.getElementById("canvas-vfx-screen");
        if (!this.canvas) {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "canvas-vfx-screen";
            this.canvas.style.position = "absolute";
            this.canvas.style.top = "0";
            this.canvas.style.left = "0";
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";
            this.canvas.style.pointerEvents = "none";
            this.canvas.style.zIndex = "400";
            container.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext("2d");
        this.resize();
        window.addEventListener("resize", () => this.resize());
        
        if (!this.loopActive) {
            this.loopActive = true;
            this.loop();
        }
    },

    resize() {
        if (!this.canvas) return;
        let rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    addParticle(p) {
        this.particles.push(p);
    },

    addAnimation(anim) {
        this.animations.push(anim);
    },

    loop() {
        if (!this.loopActive) return;
        requestAnimationFrame(() => this.loop());
        
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.animations.length - 1; i >= 0; i--) {
            let anim = this.animations[i];
            anim.update();
            anim.draw(this.ctx);
            if (anim.isFinished()) {
                this.animations.splice(i, 1);
            }
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.isFinished()) {
                this.particles.splice(i, 1);
            }
        }
    },

    fireBeam(fromX, fromY, toX, toY, color, width, duration, coreColor = "#ffffff") {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                let angle = Math.random() * Math.PI * 2;
                let radius = 30 + Math.random() * 40;
                let px = fromX + Math.cos(angle) * radius;
                let py = fromY + Math.sin(angle) * radius;
                let vx = -Math.cos(angle) * (radius / 10);
                let vy = -Math.sin(angle) * (radius / 10);
                this.addParticle(new VFXParticle(px, py, vx, vy, color, 2 + Math.random() * 2, 8, 0, false));
            }, i * 15);
        }
        
        setTimeout(() => {
            this.addAnimation(new VFXBeam(fromX, fromY, toX, toY, width, color, duration, coreColor));
            this.addAnimation(new VFXShockwave(fromX, fromY, width * 1.5, 12, color));
            this.addAnimation(new VFXShockwave(toX, toY, width * 2, 18, color, 4));
        }, 350);
    },

    fireSlash(x, y, length, angle, duration, color) {
        this.addAnimation(new VFXSlash(x, y, length, angle, duration, color));
        let count = 8;
        for (let i = 0; i < count; i++) {
            let spAngle = angle + (Math.random() - 0.5) * Math.PI * 0.4;
            let speed = 3 + Math.random() * 6;
            this.addParticle(new VFXParticle(x, y, Math.cos(spAngle) * speed, Math.sin(spAngle) * speed, color, 1.5 + Math.random() * 2, 12 + Math.random() * 12, 0.04));
        }
    },

    fireHitSparks(x, y, color = "#ffaa00", count = 12) {
        this.addAnimation(new VFXShockwave(x, y, 45, 12, color, 2));
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 2.5 + Math.random() * 5;
            this.addParticle(new VFXParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 1.8 + Math.random() * 2.2, 8 + Math.random() * 12, 0.08));
        }
    },

    fireElectricSparks(rect, color = "#00ff88") {
        for (let i = 0; i < 4; i++) {
            let sx = rect.left + Math.random() * rect.width;
            let sy = rect.top + Math.random() * rect.height;
            let ex = sx + (Math.random() - 0.5) * 35;
            let ey = sy + (Math.random() - 0.5) * 35;
            this.addAnimation(new VFXLightning(sx, sy, ex, ey, color, 6));
        }
    },

    fireLightningStrike(toX, toY, color = "#00d4ff") {
        let fromX = toX + (Math.random() - 0.5) * 80;
        let fromY = 0;
        this.addAnimation(new VFXLightning(fromX, fromY, toX, toY, color, 16));
        this.addAnimation(new VFXShockwave(toX, toY, 95, 20, color, 3));
    },

    fireFugaArrow(fromX, fromY, toX, toY) {
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                let angle = Math.random() * Math.PI * 2;
                let radius = 40 + Math.random() * 40;
                let px = fromX + Math.cos(angle) * radius;
                let py = fromY + Math.sin(angle) * radius;
                let vx = -Math.cos(angle) * (radius / 12);
                let vy = -Math.sin(angle) * (radius / 12);
                this.addParticle(new VFXParticle(px, py, vx, vy, "rgba(255, 90, 0, 0.85)", 2.5 + Math.random() * 2.5, 10, -0.01, true));
            }, i * 12);
        }

        setTimeout(() => {
            let arrow = {
                x: fromX,
                y: fromY,
                life: 25,
                update() {
                    this.life--;
                    let progress = 1 - (this.life / 25);
                    this.x = fromX + (toX - fromX) * progress;
                    this.y = fromY + (toY - fromY) * progress;
                    for (let i = 0; i < 2; i++) {
                        let vx = (Math.random() - 0.5) * 2;
                        let vy = (Math.random() - 0.5) * 2 - 1;
                        canvasVFX.addParticle(new VFXParticle(this.x, this.y, vx, vy, Math.random() < 0.5 ? "#ffaa00" : "#ff3300", 2.5 + Math.random() * 3, 12, -0.03));
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.fillStyle = "#ffdd00";
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "#ff5500";
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                },
                isFinished() {
                    return this.life <= 0;
                }
            };
            this.addAnimation(arrow);
            
            setTimeout(() => {
                this.addAnimation(new VFXShockwave(toX, toY, 175, 25, "#ff5500", 5));
                for (let i = 0; i < 30; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = 2 + Math.random() * 8;
                    let color = Math.random() < 0.4 ? "#ffdd00" : (Math.random() < 0.7 ? "#ff6600" : "#ff1100");
                    this.addParticle(new VFXParticle(toX, toY, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3.5 + Math.random() * 5, 15 + Math.random() * 15, -0.04));
                }
            }, 410);
        }, 400);
    }
};

function getCharacterCenter(isJogador) {
    let el = isJogador ? imgJogador : imgCPU;
    if (!el || !arena) return { x: 0, y: 0 };
    let rect = el.getBoundingClientRect();
    let arenaRect = arena.getBoundingClientRect();
    let adjustment = getAjusteForma(isJogador ? jogador : inimigo);
    return {
        x: rect.left - arenaRect.left + (rect.width / 2) + adjustment.x,
        y: rect.top - arenaRect.top + (rect.height / 2) + adjustment.y,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom - arenaRect.top
    };
}

function animateSpriteDash(isJogador, callback) {
    let el = isJogador ? imgJogador : imgCPU;
    if (!el) { if (callback) callback(); return; }
    
    el.style.transition = "transform 0.12s cubic-bezier(0.25, 0.8, 0.25, 1)";
    let originalTransform = isJogador ? "" : "scaleX(-1)";
    let dashOffset = isJogador ? 130 : -130;
    
    el.style.transform = `${originalTransform} translateX(${dashOffset}px)`;
    
    setTimeout(() => {
        el.style.transform = originalTransform;
        setTimeout(() => {
            el.style.transition = "";
            if (callback) callback();
        }, 120);
    }, 120);
}

function animateSpriteLeap(isJogador, callback) {
    let el = isJogador ? imgJogador : imgCPU;
    if (!el) { if (callback) callback(); return; }
    
    el.style.transition = "transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)";
    let originalTransform = isJogador ? "" : "scaleX(-1)";
    
    let dashOffset = isJogador ? 70 : -70;
    el.style.transform = `${originalTransform} translate(${dashOffset}px, -100px) scale(1.12)`;
    
    setTimeout(() => {
        el.style.transition = "transform 0.1s cubic-bezier(0.8, 0, 0.8, 1)";
        el.style.transform = `${originalTransform} translate(${dashOffset * 2}px, 15px) scale(0.96)`;
        
        setTimeout(() => {
            if (callback) callback();
            
            setTimeout(() => {
                el.style.transition = "transform 0.18s ease";
                el.style.transform = originalTransform;
                setTimeout(() => { el.style.transition = ""; }, 180);
            }, 250);
        }, 100);
    }, 180);
}
function getAjusteForma(personagem){
    if(!personagem) return { x: 0, y: 0 };
    let nome = personagem.nome.toLowerCase();
    let forma = personagem.formaAtual;
    return (ajustesPosicaoForma[nome] && ajustesPosicaoForma[nome][forma]) || { x: 0, y: 0 };
}

function preloadImagens(){
    for(let p in personagens){
        let formas = personagens[p].formas;
        for(let f in formas){
            if(formas[f].img){
                let img = new Image();
                img.src = formas[f].img;
            }
        }
    }
}

const personagens = {
    goku:{
        nome: "Goku",
        elemento : "eletrico",
        tagElemento: "Elétrico",
        iconeElemento: "⚡",
        corTema: "#ffcc00",
        descricaoCurta: "Um saiyajin que fica mais forte a cada golpe e nunca desiste de um bom combate.",
        assinatura: "Kamehameha",
        passivaNome: null,
        passivaDescricao: "Sem passiva especial — força bruta, evolução constante e nada de truques escondidos.",
        formaAtual: "base",
        formas:{
            base: {
                vidaMax: 100,
                energiaMax:100,
                custoTransform: 50,
                img:"img/goku.png",
                ataques: [
                    {nome: "soco", dano: 8, custo: 0, tipo: "ataque", descricao: "Golpe básico sem custo de energia. Ideal para economizar recursos enquanto ataca."},
                    {nome: "kamehameha", dano: 22, custo: 25, tipo: "ataque", descricao: "Rajada de energia à distância. Dano sólido por um custo médio."},
                    {nome: "dragon rush", dano: 15, custo: 15, tipo: "ataque", descricao: "Investida corpo a corpo com bom custo-benefício."},
                    {nome: "transformar", custo: 0, tipo: "transformacao", descricao: "Usa a barra de Transformação para virar Super Sayajin: mais vida, mais energia e golpes mais fortes."},
                ]
            },
            ssj: {
                vidaMax: 130,
                energiaMax: 120,
                img:"img/ssj-removebg-preview.png",
                ataques:[
                    {nome:"soco", dano: 12, custo: 0, tipo:"ataque", descricao: "Versão mais forte do soco básico, ainda sem custo de energia."},
                    {nome:"super kamehameha", dano: 35, custo: 40, tipo:"ataque", descricao: "A explosão de energia mais poderosa do Goku. Custo alto, dano altíssimo."},
                    {nome:"kamehameha", dano: 25, custo: 25, tipo:"ataque", descricao: "Rajada de energia à distância, já fortalecida pela forma Super Sayajin."},
                ]
            }
        }
    },
  midoriya: {
        nome: "Midoriya",
        elemento: "vento",
        tagElemento: "Vento",
        iconeElemento: "🌪️",
        corTema: "#00ff88",
        descricaoCurta: "Um herói que evolui a cada transformação, arriscando o próprio corpo pelo poder de One For All.",
        assinatura: "Detroit Smash",
        passivaNome: "Último Suspiro",
        passivaDescricao: "Ao cair abaixo de 20% de vida na forma Dark Deku, entra em estado Berserk.",
        formaAtual: "base",
        usouBerserk: false, 
        cooldowns: {}, // NOVO: Controle de tempo de recarga
        formas: {
            base: {
                img: "img/midoriya.png",
                vidaMax: 90, energiaMax: 100, custoTransform: 40,
                ataques: [
                    { nome: "Detroit Smash", dano: 32, custo: 20, tipo: "ataque", mecanica: "recoil" },
                    { nome: "Delaware Smash", dano: 22, custo: 30, tipo: "ataque", mecanica: "quebra-guarda" },
                    { nome: "Análise Nº 13", dano: 0, custo: -25, tipo: "ataque", mecanica: "foco" },
                    { nome: "transformar", custo: 0, tipo: "transformacao" }
                ]
            },
            fullcowl: {
                vidaMax: 110, energiaMax: 110, custoTransform: 60,
                img: "img/fullcown.png", 
                ataques: [
                    { nome: "Manchester Smash", dano: 25, custo: 25, tipo: "ataque", mecanica: "stun-pesado" },
                    { nome: "Impulso de Faísca", dano: 0, custo: 15, tipo: "ataque", mecanica: "acelerar" },
                    { nome: "St. Louis Smash", dano: 24, custo: 35, tipo: "ataque" },
                    { nome: "transformar", custo: 0, tipo: "transformacao" }
                ]
            },
            oneforall100: {
                vidaMax: 80, energiaMax: 140, custoTransform: 80,
                img: "img/100_-removebg-preview.png",
                ataques: [
                    { nome: "Detroit 100%", dano: 60, custo: 70, tipo: "ataque", mecanica: "quebra-escudo" },
                    { nome: "United States of World Smash", dano: 45, custo: 50, tipo: "ataque", mecanica: "stun-pesado" },
                    { nome: "Proteção de Eri", dano: -30, custo: 20, tipo: "ataque", mecanica: "cura" },
                    { nome: "transformar", custo: 0, tipo: "transformacao" }
                ]
            },
            darkdeku: {
                vidaMax: 120, energiaMax: 130,
                img: "img/dekudark.png", 
                ataques: [
                    { nome: "Emboscada Sombria", dano: 18, custo: 30, tipo: "ataque", mecanica: "cegueira" },
                    { nome: "Faux 100%", dano: 0, custo: 40, tipo: "ataque", mecanica: "buff-faux", cooldownMax: 3 }, // Modificado
                    { nome: "Danger Sense", dano: 12, custo: 25, tipo: "ataque", mecanica: "esquiva" }
                ]
            },
            berserk: {
                vidaMax: 120, energiaMax: 150,
                img: "img/berserk.png", 
                ataques: [
                    { nome: "Garras Sombrias", dano: 30, custo: 20, tipo: "ataque", mecanica: "roubo-energia" },
                    { nome: "Gearshift", dano: 42, custo: 50, tipo: "ataque", mecanica: "gearshift-buff", descricao: "Aumenta esquiva, amplifica dano do próximo golpe e quebra a guarda inimiga!" },
                    { nome: "Delaware Infinito", dano: 80, custo: 80, tipo: "ataque", mecanica: "kamikaze" }
                ]
            }
        }
    },
    sukuna:{
        nome:"Sukuna",
        elemento: "dark",
        tagElemento: "Amaldiçoado",
        iconeElemento: "💀",
        corTema: "#ff0055",
        descricaoCurta: "O Rei das Maldições: ataques versáteis que evoluem em poder de destruição a cada transformação.",
        assinatura: "Domínio: Malevolent Shrine",
        passivaNome: "Regeneração Amaldiçoada",
        passivaDescricao: "Quando está abaixo de 50% de vida, recupera uma pequena parte do HP máximo a cada turno.",
        formaAtual: "base",
        formas:{
            base:{
                img:"img/Sukuna Ryomen-Photoroom.png",
                vidaMax: 120,
                energiaMax: 100,
                custoTransform: 50,
                ataques:[
                    {nome:"cleave", dano: 15, custo: 0, tipo:"ataque", mecanica: "roubo-energia", descricao: "Sequência rápida de cortes, sem custo de energia. Cada uso rouba um pouco de energia do oponente."},
                    {nome:"fuga", dano: 25, custo: 20, tipo:"ataque", mecanica: "quebra-guarda", descricao: "Flecha amaldiçoada que ignora esquiva e quebra a guarda: o próximo golpe no oponente causa mais dano."},
                    {nome:"expansão", dano: 10, custo: 25, tipo:"ataque", descricao: "Ativa um minigame de ritmo. O resultado define uma Expansão de Domínio que causa dano garantido (não pode ser esquivado) por alguns turnos."},
                    {nome: "transformar", custo: 0, tipo: "transformacao", descricao: "Usa a barra de Transformação para invocar Mahoraga ou a Adaptação, evoluindo para a forma Meguna."},
                ]
            },
            meguna:{
                vidaMax: 120,
                energiaMax: 130,
                custoTransform: 60,
                img:"img/meguna.png",
                ataques:[
                    {nome:"agito", dano: 20, custo: 0, tipo:"ataque", mecanica: "acelerar", descricao: "Golpe rápido sem custo de energia que também aumenta sua velocidade: +esquiva por 2 turnos."},
                    {nome:"mahoraga", dano: 45, custo: 55, tipo:"ataque", descricao: "Abre a escolha entre invocar Mahoraga (ataques extras automáticos) ou ativar a Adaptação (reduz dano de golpes repetidos)."},
                    {nome:"corte mundial", dano: 80, custo: 85, tipo:"ataque", mecanica: "kamikaze", descricao: "O corte mais poderoso da forma Meguna. Dano altíssimo, mas você sofre 30% desse dano de volta."},
                    {nome: "transformar", custo: 0, tipo: "transformacao", descricao: "Usa a barra de Transformação para revelar a verdadeira forma da Era Heian."},
                ]
            },
            heian:{
                vidaMax: 201,
                energiaMax: 160,
                img:"img/heian.png",
                ataques:[
                    {nome:"raio", dano: 25, custo: 20, tipo:"ataque", mecanica: "stun", descricao: "Descarga amaldiçoada que atordoa o oponente, fazendo-o perder o próximo turno."},
                    {nome:"world cut", dano: 90, custo: 90, tipo:"ataque", mecanica: "quebra-escudo", descricao: "O corte que divide mundos. Ignora esquiva e quebra a guarda: o próximo golpe no oponente causa mais dano."},
                    {nome:"expansao", dano: 30, custo: 30, tipo:"ataque", descricao: "Ativa o minigame de ritmo para a Expansão suprema: dano garantido (não pode ser esquivado) por alguns turnos."},
                ]
            }
        }
    }
};

/* Chance de esquiva (passiva) por personagem e forma. Formas finais/definitivas
   trocam parte da esquiva por poder bruto; formas de transição são mais ágeis. */
const esquivaBase = {
    goku:     { base: 0.08, ssj: 0.11 },
    midoriya: { base: 0.10, fullcowl: 0.16, oneforall100: 0.05, darkdeku: 0.20, berserk: 0.04 },
    sukuna:   { base: 0.09, meguna: 0.11, heian: 0.05 }
};

preloadImagens();

/* =========================================================
   TELA DE SELEÇÃO DE PERSONAGEM (cards dinâmicos)
========================================================= */
function renderizarSelecaoPersonagens(){
    let container = document.getElementById("selecao-grid");
    if(!container) return;
    container.innerHTML = "";

    Object.keys(personagens).forEach(chave => {
        let p = personagens[chave];
        let formaBase = p.formas[p.formaAtual];
        let card = document.createElement("button");
        card.type = "button";
        card.className = "character-card";
        card.style.setProperty("--cor-tema", p.corTema || "#00a2ff");
        card.onclick = () => escolherPersonagem(chave);

        card.innerHTML = `
            <div class="character-card-topo">
                <img src="${formaBase.img}" alt="${p.nome}" class="character-card-img">
                <span class="character-card-tag">${p.iconeElemento || ""} ${p.tagElemento || ""}</span>
            </div>
            <h2 class="character-card-nome">${p.nome}</h2>
            <p class="character-card-desc">${p.descricaoCurta || ""}</p>
            <div class="character-card-stats">
                <div class="character-card-stat"><span>VIDA</span><strong>${formaBase.vidaMax}</strong></div>
                <div class="character-card-stat"><span>ENERGIA</span><strong>${formaBase.energiaMax || 100}</strong></div>
            </div>
            <p class="character-card-assinatura">⭐ Golpe marcante: <strong>${p.assinatura || "?"}</strong></p>
            <p class="character-card-passiva${p.passivaNome ? "" : " character-card-passiva-vazia"}">${p.passivaNome ? "🛡 Passiva — " + p.passivaNome + ": " : ""}${p.passivaDescricao || ""}</p>
        `;

        container.appendChild(card);
    });
}
renderizarSelecaoPersonagens();

function mostrarAvisoModoIndisponivel(){
    let aviso = document.getElementById("aviso-modo");
    if(!aviso) return;
    aviso.classList.add("aviso-modo-visivel");
    clearTimeout(aviso._timeoutAviso);
    aviso._timeoutAviso = setTimeout(() => aviso.classList.remove("aviso-modo-visivel"), 2600);
}

/* =========================================================
   SISTEMA DE ESQUIVA E STATUS (PASSIVAS E MECÂNICAS)
   ---------------------------------------------------------
   - esquiva: chance passiva (por personagem/forma) de evitar
     um golpe por completo. Golpes com mecanica "quebra-guarda"
     ou "quebra-escudo" ignoram a esquiva (são "certeiros").
   - status: atordoado (perde o turno), cegueiraTurnos (chance
     do PRÓPRIO golpe errar), esquivaBonusTurnos (buff temporário
     de esquiva), guardaQuebradaCargas (recebe mais dano no
     próximo golpe), proximoAtaqueBonus (bônus de dano no
     próximo golpe desferido).
========================================================= */
function estadoStatusPadrao(){
    return {
        atordoado: false,
        stunRodadas: 0, // NOVO: Controle de turnos de stun
        cegueiraTurnos: 0,
        esquivaBonusTurnos: 0,
        esquivaBonusValor: 0,
        guardaQuebradaCargas: 0,
        proximoAtaqueBonus: 0
    };
}

function getEsquivaBase(personagem){
    if(!personagem) return 0.08;
    let nome = personagem.nome.toLowerCase();
    let forma = personagem.formaAtual;
    let tabela = esquivaBase[nome];
    if(tabela && tabela[forma] !== undefined) return tabela[forma];
    return 0.08;
}

function getEsquivaTotal(personagem){
    let base = getEsquivaBase(personagem);
    if(personagem.status && personagem.status.esquivaBonusTurnos > 0){
        base += personagem.status.esquivaBonusValor;
    }
    return Math.min(base, 0.6);
}

let ultimaEsquiva = false; // resolvido 1x por ataque; lido pelas funções de impacto (efeitoDano/efeitoDanoJogador)

function resolverEsquiva(alvoPersonagem, ataque){
    let ignoraEsquiva = ataque && (ataque.mecanica === "quebra-guarda" || ataque.mecanica === "quebra-escudo");
    if(ignoraEsquiva){ ultimaEsquiva = false; return false; }
    let chance = getEsquivaTotal(alvoPersonagem);
    ultimaEsquiva = Math.random() < chance;
    return ultimaEsquiva;
}

function aplicarDanoSeAcertou(alvoObj, dano, atacanteObj){
    if(ultimaEsquiva) return 0;
    let danoFinal = dano;
    if(atacanteObj && atacanteObj.status && atacanteObj.status.proximoAtaqueBonus > 0){
        danoFinal = Math.round(danoFinal * (1 + atacanteObj.status.proximoAtaqueBonus));
        atacanteObj.status.proximoAtaqueBonus = 0;
    }
    if(alvoObj.status && alvoObj.status.guardaQuebradaCargas > 0){
        danoFinal = Math.round(danoFinal * 1.25);
        alvoObj.status.guardaQuebradaCargas--;
    }
    alvoObj.vida -= danoFinal;
    if(alvoObj.vida < 0) alvoObj.vida = 0;
    return danoFinal;
}

function aplicarEfeitoNoAlvo(alvoObj, ataque, acertou){
    if(!acertou || !ataque || !ataque.mecanica || !alvoObj.status) return;
    
    // SISTEMA DE STUN COM PORCENTAGEM E QUEDA
    if(ataque.mecanica === "stun" || ataque.mecanica === "stun-pesado"){
        let chance = ataque.mecanica === "stun-pesado" ? 0.70 : 0.40; // 70% pros golpes fortes, 40% pro normal
        let imgAlvo = alvoObj === jogador ? imgJogador : imgCPU;

        if(Math.random() <= chance){
            if(alvoObj.status.stunRodadas > 0){
                mostrarTextoFlutuante("JÁ ATORDOADO (Não acumula)", alvoObj === jogador, "#888");
            } else {
                alvoObj.status.stunRodadas = ataque.mecanica === "stun-pesado" ? 2 : 1;
                alvoObj.status.atordoado = true;
                mostrarTextoFlutuante("ATORDOADO!", alvoObj === jogador, "#ffcc00");
                
                if(ataque.mecanica === "stun-pesado") {
                    imgAlvo.classList.add("caido");
                }
            }
        } else {
            mostrarTextoFlutuante("RESISTIU!", alvoObj === jogador, "#aaa");
        }
    } 
    else if(ataque.mecanica === "cegueira"){
        alvoObj.status.cegueiraTurnos = 2;
        mostrarTextoFlutuante("CEGO!", alvoObj === jogador, "#aa66ff");
    } else if(ataque.mecanica === "quebra-guarda" || ataque.mecanica === "quebra-escudo"){
        alvoObj.status.guardaQuebradaCargas = (alvoObj.status.guardaQuebradaCargas || 0) + 1;
        mostrarTextoFlutuante("GUARDA QUEBRADA!", alvoObj === jogador, "#ff0055");
    }
    atualizarStatusBadges();
}

function aplicarMecanicaAutoBuff(atacante, ataque){
    if(!ataque || !ataque.mecanica || !atacante.status) return;
    let ehJogador = (atacante === jogador);
    switch(ataque.mecanica){
        case "recoil": {
            let autoDano = Math.floor(ataque.dano * 0.2);
            atacante.vida -= autoDano;
            if(atacante.vida < 0) atacante.vida = 0;
            mostrarTextoFlutuante("-" + autoDano + " HP", ehJogador, "#ff4444");
            break;
        }
        case "kamikaze": {
            let autoDano = Math.floor(ataque.dano * 0.3);
            atacante.vida -= autoDano;
            if(atacante.vida < 0) atacante.vida = 0;
            mostrarTextoFlutuante("-" + autoDano + " HP", ehJogador, "#ff4444");
            break;
        }
        case "cura": {
            let valorCura = Math.abs(ataque.dano) || 40;
            atacante.vida = Math.min(atacante.vida + valorCura, atacante.vidaMax);
            mostrarTextoFlutuante("+" + valorCura + " HP", ehJogador, "#00ff88");
            break;
        }
        case "roubo-energia": {
            let alvo = ehJogador ? inimigo : jogador;
            let roubado = Math.min(20, alvo.energia);
            alvo.energia = Math.max(alvo.energia - 20, 0);
            atacante.energia = Math.min(atacante.energia + roubado, atacante.energiaMax);
            mostrarTextoFlutuante("-" + Math.round(roubado) + " EN", ehJogador, "#ffaa00");
            mostrarTextoFlutuante("+" + Math.round(roubado) + " EN", !ehJogador, "#00d4ff");
            if(ehJogador) atualizarEnergiaCPU(); else atualizarEnergia();
            break;
        }
        case "foco": {
            atacante.status.proximoAtaqueBonus = 0.25;
            mostrarTextoFlutuante("FOCO! +25% no próximo", ehJogador, "#00ffaa");
            break;
        }
       case "acelerar": {
            atacante.status.esquivaBonusTurnos = 2;
            atacante.status.esquivaBonusValor = 0.40; // Agora dá +40% de esquiva real!
            mostrarTextoFlutuante("+40% ESQUIVA (2 turnos)", ehJogador, "#00ffaa");
            break;
        }
        case "esquiva": {
            atacante.status.esquivaBonusTurnos = 3;
            atacante.status.esquivaBonusValor = 0.50; // Danger Sense dá +50%!
            mostrarTextoFlutuante("+50% ESQUIVA (3 turnos)", ehJogador, "#ff6666");
            break;
        }
    }
    if(ehJogador) atualizarVida(); else atualizarVidaCPU();
    atualizarStatusBadges();
}

/* Chamado no início da ação de um personagem: consome 1 turno de cegueira
   (com chance do golpe sair errado) e 1 turno do bônus de esquiva. */
function ticarStatusAntesDoAtaque(personagem){
    if(!personagem.status) personagem.status = estadoStatusPadrao();
    let cegoAgora = false;
    if(personagem.status.cegueiraTurnos > 0){
        personagem.status.cegueiraTurnos--;
        cegoAgora = Math.random() < 0.35;
    }
    if(personagem.status.esquivaBonusTurnos > 0){
        personagem.status.esquivaBonusTurnos--;
    }
    atualizarStatusBadges();
    return { cego: cegoAgora };
}

function aplicarRegeneracaoPassiva(personagem, ehJogador){
    if(!personagem || jogoFinalizado) return;
    if(personagem.nome.toLowerCase() !== "sukuna") return;
    let percentualVida = personagem.vida / personagem.vidaMax;
    if(percentualVida > 0 && percentualVida < 0.5){
        let cura = Math.max(1, Math.floor(personagem.vidaMax * 0.03));
        personagem.vida = Math.min(personagem.vida + cura, personagem.vidaMax);
        mostrarTextoFlutuante("+" + cura + " HP", ehJogador, "#ff0055");
        if(ehJogador) atualizarVida(); else atualizarVidaCPU();
    }
}

function mostrarTextoFlutuante(texto, sobreJogador, cor){
    let alvoEl = sobreJogador ? imgJogador : imgCPU;
    if(!alvoEl || !arena) return;
    let rect = alvoEl.getBoundingClientRect();
    let arenaRect = arena.getBoundingClientRect();
    let txt = document.createElement("div");
    txt.className = "texto-flutuante";
    txt.style.color = cor || "#ffffff";
    txt.style.left = (rect.left - arenaRect.left + rect.width / 2) + "px";
    txt.style.top = (rect.top - arenaRect.top) + "px";
    txt.textContent = texto;
    let camada = document.getElementById("efeitos");
    if(camada){
        camada.appendChild(txt);
        setTimeout(() => txt.remove(), 900);
    }
}

function renderizarBadges(elementId, personagem){
    let container = document.getElementById(elementId);
    if(!container) return;
    if(!personagem || !personagem.status){ container.innerHTML = ""; return; }
    let s = personagem.status;
    let badges = [];
    if(s.atordoado) badges.push('<span class="status-badge" title="Atordoado: perde o próximo turno">🌀</span>');
    if(s.cegueiraTurnos > 0) badges.push('<span class="status-badge" title="Cego: chance de o próprio golpe errar (' + s.cegueiraTurnos + ' turno(s))">👁️</span>');
    if(s.esquivaBonusTurnos > 0) badges.push('<span class="status-badge" title="Esquiva aumentada (' + s.esquivaBonusTurnos + ' turno(s))">💨</span>');
    if(s.guardaQuebradaCargas > 0) badges.push('<span class="status-badge" title="Guarda quebrada: próximo golpe recebido causa mais dano">🛡️</span>');
    if(s.proximoAtaqueBonus > 0) badges.push('<span class="status-badge" title="Próximo golpe com dano bônus">🎯</span>');
    container.innerHTML = badges.join("");
}

function atualizarStatusBadges(){
    renderizarBadges("statusBadgesJogador", jogador);
    renderizarBadges("statusBadgesCPU", inimigo);
}

function escolherPersonagem(nome){
    resetarTexto();
    jogador = JSON.parse(JSON.stringify(personagens[nome]));
    
    let forma = jogador.formaAtual;
    jogador.vidaMax = jogador.formas[forma].vidaMax;
    jogador.vida = jogador.formas[forma].vidaMax;
    jogador.energiaMax = jogador.formas[forma].energiaMax || 100;
    jogador.status = estadoStatusPadrao();
    setEnergia(jogador, 0.4);
    
    escolherCPU();
    atualizarVida();
    mostrarSkills();
    atualizarEnergia();
    atualizarEnergiaCPU();

    turno = "jogador";
    liberarSkills();
    barraTransform = 0;
    atualizarBarraTransform();
    imgJogador.src = jogador.formas[jogador.formaAtual].img;
    document.getElementById("nomeP").textContent = jogador.nome;

    selecao.style.display = "none";
    arena.style.display = "flex";
    
    // Initialize Canvas VFX
    if (typeof canvasVFX !== "undefined") {
        canvasVFX.init();
    }
}

function escolherCPU(){
    let lista = Object.keys(personagens);
    lista = lista.filter(p => p !== jogador.nome.toLowerCase());

    let aleatorio = lista[Math.floor(Math.random() * lista.length)];
    inimigo = JSON.parse(JSON.stringify(personagens[aleatorio]));

    let forma = inimigo.formaAtual;
    document.getElementById("nomecpu").textContent = inimigo.nome;

    inimigo.vidaMax = inimigo.formas[forma].vidaMax;
    inimigo.vida = inimigo.vidaMax;
    inimigo.energiaMax = inimigo.formas[forma].energiaMax || 100;
    inimigo.energia = Math.floor(inimigo.energiaMax * 0.4);
    inimigo.barraTransform = 0;
    inimigo.status = estadoStatusPadrao();

    imgCPU.src = inimigo.formas[forma].img;

    if (!inimigo.formas[forma].energiaMax) {
        inimigo.formas[forma].energiaMax = inimigo.formas[forma].vidaMax;
    }

    atualizarVidaCPU();
    atualizarStatusBadges();
    nometela.textContent = `${jogador.nome} vs ${inimigo.nome}`;
}
        
function atualizarVida(){
    let maxVida = jogador.formas[jogador.formaAtual].vidaMax;
    let vidaPercent = (jogador.vida / maxVida) * 100;
    document.getElementById("vidaJogador").style.width = vidaPercent + "%";
    document.getElementById("vidaTexto").innerHTML = `<small>VIDA</small> ${Math.floor(jogador.vida)}/${maxVida}`;
}

function atualizarVidaCPU(){
    let maxVida = inimigo.formas[inimigo.formaAtual].vidaMax;
    let vidaPercent = (inimigo.vida / maxVida) * 100;
    document.getElementById("vidaCPU").style.width = vidaPercent + "%";
    document.getElementById("vidaTextoCPU").innerHTML = `<small>VIDA</small> ${Math.floor(inimigo.vida)}/${maxVida}`;
}

function mostrarSkills() {
    let container = document.getElementById("skills");
    container.innerHTML = "";

    let forma = jogador.formaAtual;
    let ataques = jogador.formas[forma].ataques;

    ataques.forEach((atk, index) => {
        let caixa = document.createElement("div");
        caixa.classList.add("skill-box");

        let nomeAtk = atk.nome.toLowerCase();
        let expansaoAtiva = dominioRodadasRestantes > 0 && (nomeAtk.includes("expansão") || nomeAtk.includes("expansao"));
        let descricao = atk.descricao || "Sem descrição disponível para este golpe.";

        caixa.innerHTML = `
            <span class="skill-info" title="Ver o que este golpe faz">ℹ</span>
            <div class="skill-tooltip">${descricao}</div>
            <h3>${atk.nome}</h3>
            <p>Dano: ${atk.dano || 0}</p>
            <p>Custo: ${atk.custo || 0}</p>
            ${expansaoAtiva ? `<p style="color:#ff0055; font-size:10px;">ATIVA (${dominioRodadasRestantes} rodadas)</p>` : ""}
        `;

        let iconeInfo = caixa.querySelector(".skill-info");
        if (iconeInfo) {
            iconeInfo.addEventListener("click", (e) => {
                e.stopPropagation();
                let jaAtivo = caixa.classList.contains("tooltip-ativa");
                document.querySelectorAll(".skill-box.tooltip-ativa").forEach(el => el.classList.remove("tooltip-ativa"));
                if (!jaAtivo) caixa.classList.add("tooltip-ativa");
            });
        }

        if (expansaoAtiva) {
            caixa.style.opacity = "0.4";
            caixa.style.borderColor = "#ff0055";
            caixa.style.cursor = "not-allowed";
        }

        let mahoragaBloqueado = atk.nome.toLowerCase() === "mahoraga" && modoMeguna !== null;
        let transformBloqueada = atk.tipo === "transformacao" && (barraTransform < getTransformMax() || !temFormaParaTransformar());
        
        // NOVO: Verifica cooldowns
        let temCooldown = jogador.cooldowns && jogador.cooldowns[atk.nome] > 0;

        if (temCooldown) {
            caixa.classList.add("skill-em-cooldown");
            caixa.innerHTML += `<p style="color:#ff4444; font-size:10px; font-weight:bold;">AGUARDE ${jogador.cooldowns[atk.nome]} TURNOS</p>`;
            caixa.onclick = () => { mostrarTextoAtaque("Habilidade recarregando!", "#ff4444"); };
        }
        else if (mahoragaBloqueado) {
            caixa.style.opacity = "0.4";
            caixa.style.cursor = "not-allowed";
            caixa.style.borderColor = "red";
            caixa.onclick = () => { mostrarTextoAtaque("Mahoraga já está ativo!", "#ff4444"); };
        } 
        else if (transformBloqueada) {
            caixa.style.opacity = "0.4";
            caixa.style.cursor = "not-allowed";
            caixa.style.borderColor = "#7b00ff";
            caixa.onclick = () => { mostrarTextoAtaque("Carregue a barra de transformação!", "#c77dff"); };
        } 
        else if (!expansaoAtiva) {
            caixa.onclick = () => usarAtaque(index);
        } 
        else {
            caixa.onclick = () => { mostrarTextoAtaque("Expansão já ativa!", "#ff0055"); };
        }

        container.appendChild(caixa);
    });
}

function bloquearSkills() {
    let container = document.getElementById("skills");
    container.style.pointerEvents = "none";
    container.style.opacity = "0.5";
}

// COPIE ESTA NOVA FUNÇÃO E SUBSTITUA A SUA ANTIGA
function liberarSkills() {
    if (cinematicaBerserkAtiva) return;

    let p = jogador;
    let container = document.getElementById("skills");

    // 1. DESBLOQUEIA A INTERFACE (A correção do travamento!)
    if (container) {
        container.style.pointerEvents = "auto";
        container.style.opacity = "1";
    }

    // 2. DIMINUIÇÃO DE COOLDOWNS
    if (p.cooldowns) {
        for (let atk in p.cooldowns) {
            if (p.cooldowns[atk] > 0) {
                p.cooldowns[atk]--;
            }
        }
    }
    
    // 3. PASSIVAS DO TURNO
    aplicarRegeneracaoPassiva(p, true);
    
    // Atualiza a interface
    mostrarSkills();
    atualizarStatusBadges();

    // 4. VERIFICAÇÃO DE STUN (Se estiver atordoado, perde a vez)
    if (p.status && p.status.atordoado) {
        p.status.stunRodadas--;
        if (p.status.stunRodadas <= 0) {
            p.status.atordoado = false;
            imgJogador.classList.remove("caido");
            atualizarStatusBadges();
        }

        mostrarTextoFlutuante("ATORDOADO!", true, "#ffcc00");
        mostrarTextoAtaque(`${p.nome} está atordoado e perde a vez!`, "#ffcc00");
        
        // Bloqueia a UI de novo porque você não vai jogar
        bloquearSkills();
        
        setTimeout(() => {
            limparTextoAtaque();
            turno = "cpu";
            turnoCPU(); // Passa a vez para a CPU
        }, 1100);
        return; // Sai da função impedindo você de agir
    }

    console.log("Turno liberado para ataque.");
}
function usarAtaque(index) {
    if (jogoFinalizado) return;
    if (turno !== "jogador") return;
    if (!jogador || !inimigo) return;
    if (verificarFimDeJogo()) return;
    
    bloquearSkills();

    let forma = jogador.formaAtual;
    let ataque = jogador.formas[forma].ataques[index];

    if (jogador.energia < ataque.custo) {
        alert("Sem energia!");
        liberarSkills();
        return;
    }

    if (ataque.tipo === "transformacao") {
        if (barraTransform < getTransformMax()) {
            mostrarTextoAtaque("Carregue a barra de transformação!", "#c77dff");
            setTimeout(() => limparTextoAtaque(), 1500);
            liberarSkills();
            return;
        }
        barraTransform = 0;
        atualizarBarraTransform();
        iniciarMinigame();
        return;
    }

    jogador.energia -= ataque.custo;
    atualizarEnergia();

    // Mecânicas automáticas (recoil, cura, roubo de energia, foco, buffs de esquiva...)
    aplicarMecanicaAutoBuff(jogador, ataque);

    if (ataque.tipo === "ataque") {
        let nomeAtk = ataque.nome.toLowerCase();

        // Cegueira: chance do próprio golpe sair errado (consome 1 turno de cegueira/esquiva-bônus)
        let statusTurno = ticarStatusAntesDoAtaque(jogador);
        if (statusTurno.cego) {
            mostrarTextoAtaque(`${jogador.nome} está cego e o golpe saiu errado!`, "#aa66ff");
            setTimeout(() => {
                limparTextoAtaque();
                if (!verificarFimDeJogo()) passarTurno();
            }, 900);
            return;
        }

        // NOVO: Roteador Exclusivo de Animações do Midoriya
        if (jogador.nome.toLowerCase() === "midoriya") {
            bloquearSkills();
            mostrarTextoAtaque(`${jogador.nome} usou ${ataque.nome}!`, "#00ffaa");
            resolverEsquiva(inimigo, ataque);

            // Chama a nova super função de efeitos de vento e partículas
            animarAtaqueMidoriya(nomeAtk, () => {
                limparTextoAtaque();

                if (nomeAtk.includes("eri") || nomeAtk.includes("faísca") || nomeAtk.includes("análise")) {
                    // Cura e buffs de utilidade já foram aplicados por aplicarMecanicaAutoBuff acima
                } else {
                    // ======== DANO NORMAL NOS INIMIGOS ========
                    let danoFinal = ataque.dano || 0;
                    if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                    let acertou = !ultimaEsquiva;
                    danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                    aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                    atualizarVidaCPU(); // Atualiza a barra vermelha do bot
                }
                
                ganharCargaTransform(100);
                if (!verificarFimDeJogo()) passarTurno();
            });
            return; // Impede que o resto do código antigo rode e cause bugs duplicados
        }
        if (jogador.nome.toLowerCase() === "goku") {
            bloquearSkills();
            mostrarTextoAtaque(`${jogador.nome} usou ${ataque.nome}!`, "#ffcc00");
            resolverEsquiva(inimigo, ataque);

            animarAtaqueGoku(true, nomeAtk, () => {
                limparTextoAtaque();
                let danoFinal = ataque.dano || 0;
                if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                atualizarVidaCPU();
                
                ganharCargaTransform(8);
                if (!verificarFimDeJogo()) passarTurno();
            });
            return;
        }

        if(nomeAtk === "mahoraga"){
            liberarSkills();
            abrirEscolhaMahoraga();
            return;
        }
        if (nomeAtk.includes("agito")) {
            resolverEsquiva(inimigo, ataque);
            animarAgito(true, () => {
                let danoFinal = ataque.dano;
                if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                ganharCargaTransform(8);
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            });
            return;
        }
        // BUGFIX: Agora o ataque do raio do jogador aciona a animação correta!
        if (nomeAtk.includes("raio")) {
            resolverEsquiva(inimigo, ataque);
            animarRaio(true, () => {
                let danoFinal = ataque.dano;
                if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                ganharCargaTransform(8);
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            });
            return;
        }
        if (nomeAtk.includes("expansão") || nomeAtk.includes("expansao")) {
            if (dominioRodadasRestantes > 0) {
                document.getElementById("texto").textContent = "Expansão já ativa!";
                document.getElementById("texto").style.color = "#ff0055";
                setTimeout(() => { document.getElementById("texto").textContent = ""; }, 1200);
                liberarSkills();
                return;
            }
            iniciarMinigameDominio();
            return;
        }
        if (nomeAtk.includes("corte") || nomeAtk.includes("world")) {
            resolverEsquiva(inimigo, ataque);
            animarCorte();
            setTimeout(() => efeitoDano(), 150);
            let danoFinal = ataque.dano;
            if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
            aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
            ganharCargaTransform(8);
            setTimeout(() => {
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            }, 200);
        } else if (nomeAtk.includes("cleave")) {
            resolverEsquiva(inimigo, ataque);
            animarCleave(true);
            let danoFinal = ataque.dano;
            if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
            aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
            ganharCargaTransform(60);
            setTimeout(() => {
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            }, 250);
        } else if (nomeAtk.includes("fuga")) {
            resolverEsquiva(inimigo, ataque);
            animarFuga(true, () => {
                let danoFinal = ataque.dano;
                if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                ganharCargaTransform(8);
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            });
        } else {
            resolverEsquiva(inimigo, ataque);
            document.getElementById("texto").textContent = `${jogador.nome} usou ${ataque.nome}!`;
            setTimeout(() => {
                document.getElementById("texto").textContent = "";
                efeitoDano();
                let danoFinal = ataque.dano;
                if (modoMegunaCPU === "adaptacao") danoFinal = registrarAdaptacaoCPU(ataque.nome, danoFinal);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(inimigo, danoFinal, jogador);
                aplicarEfeitoNoAlvo(inimigo, ataque, acertou);
                ganharCargaTransform(8);
                atualizarVidaCPU();
                if (!verificarFimDeJogo()) passarTurno();
            }, 400);
        }
    }
}

function turnoCPU() {
    if (jogoFinalizado) return;
    if (verificarFimDeJogo()) return;

    // SISTEMA DE STUN DA CPU CORRIGIDO
    if (inimigo.status && inimigo.status.atordoado) {
        inimigo.status.stunRodadas--; // Diminui o tempo do atordoamento
        
        if(inimigo.status.stunRodadas <= 0) {
            inimigo.status.atordoado = false;
            imgCPU.classList.remove("caido"); // Levanta a CPU quando o stun acaba
        }

        atualizarStatusBadges();
        mostrarTextoFlutuante("ATORDOADO!", false, "#ffcc00");
        mostrarTextoAtaque(`${inimigo.nome} está atordoado e perde a vez!`, "#ffcc00");
        
        // Passa o turno de volta para o jogador
        setTimeout(() => {
            limparTextoAtaque();
            jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
            inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);
            atualizarEnergia();
            atualizarEnergiaCPU();
            if (!verificarFimDeJogo()) { 
                turno = "jogador"; 
                liberarSkills(); 
            }
        }, 1100);
        
        return; // Sai da função para a CPU não atacar!
    }
    aplicarRegeneracaoPassiva(inimigo, false);
    atualizarStatusBadges();
    // NOVO: passiva de regeneração (Sukuna) no início do turno da CPU
    aplicarRegeneracaoPassiva(inimigo, false);
    atualizarStatusBadges();
    
    // ... (o resto da função continua exatamente igual a partir daqui: let forma = inimigo.formaAtual; etc)
    let forma = inimigo.formaAtual;
    let ataques = inimigo.formas[forma].ataques;
    let formas = Object.keys(inimigo.formas);
    let indexAtual = formas.indexOf(forma);
    let vidaPercent = inimigo.vida / inimigo.formas[forma].vidaMax;
    let custoTransformacao = ataques.find(a => a.tipo === "transformacao")?.custo || 50;

    let podeTransformar = indexAtual < formas.length - 1 && inimigo.energia >= custoTransformacao;
    let deveTransformar = false;

    let expansaoCPU = ataques.find(a => 
        (a.nome.toLowerCase().includes("expansão") || a.nome.toLowerCase().includes("expansao")) &&
        inimigo.energia >= a.custo
    );

    if (dominioRodadasRestantes > 0) {
        aplicarCorteDominio();
        if (verificarFimDeJogo()) return;
    }

    if (expansaoCPU && dominioRodadasRestantes <= 0) {
        let chance = Math.random();
        let usarExpansao = false;
        let tipoExpansao = null;

        if (chance < 0.20) {
            usarExpansao = true;
            tipoExpansao = "suprema";
        } else if (chance < 0.40) {
            usarExpansao = true;
            tipoExpansao = "mediana";
        } else if (chance < 1.0) {
            if (Math.random() < 0.3) {
                usarExpansao = true;
                tipoExpansao = "fraca";
            }
        }

        if (usarExpansao) {
            inimigo.energia -= expansaoCPU.custo;
            atualizarEnergiaCPU();
            donoDominio = "cpu";
            if (tipoExpansao === "suprema") {
                dominioRodadasRestantes = 4;
                danoExtraPorRodada = 8;
                document.getElementById("texto").textContent = `${inimigo.nome}: FORTE!`;
                document.getElementById("texto").style.color = "red";
            } else if (tipoExpansao === "mediana") {
                dominioRodadasRestantes = 3;
                danoExtraPorRodada = 6;
                document.getElementById("texto").textContent = `${inimigo.nome}: MEDIA`;
                document.getElementById("texto").style.color = "#BD4F4F";
            } else {
                dominioRodadasRestantes = 1;
                danoExtraPorRodada = 4;
                document.getElementById("texto").textContent = `${inimigo.nome}: FRACA...`;
                document.getElementById("texto").style.color = "#aaa";
            }

            ativarSantuario();

            setTimeout(() => {
                document.getElementById("texto").textContent = "";
                mostrarSkills();
                turno = "jogador";
                liberarSkills();
            }, 2000);

            jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
            inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);
            atualizarEnergia();
            atualizarEnergiaCPU();
            return;
        }
    }

    if (podeTransformar) {
        if (vidaPercent < 0.6 || Math.random() < 0.3) {
            deveTransformar = true;
        }
    }

    if (deveTransformar) {
        let proximaForma = formas[indexAtual + 1];
        inimigo.energia -= custoTransformacao;

        let energiaAnteriorMax = inimigo.energiaMax;
        inimigo.formaAtual = proximaForma;
        let novaForma = inimigo.formas[proximaForma];

        inimigo.vidaMax = novaForma.vidaMax;
        inimigo.vida = inimigo.vidaMax;
        inimigo.energiaMax = novaForma.energiaMax || energiaAnteriorMax;

        let bonusEnergia = inimigo.energiaMax - energiaAnteriorMax;
        inimigo.energia = Math.min(inimigo.energia + bonusEnergia, inimigo.energiaMax);

        imgCPU.src = novaForma.img;
        if (inimigo.formaAtual === formas[formas.length - 1]) {
            mostrarSkills();
        }

        jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
        inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);

        atualizarVidaCPU();
        atualizarEnergiaCPU();
        atualizarEnergia();

        turno = "jogador";
        liberarSkills();
        return;
    }

    let ataquesPossiveis = ataques.filter(a => 
        a.tipo !== "transformacao" && 
        inimigo.energia >= a.custo &&
        !a.nome.toLowerCase().includes("expansão") &&
        !a.nome.toLowerCase().includes("expansao")
    );

    if (ataquesPossiveis.length === 0) {
        jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
        inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);
        atualizarEnergia();
        atualizarEnergiaCPU();
        turno = "jogador";
        liberarSkills();
        return;
    }

    let melhorAtaque = ataquesPossiveis.reduce((melhor, atual) => {
        return (atual.dano > melhor.dano) ? atual : melhor;
    });

    let ataque = Math.random() < 0.8 ? melhorAtaque : ataquesPossiveis[Math.floor(Math.random() * ataquesPossiveis.length)];

    if (ataque.custo > 0) inimigo.energia -= ataque.custo;

    // Mecânicas automáticas (recoil, cura, roubo de energia, foco, buffs de esquiva...)
    aplicarMecanicaAutoBuff(inimigo, ataque);

    // Cegueira: chance do próprio golpe da CPU sair errado
    let statusTurnoCPU = ticarStatusAntesDoAtaque(inimigo);
    if (statusTurnoCPU.cego) {
        jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
        inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);
        atualizarEnergia();
        atualizarEnergiaCPU();
        mostrarTextoAtaque(`${inimigo.nome} está cego e o golpe saiu errado!`, "#aa66ff");
        setTimeout(() => {
            limparTextoAtaque();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        }, 900);
        return;
    }

    jogador.energia = Math.min(jogador.energia + 25, jogador.energiaMax);
    inimigo.energia = Math.min(inimigo.energia + 25, inimigo.energiaMax);
    atualizarEnergiaCPU();

    let nomeAtk = ataque.nome.toLowerCase();

    if (nomeAtk === "mahoraga") {
        decidirEstrategiaMegunaCPU();
        setTimeout(() => {
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        }, 1600);
        return;
    }

    if (nomeAtk.includes("corte") || nomeAtk.includes("world")) {
        resolverEsquiva(jogador, ataque);
        animarCorteCPU();
        setTimeout(() => efeitoDanoJogador(), 300);
        setTimeout(() => {
            let danoFinal = ataque.dano;
            if (modoMeguna === "adaptacao") {
                danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
            }
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
            aplicarEfeitoNoAlvo(jogador, ataque, acertou);
            ganharCargaTransform(12);
            atualizarVida();
            atualizarEnergia();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        }, 600);
    } else if (nomeAtk.includes("cleave")) {
        resolverEsquiva(jogador, ataque);
        animarCleave(false);
        setTimeout(() => {
            let danoFinal = ataque.dano;
            if (modoMeguna === "adaptacao") {
                danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
            }
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
            aplicarEfeitoNoAlvo(jogador, ataque, acertou);
            ganharCargaTransform(12);
            atualizarVida();
            atualizarEnergia();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        }, 500);
    } else if (nomeAtk.includes("fuga")) {
        resolverEsquiva(jogador, ataque);
        animarFuga(false, () => {
            let danoFinal = ataque.dano;
            if (modoMeguna === "adaptacao") {
                danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
            }
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
            aplicarEfeitoNoAlvo(jogador, ataque, acertou);
            ganharCargaTransform(12);
            atualizarVida();
            atualizarEnergia();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        });
    } else if (nomeAtk.includes("agito")) {
        resolverEsquiva(jogador, ataque);
        animarAgito(false, () => {
            let danoFinal = ataque.dano;
            if (modoMeguna === "adaptacao") {
                danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
            }
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
            aplicarEfeitoNoAlvo(jogador, ataque, acertou);
            ganharCargaTransform(12);
            atualizarVida();
            atualizarEnergia();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        });
   } else {
        let nomeAtkCPU = ataque.nome.toLowerCase();

        // Canvas VFX for Goku and Midoriya CPU attacks!
        if (inimigo.nome.toLowerCase() === "goku" || inimigo.nome.toLowerCase() === "midoriya") {
            resolverEsquiva(jogador, ataque);
            mostrarTextoAtaque(`${inimigo.nome} usou ${ataque.nome}!`, "#ff4444");
            
            let callbackDano = () => {
                limparTextoAtaque();
                let danoFinal = ataque.dano || 0;
                if (modoMeguna === "adaptacao") danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
                aplicarEfeitoNoAlvo(jogador, ataque, acertou);
                ganharCargaTransform(12);
                atualizarVida();
                atualizarEnergia();
                if (modoMeguna === "mahoraga") ataqueMahoraga();
                if (modoMegunaCPU === "mahoraga") ataqueMahoragaCPU();
                if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
            };
            
            if (inimigo.nome.toLowerCase() === "goku") {
                animarAtaqueGoku(false, nomeAtkCPU, callbackDano);
            } else {
                animarAtaqueMidoriyaCPU(nomeAtkCPU, callbackDano);
            }
            return;
        }

        if (nomeAtkCPU.includes("raio")) {
            mostrarTextoAtaque(`${inimigo.nome} usou ${ataque.nome}!`, "#ff4444");
            resolverEsquiva(jogador, ataque);
            animarRaio(false, () => {
                let danoFinal = ataque.dano;
                if (modoMeguna === "adaptacao") danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
                let acertou = !ultimaEsquiva;
                danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
                aplicarEfeitoNoAlvo(jogador, ataque, acertou);
                ganharCargaTransform(12);
                atualizarVida();
                atualizarEnergia();
                if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
            });
            return;
        }

        // Ataque genérico — cobre também os golpes do Midoriya quando jogados pela CPU
        // (a animação exclusiva dele é sob medida para o lado do jogador, mas as
        // mecânicas de dano/esquiva/efeitos já rodaram acima via aplicarMecanicaAutoBuff)
        resolverEsquiva(jogador, ataque);
        mostrarTextoAtaque(`${inimigo.nome} usou ${ataque.nome}!`, "#ff4444");
        setTimeout(() => {
            limparTextoAtaque();
            efeitoDanoJogador();
            let danoFinal = ataque.dano;
            if (modoMeguna === "adaptacao") danoFinal = registrarAdaptacao(ataque.nome, ataque.dano);
            let acertou = !ultimaEsquiva;
            danoFinal = aplicarDanoSeAcertou(jogador, danoFinal, inimigo);
            aplicarEfeitoNoAlvo(jogador, ataque, acertou);
            ganharCargaTransform(12);
            atualizarVida();
            atualizarEnergia();

            // ❌ A linha aplicarCorteDominio(); que ficava aqui foi removida para não atacar e gastar turno em dobro!
            
            if (modoMeguna === "mahoraga") ataqueMahoraga();
            if (modoMegunaCPU === "mahoraga") ataqueMahoragaCPU();
            if (!verificarFimDeJogo()) { turno = "jogador"; liberarSkills(); }
        }, 800);
    }
}


function atualizarEnergia() {
    let percent = (jogador.energia / jogador.energiaMax) * 100;
    document.getElementById("energiaJogador").style.width = percent + "%";
    document.getElementById("energiaTexto").innerHTML = `<small>ENERGIA</small> ${Math.floor(jogador.energia)}/${jogador.energiaMax}`;
}

function atualizarEnergiaCPU() {
    let percent = (inimigo.energia / inimigo.energiaMax) * 100;
    document.getElementById("energiaCPU").style.width = percent + "%";
    document.getElementById("energiaTextoCPU").innerHTML = `<small>ENERGIA</small> ${Math.floor(inimigo.energia)}/${inimigo.energiaMax}`;
}

function verificarFimDeJogo() {
    if (!jogador || !inimigo) return false;

    // Se o inimigo morrer
    if (inimigo.vida <= 0) {
        inimigo.vida = 0;
        jogoFinalizado = true;
        modoMeguna = null;
        modoMegunaCPU = null;
        
        // Remove a classe "caido" de ambos para que voltem à pose normal
        imgCPU.classList.remove("caido");
        imgJogador.classList.remove("caido");

        let mahoraga = document.getElementById("mahoraga");
        if (mahoraga) mahoraga.remove();
        let mahoragaCPU = document.getElementById("mahoragaCPU");
        if (mahoragaCPU) mahoragaCPU.remove();

        adaptacaoInfo = { usoMesmoAtaque: {}, nivel: 0 };
        adaptacaoInfoCPU = { usoMesmoAtaque: {}, nivel: 0 };
        mostrarResultado("🏆 VOCÊ GANHOU!");
        return true;
    }

    // Se o jogador morrer
    if (jogador.vida <= 0) {
        jogador.vida = 0;
        jogoFinalizado = true;
        modoMeguna = null;
        modoMegunaCPU = null;

        // Remove a classe "caido" de ambos
        imgCPU.classList.remove("caido");
        imgJogador.classList.remove("caido");

        let mahoraga = document.getElementById("mahoraga");
        if (mahoraga) mahoraga.remove();
        let mahoragaCPU = document.getElementById("mahoragaCPU");
        if (mahoragaCPU) mahoragaCPU.remove();

        adaptacaoInfo = { usoMesmoAtaque: {}, nivel: 0 };
        adaptacaoInfoCPU = { usoMesmoAtaque: {}, nivel: 0 };
        mostrarResultado("💀 VOCÊ PERDEU!");
        return true;
    }
    return false;
}

function mostrarResultado(texto) {
    let tela = document.getElementById("texto");
    tela.textContent = texto;

    if (texto.includes("GANHOU")) {
        tela.style.color = "lime";
    } else {
        tela.style.color = "red";
    }

    turno = "fim";
    setTimeout(resetarJogo, 2000);
}

function resetarJogo() {
    resetarTexto();   
    let mahoraga = document.getElementById("mahoraga");
    if (mahoraga) mahoraga.remove();
    let mahoragaCPU = document.getElementById("mahoragaCPU");
    if (mahoragaCPU) mahoragaCPU.remove();

    modoMeguna = null;
    modoMegunaCPU = null;
    adaptacaoInfo = { usoMesmoAtaque: {}, nivel: 0 };
    adaptacaoInfoCPU = { usoMesmoAtaque: {}, nivel: 0 };
    jogoFinalizado = false;
    turno = "jogador";
    liberarSkills();
    barraTransform = 0;
    document.getElementById("barraTransformContainer").style.display = "none";

    let santuario = document.getElementById('santuarioFundo');
    if (santuario) santuario.remove();

    dominioRodadasRestantes = 0;
    danoExtraPorRodada = 0;
    jogador = null;
    inimigo = null;
    atualizarStatusBadges();
    document.getElementById("texto").textContent = "";
    arena.style.display = "none";
    selecao.style.display = "flex";
}

/* =========================================================
   INTERCEPTADOR DE MINIGAMES
========================================================= */
function iniciarMinigame() {
    turno = "minigame";
    document.getElementById("skills").style.pointerEvents = "none";
    
    // Roteamento Cinematográfico para Sukuna
    if (jogador.nome.toLowerCase() === "sukuna") {
        if (jogador.formaAtual === "base") {
            playCutscene("meguna_intro", () => {
                document.getElementById("minigame").style.display = "block";
                document.getElementById("minigame").innerHTML = ""; // Limpa HUD
                mostrarFraseLenta(dialogos.meguna.intro, 2, () => {
                    iniciarMinigameMental();
                });
            });
            return;
        } 
        else if (jogador.formaAtual === "meguna") {
            playCutscene("heian_intro", () => {
                mostrarFraseLenta(dialogos.heian.intro, 2, () => {
                    iniciarMinigameSelos();
                });
            });
            return;
        }
    }
    if (jogador.nome.toLowerCase() === "midoriya") {
        if (jogador.formaAtual === "base") {
            iniciarMinigameMicroondas();
            return;
        } else if (jogador.formaAtual === "fullcowl") {
            iniciarMinigameEsmagamento();
            return;
        } else if (jogador.formaAtual === "oneforall100") {
            iniciarMinigameVestigios();
            return;
        }
    }

    // Lógica Clássica para Goku / Midoriya
    let tela = document.getElementById("minigame");
    tela.innerHTML = "";
    let contador = document.createElement("h1");
    contador.id = "contador";
    tela.appendChild(contador);
    tela.style.display = "block";

    let tempo = 3;
    contador.textContent = tempo;
    let intervalo = setInterval(() => {
        tempo--;
        if(tempo > 0){ contador.textContent = tempo; } 
        else {
            clearInterval(intervalo);
            contador.textContent = "VAI!";
            setTimeout(() => { contador.textContent = ""; criarBolinhas(); }, 500);
        }
    }, 1000);
}

/* =========================================================
   TRANSFORMAÇÃO 1: BATALHA MENTAL (SUKUNA -> MEGUNA)
========================================================= */
let totalBolinhasMental = 0;
let errosMental = 0;

function iniciarMinigameMental() {
    let tela = document.getElementById("minigame");
    tela.style.display = "block";
    tela.innerHTML = "";
    errosMental = 0;

    let quantidade = 10;
    bolinhasRestantes = quantidade;
    totalBolinhasMental = quantidade;

    for(let i = 0; i < quantidade; i++){
        let bolinha = document.createElement("div");
        bolinha.classList.add("bolinha");
        bolinha.style.top = Math.random() * 80 + 10 + "%";
        bolinha.style.left = Math.random() * 80 + 10 + "%";
        
        // Efeito de pulso sombrio na bolinha
        bolinha.style.boxShadow = "0 0 15px darkred";
        bolinha.style.backgroundColor = "#500";

        bolinha.onclick = () => {
            aplicarEfeito("shake-leve");
            bolinha.remove();
            bolinhasRestantes--;
            
            let progresso = 1 - (bolinhasRestantes / totalBolinhasMental);
            
            if(bolinhasRestantes === 1) {
                exibirDialogoFlutuante(pegarFraseAleatoria(dialogos.meguna.quase), "sukuna");
            } else if (progresso === 0.2 || progresso === 0.4 || progresso === 0.6 || progresso === 0.8) {
                exibirDialogoFlutuante(dialogos.meguna.progresso[Math.floor(progresso*10/2)-1], "sukuna");
            }

            if(bolinhasRestantes === 0){
                clearTimeout(tempoMinigame);
                sucessoTransformacaoCinematica("meguna");
            }
        };
        tela.appendChild(bolinha);
    }
    
    // Penalidade por lentidão/erro
    let verificadorErros = setInterval(() => {
        if(bolinhasRestantes === 0 || turno !== "minigame") {
            clearInterval(verificadorErros); return;
        }
        errosMental++;
        aplicarEfeito("shake-forte");
        if(errosMental > 3) {
            exibirDialogoFlutuante(pegarFraseAleatoria(dialogos.meguna.erroMegumi), "megumi");
        } else {
            exibirDialogoFlutuante(pegarFraseAleatoria(dialogos.meguna.erroSukuna), "sukuna");
        }
    }, 2500);

    tempoMinigame = setTimeout(() => { falhaTransformacaoCinematica("meguna"); }, 12000);
}

/* =========================================================
   TRANSFORMAÇÃO 2: O DESPERTAR (MEGUNA -> HEIAN)
========================================================= */
let cliquesSelo = 0;
let maxCliquesSelo = 15;


/* =========================================================
   CONFIGURAÇÕES DA FORMA HEIAN (BALANCEAMENTO)
========================================================= */
const heianConfig = {
    // --- PUNIÇÕES ---
    hpPerdidoPorErro: 3,           // Quantidade de HP perdido ao errar (antes era 5)
    energiaPerdidaPorErro: 3,      // Quantidade de energia perdida ao errar (antes era 5)
    numeroMaximoFalhas: 10,        // Quantos erros o jogador pode cometer antes da transformação falhar (antes era 7)
    
    // --- PROGRESSÃO DE DIFICULDADE (Cliques necessários para avançar de fase) ---
    progressoFase2: 12,            // Cliques necessários para chegar na Fase 2
    progressoFase3: 25,            // Cliques necessários para chegar na Fase 3
    progressoSeloSupremo: 35,      // Cliques necessários para ativar o Selo Supremo

    // --- FASE 1: INÍCIO (Fácil) ---
    fase1TempoSpawn: 1200,         // Tempo (ms) para aparecer uma nova rachadura
    fase1TempoVida: 1500,          // Tempo (ms) que a rachadura fica na tela antes de sumir (seu tempo de reação)
    fase1ChanceFalsa: 0.0,         // Chance (0 a 1) de nascer uma rachadura falsa (roxa)

    // --- FASE 2: DESPERTAR (Médio) ---
    fase2TempoSpawn: 1000,         // Rachaduras surgem um pouco mais rápido
    fase2TempoVida: 1300,          // O tempo de reação diminui levemente
    fase2ChanceFalsa: 0.15,        // 15% de chance de rachadura falsa (antes era 30%)

    // --- FASE 3: CAOS (Difícil) ---
    fase3TempoSpawn: 700,          // Surgem muito rápido
    fase3TempoVida: 1000,          // Pouco tempo para clicar (1 segundo)
    fase3ChanceFalsa: 0.25,        // 25% de chance de rachadura falsa (antes era 50%)

    // --- SELO SUPREMO (Fase Final) ---
    supremoVidaMax: 100,           // Resistência total do Selo Supremo
    supremoDanoPorClique: 10,      // Dano por clique. (100 / 10 = 10 cliques exigidos). Antes exigia 20 cliques.
    supremoRegenTick: 600,         // Tempo (ms) para o selo recuperar resistência (mais lento agora)
    supremoRegenValor: 1,          // Quanto de resistência o selo recupera por Tick
    supremoSpawnFalsas: 700        // Tempo (ms) que aparecem rachaduras falsas para atrapalhar
};

/* =========================================================
   TRANSFORMAÇÃO 2: O DESPERTAR (MEGUNA -> HEIAN) - MODO CAOS
========================================================= */
let heianFase = 1;
let heianErros = 0;
let heianProgresso = 0;
let heianLoopSpawn;
let heianRegenSupremo;
let heianVidaSupremo = heianConfig.supremoVidaMax;

/* =========================================================
   CONFIGURAÇÕES VISUAIS E ÁUDIO DO SELO (NOVO)
   Onde encontrar: Modifique os caminhos e valores aqui para 
   alterar as imagens e sons do minigame.
========================================================= */
const seloConfig = {
    // Array com as imagens verdadeiras (você pode colocar quantas quiser)
    imagensRachaduras: [
        "img/rachadura.png", 
    ],
    // Imagem da rachadura falsa
    imagemRachaduraFalsa: "img/bandeid.png",
    
    // Efeitos Sonoros
   
    
    // Controle visual de tamanho das imagens
    tamanhoMinimoRachadura: 80,
    tamanhoMaximoRachadura: 180,
};

/* =========================================================
   1. CRIAÇÃO DO SELO (MODULARIZADO)
========================================================= */
function iniciarMinigameSelos() {
    let container = document.getElementById("minigame-selos");
    if(!container) {
        container = document.createElement("div");
        container.id = "minigame-selos";
        document.body.appendChild(container);
    }
    
    container.style.display = "flex";
    container.className = ""; 
    
    // Constrói o Selo Retangular com a camada de dano e texto
    container.innerHTML = `
        <div id="selo-heian-central" class="selo-heian-retangular">
            <div id="camada-dano" class="camada-dano"></div>
            <div class="texto-selo">SELO</div>
        </div>
    `;
    
    heianFase = 1;
    heianErros = 0;
    heianProgresso = 0;
    heianVidaSupremo = heianConfig.supremoVidaMax;
    
    loopRachadurasHeian();
}

/* =========================================================
   2. EFEITOS SONOROS (MODULARIZADO)
========================================================= */



/* =========================================================
   3. CRIAÇÃO DAS RACHADURAS (IMAGENS DINÂMICAS)
========================================================= */
function criarRachadura(tempoVida, chanceFalsa) {
    let selo = document.getElementById("selo-heian-central");
    if (!selo) return;

    let isFalsa = Math.random() < chanceFalsa;
    
    // Criar o elemento de imagem
    let rachadura = document.createElement("img");
    rachadura.classList.add("rachadura-clicavel");
    
    // Atribuir a imagem correta a partir do seloConfig
    let imgSorteada = isFalsa ? seloConfig.imagemRachaduraFalsa : pegarFraseAleatoria(seloConfig.imagensRachaduras);
    rachadura.src = imgSorteada;
    if (isFalsa) rachadura.classList.add("rachadura-falsa-img");

    // Sorteia tamanho, posição e rotação
    let tamanho = seloConfig.tamanhoMinimoRachadura + Math.random() * (seloConfig.tamanhoMaximoRachadura - seloConfig.tamanhoMinimoRachadura);
    rachadura.style.width = tamanho + "px";
    
    let leftPos = (10 + Math.random() * 80) + "%";
    let topPos = (10 + Math.random() * 80) + "%";
    let transformRotation = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
    
    rachadura.style.left = leftPos;
    rachadura.style.top = topPos;
    rachadura.style.transform = transformRotation;

    let clicada = false;

    rachadura.onclick = () => {
        if(clicada) return;
        clicada = true;
        rachadura.remove();

        if (isFalsa) {
            penalizarHeian("Clicou na falsa!");
        } else {
            heianProgresso++;
            
            aplicarEfeito("shake-leve");
            
            // INTENSIDADE: Se estiver perto de quebrar, brilha mais
            if(heianProgresso > heianConfig.progressoFase3) {
                selo.style.boxShadow = `0 0 ${40 + heianProgresso}px rgba(255, 0, 0, 0.8)`;
            }

            // O carimbo visual permanente!
            adicionarRachaduraVisual(imgSorteada, leftPos, topPos, transformRotation, tamanho);
        }
    };

    selo.appendChild(rachadura);

    setTimeout(() => {
        if (!clicada && rachadura.parentNode) {
            rachadura.remove();
            if (!isFalsa) penalizarHeian("Deixou a verdadeira sumir!");
        }
    }, tempoVida);
}

/* =========================================================
   3.1 LOOP DE SPAWN DAS RACHADURAS (FALTAVA - CAUSAVA O ERRO)
   Essa função é chamada por iniciarMinigameSelos() e é responsável
   por ficar criando rachaduras (criarRachadura) em intervalos,
   avançando de fase conforme heianProgresso aumenta, até chegar
   no Selo Supremo.
========================================================= */
function loopRachadurasHeian() {
    // Se o jogo já acabou ou o minigame foi fechado, para o loop
    let container = document.getElementById("minigame-selos");
    if (!container || container.style.display === "none" || jogoFinalizado) {
        clearTimeout(heianLoopSpawn);
        return;
    }

    let tempoSpawn, tempoVida, chanceFalsa;

    if (heianProgresso >= heianConfig.progressoSeloSupremo) {
        // Chegou ao fim das 3 fases: inicia o Selo Supremo e para este loop
        clearTimeout(heianLoopSpawn);
        iniciarSeloSupremo();
        return;
    } else if (heianProgresso >= heianConfig.progressoFase3) {
        heianFase = 3;
        tempoSpawn = heianConfig.fase3TempoSpawn;
        tempoVida = heianConfig.fase3TempoVida;
        chanceFalsa = heianConfig.fase3ChanceFalsa;
    } else if (heianProgresso >= heianConfig.progressoFase2) {
        heianFase = 2;
        tempoSpawn = heianConfig.fase2TempoSpawn;
        tempoVida = heianConfig.fase2TempoVida;
        chanceFalsa = heianConfig.fase2ChanceFalsa;
    } else {
        heianFase = 1;
        tempoSpawn = heianConfig.fase1TempoSpawn;
        tempoVida = heianConfig.fase1TempoVida;
        chanceFalsa = heianConfig.fase1ChanceFalsa;
    }

    criarRachadura(tempoVida, chanceFalsa);

    heianLoopSpawn = setTimeout(loopRachadurasHeian, tempoSpawn);
}

/* =========================================================
   3.2 PENALIDADE DO MINIGAME HEIAN (FALTAVA - CAUSAVA O ERRO)
   Chamada quando o jogador clica numa rachadura falsa ou deixa
   uma verdadeira sumir. Aplica dano/perda de energia e, se
   atingir o número máximo de falhas, cancela a transformação.
========================================================= */
function penalizarHeian(motivo) {
    heianErros++;

    jogador.vida -= heianConfig.hpPerdidoPorErro;
    jogador.energia -= heianConfig.energiaPerdidaPorErro;
    if (jogador.vida < 0) jogador.vida = 0;
    if (jogador.energia < 0) jogador.energia = 0;

    atualizarVida();
    atualizarEnergia();
    aplicarEfeito("flash");
    exibirDialogoFlutuante(motivo, "megumi");

    if (heianErros >= heianConfig.numeroMaximoFalhas) {
        clearTimeout(heianLoopSpawn);
        clearInterval(heianRegenSupremo);
        falhaTransformacaoCinematica("heian");
    }
}

/* =========================================================
   4. SISTEMA DE DANO VISUAL PERMANENTE
========================================================= */
function adicionarRachaduraVisual(src, left, top, transform, tamanho) {
    let camada = document.getElementById("camada-dano");
    if (!camada) return;

    // Cria uma cópia estática da rachadura para simular destruição contínua
    let cicatriz = document.createElement("img");
    cicatriz.src = src;
    cicatriz.style.position = "absolute";
    cicatriz.style.left = left;
    cicatriz.style.top = top;
    cicatriz.style.width = tamanho + "px";
    cicatriz.style.transform = transform;
    cicatriz.style.opacity = "0.8"; // Levemente opaca para compor o fundo
    cicatriz.style.pointerEvents = "none";
    
    camada.appendChild(cicatriz);
}

/* =========================================================
   5. DESTRUIÇÃO DO SELO (ANIMAÇÃO FINAL)
========================================================= */
function animarDestruicaoSelo(callbackCinematica) {
    let selo = document.getElementById("selo-heian-central");
    if(!selo) { callbackCinematica(); return; }

    
    aplicarEfeito("shake-epico");

    // Limpa os textos e imagens de dentro, tira o fundo
    selo.innerHTML = "";
    selo.style.background = "transparent";
    selo.style.border = "none";
    selo.style.boxShadow = "none";

    // Gera 40 pedaços voando para todo lado
    for(let i = 0; i < 40; i++) {
        let frag = document.createElement("div");
        frag.classList.add("fragmento-selo");
        frag.style.width = (20 + Math.random() * 40) + "px";
        frag.style.height = (20 + Math.random() * 40) + "px";
        frag.style.left = "50%";
        frag.style.top = "50%";
        
        let angulo = Math.random() * Math.PI * 2;
        let forca = 150 + Math.random() * 400; // Força da explosão
        
        frag.style.setProperty('--dx', (Math.cos(angulo) * forca) + 'px');
        frag.style.setProperty('--dy', (Math.sin(angulo) * forca) + 'px');
        frag.style.setProperty('--rot', (Math.random() * 720) + 'deg');

        selo.appendChild(frag);
    }

    aplicarEfeito("flash");

    // Espera os fragmentos sumirem, executa o silêncio e chama a cutscene
    setTimeout(() => {
        selo.remove();
        setTimeout(callbackCinematica, 1000); // 1 segundo de tela preta silenciosa
    }, 1200);
}

/* =========================================================
   6. ATUALIZAÇÃO: SELO SUPREMO E SUCESSO
========================================================= */
function iniciarSeloSupremo() {
    let selo = document.getElementById("selo-heian-central");
    selo.classList.add("selo-supremo-ativo-retangular");
    
    exibirDialogoFlutuante("DESTRUA O SELO SUPREMO!", "sukuna");
    aplicarEfeito("flash");

    heianVidaSupremo = heianConfig.supremoVidaMax;
    
    selo.onclick = () => {
        heianVidaSupremo -= heianConfig.supremoDanoPorClique;
        
        
        let visualDano = (heianConfig.supremoVidaMax - heianVidaSupremo);
        selo.style.boxShadow = `0 0 ${80 + visualDano}px red, inset 0 0 ${40 + visualDano}px red`;
        aplicarEfeito("shake-forte");

        // Adiciona um impacto massivo permanente ao clicar no próprio selo
        let imgSorteada = pegarFraseAleatoria(seloConfig.imagensRachaduras);
        adicionarRachaduraVisual(
            imgSorteada, 
            (20 + Math.random() * 60) + "%", 
            (20 + Math.random() * 60) + "%", 
            `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`, 
            seloConfig.tamanhoMaximoRachadura * 1.5 // Rachadura gigante
        );

        if (heianVidaSupremo <= 0) {
            clearInterval(heianRegenSupremo);
            selo.onclick = null;
            sucessoHeianCinematico();
        }
    };

    heianRegenSupremo = setInterval(() => {
        if (heianVidaSupremo > 0 && heianVidaSupremo < heianConfig.supremoVidaMax) {
            heianVidaSupremo += heianConfig.supremoRegenValor; 
            criarRachadura(heianConfig.supremoSpawnFalsas, 1.0); // Falsas voando para atrapalhar
        }
    }, heianConfig.supremoRegenTick);
}

function sucessoHeianCinematico() {
    let container = document.getElementById("minigame-selos");
    container.className = ""; // Para tremedeiras

    // Chama a nova função modular que estilhaça o selo
    animarDestruicaoSelo(() => {
        container.style.backgroundColor = "black";
        document.getElementById("texto").textContent = "O REI DAS MALDIÇÕES DESPERTOU";
        document.getElementById("texto").style.color = "red";
        
        aplicarEfeito("flash");
        
        setTimeout(() => {
            document.getElementById("texto").textContent = "";
            container.style.display = "none";
            
            playCutscene("heian_final", () => {
                tituloEpico("RYOMEN SUKUNA", "FORMA HEIAN", () => {
                    finalizarTransformacao();
                });
            });
        }, 2000);
    });
}

/* =========================================================
   SUCESSO E FALHA CINEMÁTICOS
========================================================= */
function sucessoTransformacaoCinematica(forma) {
    limparMinigame();
    document.getElementById("minigame-selos")?.style.setProperty("display", "none");
    
    if (forma === "meguna") {
        playCutscene("meguna_final", () => {
            tituloEpico("RYOMEN SUKUNA", "ASSUMIU O CONTROLE", () => {
                finalizarTransformacao();
            });
        });
    } 
    else if (forma === "heian") {
        document.getElementById("texto").textContent = "O REI DAS MALDIÇÕES DESPERTOU";
        document.getElementById("texto").style.color = "red";
        setTimeout(() => {
            document.getElementById("texto").textContent = "";
            playCutscene("heian_final", () => {
                tituloEpico("RYOMEN SUKUNA", "FORMA HEIAN", () => {
                    finalizarTransformacao();
                });
            });
        }, 3000);
    }
}

function falhaTransformacaoCinematica(forma) {
    limparMinigame();
    document.getElementById("minigame-selos")?.style.setProperty("display", "none");
    
    if (forma === "meguna") {
        exibirDialogoFlutuante(pegarFraseAleatoria(dialogos.meguna.falhaSukuna), "sukuna");
        setTimeout(() => exibirDialogoFlutuante(pegarFraseAleatoria(dialogos.meguna.falhaMegumi), "megumi"), 1500);
    } else {
        exibirDialogoFlutuante("Decepção...", "sukuna");
    }

    // Penalidade mecânica
    jogador.vida -= jogador.vida * 0.4;
    jogador.energia = Math.floor(jogador.energia * 0.3);
    atualizarVida();
    atualizarEnergia();
    
    setTimeout(() => {
        turno = "cpu";
        turnoCPU();
    }, 3000);
}

function finalizarTransformacao() {
    transformarJogador(); // Chama sua função original que muda stats e imagens
    atualizarVida();
    atualizarEnergia();
    mostrarSkills();
    
    turno = "cpu";
    setTimeout(turnoCPU, 1500);
}

// Mantendo a compatibilidade original para Goku/Midoriya
function criarBolinhas() {
    let tela = document.getElementById("minigame");
    let quantidade = 5 + (Object.keys(jogador.formas).indexOf(jogador.formaAtual) * 3);
    bolinhasRestantes = quantidade;

    for(let i = 0; i < quantidade; i++){
        let bolinha = document.createElement("div");
        bolinha.classList.add("bolinha");
        bolinha.style.top = Math.random() * 90 + "%";
        bolinha.style.left = Math.random() * 90 + "%";

        bolinha.onclick = () => {
            bolinha.remove();
            bolinhasRestantes--;
            if(bolinhasRestantes === 0){
                clearTimeout(tempoMinigame);
                limparMinigame();
                finalizarTransformacao(); // Pula as cutscenes para eles
            }
        };
        tela.appendChild(bolinha);
    }
    tempoMinigame = setTimeout(() => {
        limparMinigame();
        jogador.vida -= jogador.vida * 0.4;
        jogador.energia = Math.floor(jogador.energia * 0.3);
        atualizarVida(); atualizarEnergia();
        turno = "cpu"; setTimeout(turnoCPU, 1000);
    }, 10000);
}

function limparMinigame(){
    let tela = document.getElementById("minigame");
    tela.innerHTML = '<h1 id="contador"></h1>';
    tela.style.display = "none";
}

function transformarJogador(){
    let formas = Object.keys(jogador.formas);
    let indexAtual = formas.indexOf(jogador.formaAtual);
    let proximaForma = formas[indexAtual + 1];

    if(proximaForma){
        let energiaAnteriorMax = jogador.formas[jogador.formaAtual].energiaMax || jogador.energiaMax;
        jogador.formaAtual = proximaForma;

        let forma = jogador.formas[proximaForma];
        jogador.vidaMax = forma.vidaMax;
        jogador.vida = forma.vidaMax;

        let novaEnergiaMax = forma.energiaMax ?? energiaAnteriorMax;
        let bonusEnergia = novaEnergiaMax - energiaAnteriorMax;

        jogador.energiaMax = novaEnergiaMax;
        jogador.energia = Math.min(jogador.energia + Math.max(bonusEnergia, 0), jogador.energiaMax);

        imgJogador.src = forma.img;
        barraTransform = 0;
        atualizarBarraTransform();

        mostrarSkills();
        atualizarEnergia();
        atualizarVida();
    }
}

function definirEnergiaInicial(personagem) {
    let base = personagem.formas[personagem.formaAtual];
    let max = base.energiaMax || 100;
    personagem.energiaMax = max;
    personagem.energia = Math.floor(max * 0.6);
}

function setEnergia(personagem, porcentagem) {
    personagem.energia = Math.floor(personagem.energiaMax * porcentagem);
}

function animarCorte() {
    let to = getCharacterCenter(false);
    canvasVFX.fireSlash(to.x, to.y, 250, Math.PI / 4, 15, "#ff0055");
}

function efeitoDano() {
    if (ultimaEsquiva) {
        imgCPU.classList.add("esquivou");
        mostrarTextoFlutuante("ESQUIVOU!", false, "#00ffcc");
        setTimeout(() => { imgCPU.classList.remove("esquivou"); }, 400);
        return;
    }
    imgCPU.classList.add("hit");
    setTimeout(() => { imgCPU.classList.remove("hit"); }, 300);
}

function animarCorteCPU() {
    let to = getCharacterCenter(true);
    canvasVFX.fireSlash(to.x, to.y, 250, Math.PI / 4, 15, "#ff0055");
}

function efeitoDanoJogador() {
    if (ultimaEsquiva) {
        imgJogador.classList.add("esquivou");
        mostrarTextoFlutuante("ESQUIVOU!", true, "#00ffcc");
        setTimeout(() => { imgJogador.classList.remove("esquivou"); }, 400);
        return;
    }
    imgJogador.classList.add("hit");
    setTimeout(() => { imgJogador.classList.remove("hit"); }, 600);
}

btnCPU.addEventListener("click", () => {
    btnCPU.style.display = "none";
    selecao.style.display = "flex";
    vs.style.display = "none";
});

// O modo 1 vs 1 local ainda não foi implementado — avisa em vez de ficar sem reação.
vs.addEventListener("click", () => {
    mostrarAvisoModoIndisponivel();
});

/* --- SISTEMA DO ATTACK CLEAVE (CORTES MÚLTIPLOS) --- */
function animarCleave(isJogador) {
    let to = getCharacterCenter(!isJogador);
    animateSpriteDash(isJogador, () => {
        let count = 6;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let rx = to.x + (Math.random() - 0.5) * 80;
                let ry = to.y + (Math.random() - 0.5) * 80;
                let angle = Math.random() * Math.PI * 2;
                canvasVFX.fireSlash(rx, ry, 180, angle, 12, "#ff003c");
                if (isJogador) efeitoDano(); else efeitoDanoJogador();
            }, i * 60);
        }
    });
}

/* --- SISTEMA DO ATTACK FUGA --- */
function animarFuga(isJogador, callbackDano) {
    let from = getCharacterCenter(isJogador);
    let to = getCharacterCenter(!isJogador);
    canvasVFX.fireFugaArrow(from.x, from.y, to.x, to.y);
    setTimeout(() => {
        if (isJogador) efeitoDano(); else efeitoDanoJogador();
        callbackDano();
    }, 850);
}

function passarTurno() { // Corrigido de pasarTurno para passarTurno
    manterMeguna();
    if (!verificarFimDeJogo()) {
        bloquearSkills();
        turno = "cpu";
        setTimeout(turnoCPU, 800);
    }
}

function iniciarMinigameDominio() {
    turno = "minigame";
    qteRodando = true;
    acertosMecanica = 0;
    notasAtivas = [];

    let painel = document.getElementById('minigame-dominio');
    painel.style.display = 'flex';
    document.getElementById('notas-container').innerHTML = '';
    document.getElementById('qte-feedback').textContent = 'PREPARE-SE!';

    window.addEventListener('keydown', processarTeclaQTE);

    const totalNotas = 10;
    for (let i = 0; i < totalNotas; i++) {
        setTimeout(() => {
            if (qteRodando) criarNotaDominio(teclasValidas[Math.floor(Math.random() * teclasValidas.length)]);
        }, 800 + i * 500);
    }

    setTimeout(() => {
        if (qteRodando) finalizarMinigameDominio();
    }, 800 + totalNotas * 700 + 2000);
}

function criarNotaDominio(tecla) {
    let container = document.getElementById('notas-container');
    let nota = document.createElement('div');
    nota.classList.add('nota-dominio');
    nota.dataset.tecla = tecla;
    nota.textContent = iconesTeclas[tecla];
    nota.style.left = colunaTeclas[tecla];
    nota.style.top = '0px';
    container.appendChild(nota);

    let dados = { elemento: nota, tecla, top: 0, respondida: false };
    notasAtivas.push(dados);

    let intervalo = setInterval(() => {
        if (!qteRodando || dados.respondida) { clearInterval(intervalo); return; }

        dados.top += 7;
        nota.style.top = dados.top + 'px';

        if (dados.top > 430) {
            clearInterval(intervalo);
            nota.remove();
            notasAtivas = notasAtivas.filter(n => n !== dados);
            document.getElementById('qte-feedback').textContent = 'ERROU! ❌';
            document.getElementById('qte-feedback').style.color = 'red';
        }
    }, 20);
}

function processarTeclaQTE(e) {
    if (!qteRodando) return;
    if (!teclasValidas.includes(e.key)) return;
    e.preventDefault();

    let receptor = document.getElementById('receptor-' + e.key);
    if (receptor) {
        receptor.classList.add('ativo');
        setTimeout(() => receptor.classList.remove('ativo'), 150);
    }

    let notaAlvo = notasAtivas.find(n => n.tecla === e.key && !n.respondida);
    if (!notaAlvo) return;

    notaAlvo.respondida = true;
    notaAlvo.elemento.remove();
    notasAtivas = notasAtivas.filter(n => n !== notaAlvo);

    if (notaAlvo.top >= 330 && notaAlvo.top <= 410) {
        acertosMecanica++;
        document.getElementById('qte-feedback').textContent = 'PERFEITO! ✨';
        document.getElementById('qte-feedback').style.color = 'lime';
    } else if (notaAlvo.top >= 200 && notaAlvo.top < 330) {
        document.getElementById('qte-feedback').textContent = 'BOA! 👍';
        document.getElementById('qte-feedback').style.color = 'yellow';
    } else {
        document.getElementById('qte-feedback').textContent = 'ERROU! ❌';
        document.getElementById('qte-feedback').style.color = 'red';
    }
}

function finalizarMinigameDominio() {
    qteRodando = false;
    window.removeEventListener('keydown', processarTeclaQTE);
    let painel = document.getElementById('minigame-dominio');
    painel.style.display = 'none';
    calcularResultadoDominio();
}

function calcularResultadoDominio() {
    let textoCentral = document.getElementById('texto');
    donoDominio = "jogador";
    if (acertosMecanica >= 10) {
        dominioRodadasRestantes = 4;
        danoExtraPorRodada = 8;
        textoCentral.textContent = 'FORTE!';
        textoCentral.style.color = 'red';
    } else if (acertosMecanica >= 7) {
        dominioRodadasRestantes = 3;
        danoExtraPorRodada = 6;
        textoCentral.textContent = 'MEDIA';
        textoCentral.style.color = '#BD4F4F';
    } else {
        dominioRodadasRestantes = 1;
        danoExtraPorRodada = 4;
        textoCentral.textContent = 'FRACA';
        textoCentral.style.color = '#aaa';
    }

    setTimeout(() => {
        textoCentral.textContent = '';
        let gifMao = document.createElement('div');
        gifMao.style.cssText = `
            position:fixed; top:0; left:0; width:100vw; height:100vh;
            background:url('img/expansao.gif?v=${Date.now()}') center/cover no-repeat;
            z-index:9999; background-color:rgba(0,0,0,0.6);
        `;
        document.body.appendChild(gifMao);

        setTimeout(() => {
            gifMao.remove();
            ativarSantuario();
            textoCentral.style.color = 'white';
            textoCentral.textContent = 'EXPANSÃO DE DOMÍNIO!';

            setTimeout(() => {
                textoCentral.textContent = '';
                if (!verificarFimDeJogo()) passarTurno();
            }, 2000);
        }, 4500);
    }, 1200);
}

function ativarSantuario() { // CORRIGIDO: de activarSantuario para ativarSantuario
    let antigo = document.getElementById('santuarioFundo');
    if (antigo) antigo.remove();

    let cpuContainer = document.getElementById('cpuContainer');
    let arenaRect = arena.getBoundingClientRect();
    let cpuRect = cpuContainer.getBoundingClientRect();

    let left = cpuRect.left - arenaRect.left - 850;
    let top = cpuRect.top - arenaRect.top - 100;
    let width = cpuRect.width + 500;
    let height = cpuRect.height + 400;

    let fundo = document.createElement('div');
    fundo.id = 'santuarioFundo';
    fundo.classList.add('santuario-fundo');
    fundo.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        background: url('img/santuario.png') center/cover no-repeat;
        z-index: 4;
        opacity: 0;
        animation: surgirSuave 0.5s ease forwards;
        pointer-events: none;
        border-radius: 8px;
    `;
    arena.insertBefore(fundo, document.getElementById("cpuContainer"));
}

function gerenciarTurnoDominio() {
    if (dominioRodadasRestantes <= 0) return;

    jogador.vida -= danoExtraPorRodada;
    if (jogador.vida < 0) jogador.vida = 0;
    atualizarVida();
    dominioRodadasRestantes--;
    mostrarSkills();

    if (verificarFimDeJogo()) return;

    if (dominioRodadasRestantes <= 0) {
        let santuario = document.getElementById('santuarioFundo');
        if (santuario) {
            santuario.style.opacity = '0';
            setTimeout(() => santuario.remove(), 800);
        }
        document.getElementById('texto').textContent = 'O Santuário desmoronou...';
        document.getElementById('texto').style.color = '#888';
        setTimeout(() => { document.getElementById('texto').textContent = ''; }, 1500);
        return;
    }

    let feedback = document.getElementById('texto');
    feedback.textContent = `Santuário corta você! -${danoExtraPorRodada} HP`;
    feedback.style.color = '#ff3333';
    setTimeout(() => { feedback.textContent = ''; }, 1000);
}

function dispararTempestadeCleave() {
    let to = getCharacterCenter(donoDominio === "jogador" ? false : true);
    for (let i = 0; i < 25; i++) {
        setTimeout(() => {
            let rx = to.x + (Math.random() - 0.5) * 200;
            let ry = to.y + (Math.random() - 0.5) * 200;
            let angle = Math.random() * Math.PI * 2;
            canvasVFX.fireSlash(rx, ry, 150 + Math.random() * 150, angle, 10, "#ff003c");
            if (donoDominio === "jogador") efeitoDano(); else efeitoDanoJogador();
        }, i * 15);
    }
}

function aplicarCorteDominio() {
    if (dominioRodadasRestantes <= 0) return;
    dispararTempestadeCleave();

    if (donoDominio === "jogador") {
        inimigo.vida -= danoExtraPorRodada;
        if (inimigo.vida < 0) inimigo.vida = 0;
        atualizarVidaCPU();
    } else if (donoDominio === "cpu") {
        jogador.vida -= danoExtraPorRodada;
        if (jogador.vida < 0) jogador.vida = 0;
        atualizarVida();
    }

    dominioRodadasRestantes--;
    mostrarSkills();

    if (verificarFimDeJogo()) return;

    if (dominioRodadasRestantes <= 0) {
        let santuario = document.getElementById('santuarioFundo');
        if (santuario) {
            santuario.style.opacity = '0';
            setTimeout(() => santuario.remove(), 800);
        }
        donoDominio = null;
    }
}

function mostrarTextoAtaque(texto, cor = "#ffffff") {
    let tela = document.getElementById("texto");
    tela.textContent = texto;
    tela.style.color = cor;
}

function limparTextoAtaque() {
    let tela = document.getElementById("texto");
    tela.textContent = "";
    tela.style.color = "#ffffff";
}

let barraTransform = 0;
function getTransformMax() {
    return jogador.formas[jogador.formaAtual].custoTransform;
}

function temFormaParaTransformar() {
    if (!jogador) return false;
    let formas = Object.keys(jogador.formas);
    return formas.indexOf(jogador.formaAtual) < formas.length - 1;
}

function atualizarBarraTransform() {
    if (!temFormaParaTransformar()) {
        document.getElementById("barraTransformContainer").style.display = "none";
        return;
    }
    document.getElementById("barraTransformContainer").style.display = "block";
    let percent = (barraTransform / getTransformMax()) * 100;
    document.getElementById("barraTransform").style.width = percent + "%";
    document.getElementById("transformTexto").innerHTML = `<small>TRANSFORM</small> ${Math.floor(barraTransform)}/${getTransformMax()}`;
    mostrarSkills();
}

function ganharCargaTransform(quantidade) {
    if (!temFormaParaTransformar()) return;
    barraTransform = Math.min(barraTransform + quantidade, getTransformMax());
    atualizarBarraTransform();
}

function escolherModoMeguna(tipo) {
    modoMeguna = tipo;
    let tela = document.getElementById("texto");

    if (tipo === "mahoraga") {
        tela.textContent = "MAHORAGA INVOCADO!";
        criarMahoraga();
        iniciarModoMahoraga();
    }
    if (tipo === "adaptacao") {
        tela.textContent = "ADAPTAÇÃO ATIVADA!";
        imgJogador.src = "img/megunaroda.png";
        iniciarModoAdaptacao();
    }
    setTimeout(() => tela.textContent = "", 1500);
}

function iniciarModoAdaptacao() {
    adaptacaoInfo.usoMesmoAtaque = {};
    adaptacaoInfo.nivel = 0;
}

function registrarAdaptacao(nomeAtaque, danoOriginal) {
    if (modoMeguna !== "adaptacao") return danoOriginal;

    if (!adaptacaoInfo.usoMesmoAtaque[nomeAtaque]) {
        adaptacaoInfo.usoMesmoAtaque[nomeAtaque] = 1;
    } else {
        adaptacaoInfo.usoMesmoAtaque[nomeAtaque]++;
    }

    let usos = adaptacaoInfo.usoMesmoAtaque[nomeAtaque];
    let rags = 0;
    if (usos === 2) rags = 0.25;
    if (usos >= 3) rags = 0.5;

    if (rags > 0) {
        mostrarAdaptacao(nomeAtaque, rags);
    }
    return Math.floor(danoOriginal * (1 - rags));
}

function mostrarAdaptacao(ataque, reducao) {
    let tela = document.getElementById("texto");
    let percent = reducao * 100;

    tela.innerHTML = `🌀 ADAPTAÇÃO DE MAHORAGA<br><br>Ataque analisado:<br>${ataque}<br><brResistência adquirida:<br>${percent}%`;

    let roda = document.createElement("div");
    roda.classList.add("roda-mahoraga");
    document.getElementById("arena").appendChild(roda);

    setTimeout(() => { roda.classList.add("girando"); }, 50);
    setTimeout(() => {
        roda.remove();
        tela.innerHTML = "";
    }, 3000);
}

function iniciarModoMahoraga() {
    modoMeguna = "mahoraga";
}

function animarMahoragaAtaque() {
    let el = document.createElement("div");
    el.classList.add("mahoraga-hit");
    document.getElementById("arena").appendChild(el);
    setTimeout(() => el.remove(), 500);
}

function abrirEscolhaMahoraga(){
    turno = "escolha";
    document.getElementById("escolhaMahoraga").style.display = "flex";
}

function ativarOpcaoMahoraga(tipo) {
    document.getElementById("escolhaMahoraga").style.display = "none";
    escolherModoMeguna(tipo);
    setTimeout(() => { passarTurno(); }, 2000);
}

function manterMeguna() {
    if (!modoMeguna) return;
    jogador.energia -= 15;

    if (jogador.energia <= 0) {
        jogador.energia = 0;
        modoMeguna = null;

        let mahoraga = document.getElementById("mahoraga");
        if (mahoraga) mahoraga.remove();

        imgJogador.src = jogador.formas[jogador.formaAtual].img;
        adaptacaoInfo = { usoMesmoAtaque: {}, nivel: 0 };
        mostrarTextoAtaque("Mahoraga desapareceu!", "#ff4444");
    }
    atualizarEnergia();
    mostrarSkills();
}

/* --- ESTRATÉGIA DA CPU PARA O MEGUNA (Mahoraga vs Adaptação) ---
   Decide de forma "inteligente" e com uma porcentagem justa entre invocar o
   Mahoraga de verdade (igual o jogador faz) ou ativar a Adaptação.
   Quanto mais baixa a vida da CPU, maior a chance dela arriscar tudo no
   Mahoraga (que bate mais forte); com vida alta ela prefere se defender
   com a Adaptação. */
function decidirEstrategiaMegunaCPU() {
    let vidaPercentual = (inimigo.vida / inimigo.vidaMax) * 100;
    let chanceMahoraga = (vidaPercentual < 40) ? 70 : 30;

    if (Math.random() * 100 < chanceMahoraga) {
        modoMegunaCPU = "mahoraga";
        mostrarTextoAtaque(`${inimigo.nome} invocou MAHORAGA!`, "#ff4444");
        criarMahoragaCPU();
    } else {
        modoMegunaCPU = "adaptacao";
        adaptacaoInfoCPU = { usoMesmoAtaque: {}, nivel: 0 };
        mostrarTextoAtaque(`${inimigo.nome} ativou ADAPTAÇÃO!`, "#ff4444");
        imgCPU.src = "img/megunaroda.png";
    }

    setTimeout(() => limparTextoAtaque(), 1500);
}

function criarMahoragaCPU(){
    let antigo = document.getElementById("mahoragaCPU");
    if (antigo) antigo.remove();

    let mahoraga = document.createElement("img");
    mahoraga.id = "mahoragaCPU";
    mahoraga.src = "img/Mahoraga.png";
    mahoraga.style.position = "absolute";
    mahoraga.style.width = "300px";
    mahoraga.style.right = "120px";
    mahoraga.style.bottom = "80px";
    mahoraga.style.zIndex = "3";
    mahoraga.style.transform = "scaleX(-1)";

    arena.appendChild(mahoraga);
}

function ataqueMahoragaCPU(){
    let mahoraga = document.getElementById("mahoragaCPU");
    if (!mahoraga) return;

    mahoraga.style.transition = "transform 0.4s";
    mahoraga.style.transform = "scaleX(-1) translateX(300px)";

    setTimeout(() => {
        efeitoDanoJogador();
        jogador.vida -= 15;
        if (jogador.vida < 0) jogador.vida = 0;
        atualizarVida();
        verificarFimDeJogo();
    }, 400);

    setTimeout(() => { mahoraga.style.transform = "scaleX(-1) translateX(0px)"; }, 800);
}

function registrarAdaptacaoCPU(nomeAtaque, danoOriginal) {
    if (modoMegunaCPU !== "adaptacao") return danoOriginal;

    if (!adaptacaoInfoCPU.usoMesmoAtaque[nomeAtaque]) {
        adaptacaoInfoCPU.usoMesmoAtaque[nomeAtaque] = 1;
    } else {
        adaptacaoInfoCPU.usoMesmoAtaque[nomeAtaque]++;
    }

    let usos = adaptacaoInfoCPU.usoMesmoAtaque[nomeAtaque];
    let rags = 0;
    if (usos === 2) rags = 0.25;
    if (usos >= 3) rags = 0.5;

    if (rags > 0) {
        mostrarAdaptacao(nomeAtaque, rags);
    }
    return Math.floor(danoOriginal * (1 - rags));
}

function manterMegunaCPU() {
    if (!modoMegunaCPU) return;
    inimigo.energia -= 15;

    if (inimigo.energia <= 0) {
        inimigo.energia = 0;
        modoMegunaCPU = null;

        let mahoragaCPU = document.getElementById("mahoragaCPU");
        if (mahoragaCPU) mahoragaCPU.remove();

        imgCPU.src = inimigo.formas[inimigo.formaAtual].img;
        adaptacaoInfoCPU = { usoMesmoAtaque: {}, nivel: 0 };
        mostrarTextoAtaque(`${inimigo.nome}: Mahoraga desapareceu!`, "#ff4444");
    }
    atualizarEnergiaCPU();
}

function criarMahoraga(){
    let antigo = document.getElementById("mahoraga");
    if (antigo) antigo.remove();

    let mahoraga = document.createElement("img");
    mahoraga.id = "mahoraga";
    mahoraga.src = "img/Mahoraga.png";
    mahoraga.style.position = "absolute";
    mahoraga.style.width = "300px";
    mahoraga.style.left = "120px";
    mahoraga.style.bottom = "80px";
    mahoraga.style.zIndex = "3";

    arena.appendChild(mahoraga);
}

function ataqueMahoraga(){
    let mahoraga = document.getElementById("mahoraga");
    if (!mahoraga) return;

    mahoraga.style.transition = "transform 0.4s";
    mahoraga.style.transform = "translateX(300px)";

    setTimeout(() => {
        efeitoDano();
        inimigo.vida -= 15;
        if (inimigo.vida < 0) inimigo.vida = 0;
        atualizarVidaCPU();
        verificarFimDeJogo(); // BUGFIX: Agora ele checa se a CPU morreu no hit do Mahoraga!
    }, 400);

    setTimeout(() => { mahoraga.style.transform = "translateX(0px)"; }, 800);
}

function resetarTexto() {
    let tela = document.getElementById("texto");
    tela.textContent = "";
    tela.style.color = "white";
}

/* BUGFIX: Parametrizado para suportar Jogador e Bot perfeitamente */
/* BUGFIX 3: Posição calculada a partir do retângulo real do personagem que
   ataca (imgJogador ou imgCPU), então o Agito agora aparece embaixo e ao
   lado do personagem certo, do tamanho certo, não importa a forma atual. */
function animarAgito(isJogador, callbackDano){
    let to = getCharacterCenter(!isJogador);
    canvasVFX.fireSlash(to.x - 25, to.y, 220, Math.PI / 3, 15, "#00ffaa");
    canvasVFX.fireSlash(to.x + 25, to.y, 220, -Math.PI / 3, 15, "#00ffaa");
    setTimeout(() => {
        if (isJogador) efeitoDano(); else efeitoDanoJogador();
        callbackDano();
    }, 300);
}

/* BUGFIX 1: Agora usa o retângulo real do ALVO (imgJogador ou imgCPU) e soma
   um ajuste fino por forma (ajustesPosicaoForma), então o raio para de
   "escorregar" para o lado quando o Sukuna muda de forma (meguna/heian). */
function animarRaio(isJogador, callbackDano) {
    let to = getCharacterCenter(!isJogador);
    canvasVFX.fireLightningStrike(to.x, to.y, "#ffcc00");
    setTimeout(() => {
        if (isJogador) efeitoDano(); else efeitoDanoJogador();
        callbackDano();
    }, 300);
}
/* =========================================================
   BANCO DE DADOS: DIÁLOGOS E FRASES
========================================================= */
const dialogos = {
    meguna: {
        intro: ["Esse corpo...", "Finalmente...", "Vou torná-lo meu."],
        progresso: [
            "A resistência está diminuindo...", 
            "Sua alma está cedendo...", 
            "Você não pode mais me impedir.", 
            "Aceite seu destino."
        ],
        quase: ["Só mais um pouco.", "Está quase completo.", "Aceite quem realmente manda."],
        erroSukuna: ["Resistência inútil.", "Seu destino já foi selado.", "Tudo isso é inútil."],
        erroMegumi: [
            "Saia da minha cabeça!", 
            "Eu ainda estou resistindo.", 
            "Não vou entregar meu corpo.", 
            "Você nunca vai conseguir."
        ],
        falhaSukuna: ["Ainda não...", "A sincronização falhou."],
        falhaMegumi: ["Você não conseguiu."]
    },
    heian: {
        intro: [
            "Este corpo...", "Já cumpriu seu papel.", 
            "Chega de limitações.", "Não preciso mais me esconder.", 
            "Mostrarei...", "Meu verdadeiro poder.", 
            "A forma que fez o mundo inteiro temer meu nome.", 
            "Ryomen Sukuna...", "Está de volta."
        ],
        progresso: [
            "O verdadeiro poder...", "Finalmente.", 
            "Ninguém poderá me deter.", "Minha era recomeça.", 
            "Chegou a hora.", "Este é o meu verdadeiro corpo."
        ],
        erroSukuna: ["Levante-se.", "Continue.", "Não hesite.", "Ainda não."],
        erroGraveSukuna: ["Você vai desperdiçar meu poder?", "Concentre-se.", "Não falhe agora."]
    }
};

/* =========================================================
   SISTEMA DE CUTSCENES E EFEITOS
========================================================= */
const temposCutscenes = {
    "meguna_intro": 6000,
    "meguna_final": 1500,
    "heian_intro": 2000,
    "heian_final": 7500 // A explosão épica final demora mais
};

function playCutscene(id_cutscene, callback) {
    let container = document.getElementById("cutscene-container");
    if(!container) {
        container = document.createElement("div");
        container.id = "cutscene-container";
        document.body.appendChild(container);
    }
    
    // Esconder HUD e Arena
    document.getElementById("arena").style.display = "none";
    container.style.display = "flex";
    container.innerHTML = ""; 

    let midias = {
        "meguna_intro": "img/roubarM.gif",
        "meguna_final": "img/finalM.gif",
        "heian_intro":  "img/heianI.gif",
        "heian_final":  "img/heianF.gif"
    };

    // Puxa o tempo específico do dicionário ou usa 4000 como segurança
    let tempoExato = temposCutscenes[id_cutscene] || 4000; 

    if(midias[id_cutscene]) {
        let img = document.createElement("img");
        img.src = `${midias[id_cutscene]}?v=${Date.now()}`;
        img.classList.add("cutscene-media");
        container.appendChild(img);
    }

    setTimeout(() => {
        container.style.display = "none";
        document.getElementById("arena").style.display = "flex";
        if(callback) callback();
    }, tempoExato);
}

function mostrarFraseLenta(frases, index, callbackFinal) {
    if (index >= frases.length) {
        if(callbackFinal) callbackFinal();
        return;
    }
    
    let tela = document.getElementById("texto");
    tela.textContent = frases[index];
    tela.style.color = "white";
    
    setTimeout(() => {
        tela.textContent = "";
        setTimeout(() => {
            mostrarFraseLenta(frases, index + 1, callbackFinal);
        }, 500); // Pausa no escuro entre frases
    }, 2000); // Tempo lendo a frase
}

function exibirDialogoFlutuante(texto, personagem) {
    let div = document.createElement("div");
    div.classList.add("dialogo-flutuante");
    div.classList.add(personagem === "sukuna" ? "dialogo-sukuna" : "dialogo-megumi");
    div.textContent = texto;
    
    // Posição aleatória na tela
    div.style.top = (30 + Math.random() * 40) + "%";
    div.style.left = (10 + Math.random() * 60) + "%";
    
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function aplicarEfeito(tipo) {
    let arena = document.getElementById("arena");
    if (tipo === "flash") {
        let flash = document.createElement("div");
        flash.classList.add("flash-tela");
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = "0"; }, 50);
        setTimeout(() => { flash.remove(); }, 1000);
    } else if (tipo.startsWith("shake")) {
        arena.classList.add(tipo);
        setTimeout(() => arena.classList.remove(tipo), 500);
    }
}

function tituloEpico(textoMaior, textoMenor, callback) {
    let container = document.getElementById("cutscene-container");
    container.style.display = "flex";
    container.style.backgroundColor = "black";
    container.innerHTML = "";

    let titulo = document.createElement("div");
    titulo.classList.add("titulo-epico");
    titulo.innerHTML = `${textoMaior}<br><span style="font-size: 25px; color:#ccc;">${textoMenor}</span>`;
    
    container.appendChild(titulo);

    aplicarEfeito("shake-epico");
    aplicarEfeito("flash");

    setTimeout(() => {
        container.style.display = "none";
        document.getElementById("arena").style.display = "flex";
        if(callback) callback();
    }, 4000);
}

function pegarFraseAleatoria(arrayFrases) {
    return arrayFrases[Math.floor(Math.random() * arrayFrases.length)];
}
/* =========================================================
   MINIGAMES MIDORIYA
========================================================= */

// Minigame 1: O Ovo no Micro-ondas (Base -> Full Cowl)
// Minigame 1: O Ovo no Micro-ondas (Base -> Full Cowl / 100%)
function iniciarMinigameMicroondas() {
    let tela = document.getElementById("minigame");
    tela.style.display = "block";
    tela.innerHTML = `
        <h2 style="color:#00ff88; margin-top:10%; text-shadow:0 0 10px #00ff88;">CONTROLE A PORCENTAGEM! (ESPAÇO)</h2>
        <div id="barra-microondas" style="width:60%; height:40px; background:#222; border:3px solid #fff; margin:50px auto; position:relative;">
            <div style="position:absolute; left:30%; width:40%; height:100%; background:gold; z-index:1;"></div>
            <div style="position:absolute; left:48%; width:4%; height:100%; background:red; z-index:2; box-shadow:0 0 10px red;"></div>
            
            <div id="cursor-microondas" style="position:absolute; left:0; width:6px; height:50px; top:-5px; background:white; z-index:3; box-shadow:0 0 10px white;"></div>
        </div>
    `;

    let cursor = document.getElementById("cursor-microondas");
    let pos = 0;
    let direcao = 1;
    let movendo = true;

    let loop = setInterval(() => {
        if(!movendo) return;
        pos += 2 * direcao; // Move a barra com base na direção
        
        // Bateu nas bordas? Trava na borda e inverte
        if (pos >= 100) { 
            pos = 100; 
            direcao = -1; 
        } else if (pos <= 0) { 
            pos = 0; 
            direcao = 1; 
        }
        
        cursor.style.left = pos + "%";
    }, 15);

    const finalizarMicroondas = (e) => {
        if (!movendo) return; // Evita que a função rode duas vezes
        if (e.type === "keydown" && e.code !== "Space") return;
        
        movendo = false;
        clearInterval(loop);
        clearTimeout(tempoMinigame); 
        window.removeEventListener("keydown", finalizarMicroondas);
        tela.onclick = null;

        let finalPos = pos; // Agora podemos usar o 'pos' direto

        if (finalPos >= 48 && finalPos <= 52) {
            // Acerto Perfeito: Direto pro 100%
            aplicarEfeito("flash");
            exibirDialogoFlutuante("100%... SMASH!", "megumi");
            jogador.formaAtual = "oneforall100"; // Pula o fullcowl
            setTimeout(() => { limparMinigame(); finalizarTransformacaoMidoriya("oneforall100"); }, 1500);
        } else if (finalPos >= 30 && finalPos <= 70) {
            // Acerto Normal: Full Cowl
            aplicarEfeito("flash");
            exibirDialogoFlutuante("Estabilizado! Full Cowl!", "megumi"); 
            setTimeout(() => { limparMinigame(); finalizarTransformacaoMidoriya("fullcowl"); }, 1500);
        } else {
            // Erro: Full Cowl mas toma dano
            aplicarEfeito("shake-forte");
            exibirDialogoFlutuante("Argh! Muita força!", "sukuna"); 
            jogador.vida -= 20;
            if (jogador.vida < 0) jogador.vida = 0;
            atualizarVida();
            setTimeout(() => { limparMinigame(); finalizarTransformacaoMidoriya("fullcowl"); }, 1500);
        }
    
    };

    window.addEventListener("keydown", finalizarMicroondas);
    tela.onclick = finalizarMicroondas;
    tempoMinigame = setTimeout(() => { finalizarMicroondas({code: "Space"}); }, 5000);
}

// NOVA FUNÇÃO: Roteador de GIFs de Transformação do Midoriya
function finalizarTransformacaoMidoriya(forma) {
    let gifs = {
        "fullcowl": "img/deku_transform_fullcowl.gif",
        "oneforall100": "img/deku_transform_100.gif",
        "darkdeku": "img/deku_transform_dark.gif"
    };

    if(gifs[forma]) {
        playFullScreenGif(gifs[forma], 2500, () => {
            if(forma !== jogador.formaAtual) transformarJogador(); // Atualiza stats
            else {
                // Caso tenha pulado pro 100% direto, força a atualização
                let stats = jogador.formas[forma];
                jogador.vidaMax = stats.vidaMax; jogador.vida = stats.vidaMax;
                jogador.energiaMax = stats.energiaMax; jogador.energia = stats.energiaMax;
                imgJogador.src = stats.img;
                atualizarVida(); atualizarEnergia(); mostrarSkills();
            }
            turno = "cpu"; setTimeout(turnoCPU, 1000);
        });
    } else {
        transformarJogador();
        turno = "cpu"; setTimeout(turnoCPU, 1000);
    }
}

// Minigame 2: Romper de Limites (Full Cowl -> 100%)
function iniciarMinigameEsmagamento() {
    let tela = document.getElementById("minigame");
    tela.style.display = "block";
    let estresse = 0;
    
    tela.innerHTML = `
        <h2 style="color:#00e5ff; margin-top:10%;">ESMAGUE AS SETAS ⬅️ E ➡️ !</h2>
        <div style="width:300px; height:30px; background:#222; margin:30px auto; border:2px solid #fff;">
            <div id="barra-estresse" style="width:0%; height:100%; background:linear-gradient(90deg, #00e5ff, #fff); transition:width 0.1s;"></div>
        </div>
    `;

    let barra = document.getElementById("barra-estresse");
    let ultimaTecla = "";

    const mashing = (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            if (e.key !== ultimaTecla) {
                estresse += 4; // 25 cliques para encher
                ultimaTecla = e.key;
                barra.style.width = Math.min(estresse, 100) + "%";
                aplicarEfeito("shake-leve");
                
                if (estresse >= 100) {
                    window.removeEventListener("keydown", mashing);
                    clearTimeout(tempoMinigame);
                    aplicarEfeito("shake-epico");
                    aplicarEfeito("flash");
                    setTimeout(() => { limparMinigame(); finalizarTransformacao(); }, 1000);
                }
            }
        }
    };

    window.addEventListener("keydown", mashing);
    tempoMinigame = setTimeout(() => {
        window.removeEventListener("keydown", mashing);
        exibirDialogoFlutuante("Músculos exaustos...", "sukuna");
        jogador.vida -= 20;
        atualizarVida();
        limparMinigame(); 
        finalizarTransformacao();
    }, 3500);
}

// Minigame 3: Sincronia dos Vestígios (100% -> Dark Deku)
function iniciarMinigameVestigios() {
    let tela = document.getElementById("minigame");
    tela.style.display = "flex";
    tela.style.flexDirection = "column";
    tela.style.alignItems = "center";
    tela.style.justifyContent = "center";
    
    let sequencia = [];
    let indexAtual = 0;
    const setas = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    const icones = { 'ArrowUp':'⬆️', 'ArrowRight':'➡️', 'ArrowDown':'⬇️', 'ArrowLeft':'⬅️' };

    for(let i=0; i<5; i++) sequencia.push(setas[Math.floor(Math.random()*4)]);

    tela.innerHTML = `
        <h2 style="color:#a600ff;">SINCRONIZE OS VESTÍGIOS!</h2>
        <div id="qte-vestigios" style="font-size:40px; letter-spacing:15px; margin-top:20px;">
            ${sequencia.map(s => `<span>${icones[s]}</span>`).join('')}
        </div>
    `;

    let spans = document.getElementById("qte-vestigios").children;

    const lerTeclado = (e) => {
        if (!setas.includes(e.key)) return;
        
        if (e.key === sequencia[indexAtual]) {
            spans[indexAtual].style.opacity = "0.2"; // Apaga o que acertou
            indexAtual++;
            
            if (indexAtual >= sequencia.length) {
                window.removeEventListener("keydown", lerTeclado);
                clearTimeout(tempoMinigame);
                tela.style.backgroundColor = "black";
                setTimeout(() => { limparMinigame(); finalizarTransformacao(); }, 1500);
            }
        } else {
            // Errou
            window.removeEventListener("keydown", lerTeclado);
            clearTimeout(tempoMinigame);
            aplicarEfeito("flash");
            jogador.energia = 0; // Punição severa
            atualizarEnergia();
            exibirDialogoFlutuante("A sincronia falhou!", "sukuna");
            setTimeout(() => { limparMinigame(); finalizarTransformacao(); }, 1500);
        }
    };

    window.addEventListener("keydown", lerTeclado);
    tempoMinigame = setTimeout(() => {
        window.removeEventListener("keydown", lerTeclado);
        jogador.energia = 0;
        atualizarEnergia();
        limparMinigame(); 
        finalizarTransformacao();
    }, 3000);
}
/* =========================================================
   SISTEMA DE ANIMAÇÕES DO MIDORIYA (VENTO, CHICOTES, ETC)
========================================================= */
/* =========================================================
   SISTEMA DE ANIMAÇÕES DO MIDORIYA (VENTO, CHICOTES, GEARSHIFT)
========================================================= */
/* =========================================================
   SISTEMA DE ANIMAÇÕES CINEMÁTICAS DO MIDORIYA
========================================================= */
// Função auxiliar para tocar gif na tela toda
// Função auxiliar para tocar gif na tela toda e esconder a arena
// Função auxiliar para tocar gif na tela toda e esconder absolutamente tudo atrás
function playFullScreenGif(src, duration, callback) {
    let container = document.createElement("div");
    
    // Z-index gigantesco e background preto forçado (!important)
    container.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background-color: #000000 !important; 
        z-index: 999999; 
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    let overlay = document.createElement("img");
    overlay.src = src + "?v=" + Date.now();
    overlay.style.cssText = "width: 100%; height: 100%; object-fit: contain;";
    
    container.appendChild(overlay);
    document.body.appendChild(container);
    
    setTimeout(() => { 
        if(container) container.remove(); 
        if(callback) callback(); 
    }, duration);
}

// Função auxiliar para trocar a imagem do player temporariamente
// Função auxiliar para trocar a imagem por um GIF de tamanho controlado
function swapImgTemp(novoSrc, duration) {
    let efeitos = document.getElementById("efeitos");
    let atacante = imgJogador;
    let containerArena = arena.getBoundingClientRect();
    let rectAtacante = atacante.getBoundingClientRect();

    // Oculta o personagem original temporariamente
    atacante.style.opacity = "0";

    // Cria o GIF por cima, com tamanho controlado (Pique Fuga)
    let gifAtaque = document.createElement("div");
    gifAtaque.style.cssText = `
        position: absolute;
        width: 350px; /* Tamanho ajustado */
        height: 350px;
        background-image: url('${novoSrc}?v=${Date.now()}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center bottom;
        z-index: 150;
        pointer-events: none;
    `;

    let centroX = rectAtacante.left - containerArena.left + (rectAtacante.width / 2);
    let centroY = rectAtacante.top - containerArena.top + (rectAtacante.height / 2);

    gifAtaque.style.left = `${centroX}px`;
    gifAtaque.style.top = `${centroY}px`;
    gifAtaque.style.transform = "translate(-50%, -50%)";

    efeitos.appendChild(gifAtaque);

    setTimeout(() => {
        if(gifAtaque) gifAtaque.remove();
        atacante.style.opacity = "1";
    }, duration);
}

function animarAtaqueMidoriya(nomeAtk, callbackDano) {
    let from = getCharacterCenter(true);
    let to = getCharacterCenter(false);
    let effectsColor = "#00ff88";
    
    canvasVFX.fireElectricSparks(imgJogador.getBoundingClientRect(), effectsColor);

    if (nomeAtk.includes("detroit smash") && jogador.formaAtual === "base") {
        animateSpriteDash(true, () => {
            canvasVFX.addAnimation(new VFXWind(from.x, from.y, to.x, to.y, effectsColor, 12));
            setTimeout(() => {
                canvasVFX.fireHitSparks(to.x, to.y, effectsColor, 20);
                efeitoDano();
                callbackDano();
            }, 200);
        });
    } else if (nomeAtk.includes("delaware smash") && jogador.formaAtual === "base") {
        canvasVFX.addAnimation(new VFXWind(from.x, from.y, to.x, to.y, "#00e5ff", 15));
        setTimeout(() => {
            canvasVFX.fireHitSparks(to.x, to.y, "#00e5ff", 15);
            efeitoDano();
            callbackDano();
        }, 250);
    } else if (nomeAtk.includes("análise")) {
        canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 120, 30, "#00ffaa", 2));
        canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 80, 20, "#00ffaa", 1));
        setTimeout(callbackDano, 600);
    } else if (nomeAtk.includes("manchester")) {
        animateSpriteLeap(true, () => {
            canvasVFX.fireHitSparks(to.x, to.y, effectsColor, 25);
            canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 160, 20, effectsColor, 4));
            efeitoDano();
            callbackDano();
        });
    } else if (nomeAtk.includes("faísca")) {
        canvasVFX.fireElectricSparks(imgJogador.getBoundingClientRect(), "#00ff88");
        canvasVFX.fireElectricSparks(imgJogador.getBoundingClientRect(), "#00ff88");
        callbackDano();
    } else if (nomeAtk.includes("st. louis")) {
        animateSpriteDash(true, () => {
            canvasVFX.fireSlash(to.x, to.y, 220, Math.PI / 6, 12, "#00e5ff");
            efeitoDano();
            callbackDano();
        });
    } else if (nomeAtk.includes("detroit 100%")) {
        animateSpriteDash(true, () => {
            let count = 6;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    let rx = to.x + (Math.random() - 0.5) * 60;
                    let ry = to.y + (Math.random() - 0.5) * 60;
                    canvasVFX.fireHitSparks(rx, ry, "#00ff55", 10);
                    efeitoDano();
                }, i * 150);
            }
            setTimeout(() => {
                canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 220, 25, "#ffffff", 5));
                efeitoDano();
                callbackDano();
            }, count * 150 + 100);
        });
    } else if (nomeAtk.includes("united states")) {
        animateSpriteLeap(true, () => {
            let count = 40;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    let angle = (i / count) * Math.PI * 8;
                    let radius = 10 + (i / count) * 150;
                    let px = to.x + Math.cos(angle) * radius;
                    let py = to.y + Math.sin(angle) * radius;
                    canvasVFX.addParticle(new VFXParticle(px, py, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#ffd700", 3 + Math.random() * 4, 20, -0.05));
                }, i * 20);
            }
            setTimeout(() => {
                canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 300, 35, "#00a2ff", 6));
                aplicarEfeito("flash");
                efeitoDano();
                callbackDano();
            }, count * 20 + 100);
        });
    } else if (nomeAtk.includes("eri")) {
        for (let i = 0; i < 20; i++) {
            let angle = Math.random() * Math.PI * 2;
            let radius = 60;
            let px = from.x + Math.cos(angle) * radius;
            let py = from.y + Math.sin(angle) * radius;
            canvasVFX.addParticle(new VFXParticle(px, py, -Math.cos(angle) * 2, -Math.sin(angle) * 2, "#ffd700", 3, 30));
        }
        canvasVFX.addAnimation(new VFXShockwave(from.x, from.y, 80, 25, "#ffd700", 2));
        setTimeout(callbackDano, 800);
    } else if (nomeAtk.includes("emboscada")) {
        for (let i = 0; i < 30; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 5;
            canvasVFX.addParticle(new VFXParticle(to.x, to.y, Math.cos(angle) * speed, Math.sin(angle) * speed, "rgba(75, 0, 130, 0.4)", 15 + Math.random() * 15, 40));
        }
        setTimeout(() => {
            efeitoDano();
            callbackDano();
        }, 600);
    } else if (nomeAtk.includes("faux")) {
        canvasVFX.addAnimation(new VFXShockwave(from.x, from.y, 140, 20, "#00a2ff", 3));
        callbackDano();
    } else if (nomeAtk.includes("garras")) {
        let count = 4;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let rx = to.x + (Math.random() - 0.5) * 40;
                let ry = to.y + (Math.random() - 0.5) * 40;
                canvasVFX.fireSlash(rx, ry, 220, (Math.random() - 0.5) * Math.PI, 12, "#a600ff");
                efeitoDano();
            }, i * 200);
        }
        setTimeout(callbackDano, count * 200 + 100);
    } else if (nomeAtk.includes("gearshift")) {
        canvasVFX.addAnimation(new VFXShockwave(from.x, from.y, 160, 15, "#ff0000", 4));
        setTimeout(() => {
            efeitoDano();
            callbackDano();
        }, 500);
    } else if (nomeAtk.includes("infinito")) {
        let count = 50;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let rx = to.x + (Math.random() - 0.5) * 300;
                let ry = to.y + (Math.random() - 0.5) * 300;
                canvasVFX.fireSlash(rx, ry, 200 + Math.random() * 200, Math.random() * Math.PI * 2, 10, "#ff003c");
                canvasVFX.addParticle(new VFXParticle(to.x, to.y, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15 - 5, "#111111", 5 + Math.random() * 8, 30));
            }, i * 40);
        }
        setTimeout(() => {
            canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 400, 40, "#ffffff", 8));
            aplicarEfeito("flash");
            efeitoDano();
            callbackDano();
        }, count * 40 + 100);
    } else {
        animateSpriteDash(true, () => {
            canvasVFX.fireHitSparks(to.x, to.y, "#00ff88", 15);
            efeitoDano();
            callbackDano();
        });
    }
}

function animarAtaqueMidoriyaCPU(nomeAtk, callbackDano) {
    let from = getCharacterCenter(false);
    let to = getCharacterCenter(true);
    let effectsColor = "#00ff88";
    
    canvasVFX.fireElectricSparks(imgCPU.getBoundingClientRect(), effectsColor);

    if (nomeAtk.includes("detroit smash") && inimigo.formaAtual === "base") {
        animateSpriteDash(false, () => {
            canvasVFX.addAnimation(new VFXWind(from.x, from.y, to.x, to.y, effectsColor, 12));
            setTimeout(() => {
                canvasVFX.fireHitSparks(to.x, to.y, effectsColor, 20);
                efeitoDanoJogador();
                callbackDano();
            }, 200);
        });
    } else if (nomeAtk.includes("delaware smash") && inimigo.formaAtual === "base") {
        canvasVFX.addAnimation(new VFXWind(from.x, from.y, to.x, to.y, "#00e5ff", 15));
        setTimeout(() => {
            canvasVFX.fireHitSparks(to.x, to.y, "#00e5ff", 15);
            efeitoDanoJogador();
            callbackDano();
        }, 250);
    } else if (nomeAtk.includes("análise")) {
        canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 120, 30, "#00ffaa", 2));
        setTimeout(callbackDano, 600);
    } else if (nomeAtk.includes("manchester")) {
        animateSpriteLeap(false, () => {
            canvasVFX.fireHitSparks(to.x, to.y, effectsColor, 25);
            canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 160, 20, effectsColor, 4));
            efeitoDanoJogador();
            callbackDano();
        });
    } else if (nomeAtk.includes("faísca")) {
        canvasVFX.fireElectricSparks(imgCPU.getBoundingClientRect(), "#00ff88");
        callbackDano();
    } else if (nomeAtk.includes("st. louis")) {
        animateSpriteDash(false, () => {
            canvasVFX.fireSlash(to.x, to.y, 220, Math.PI / 6, 12, "#00e5ff");
            efeitoDanoJogador();
            callbackDano();
        });
    } else if (nomeAtk.includes("detroit 100%")) {
        animateSpriteDash(false, () => {
            let count = 6;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    let rx = to.x + (Math.random() - 0.5) * 60;
                    let ry = to.y + (Math.random() - 0.5) * 60;
                    canvasVFX.fireHitSparks(rx, ry, "#00ff55", 10);
                    efeitoDanoJogador();
                }, i * 150);
            }
            setTimeout(() => {
                canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 220, 25, "#ffffff", 5));
                efeitoDanoJogador();
                callbackDano();
            }, count * 150 + 100);
        });
    } else if (nomeAtk.includes("united states")) {
        animateSpriteLeap(false, () => {
            let count = 30;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    let angle = (i / count) * Math.PI * 6;
                    let radius = 10 + (i / count) * 120;
                    let px = to.x + Math.cos(angle) * radius;
                    let py = to.y + Math.sin(angle) * radius;
                    canvasVFX.addParticle(new VFXParticle(px, py, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#ffd700", 3, 20, -0.05));
                }, i * 20);
            }
            setTimeout(() => {
                canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 300, 35, "#00a2ff", 6));
                aplicarEfeito("flash");
                efeitoDanoJogador();
                callbackDano();
            }, count * 20 + 100);
        });
    } else if (nomeAtk.includes("eri")) {
        canvasVFX.addAnimation(new VFXShockwave(from.x, from.y, 80, 25, "#ffd700", 2));
        setTimeout(callbackDano, 800);
    } else if (nomeAtk.includes("emboscada")) {
        for (let i = 0; i < 20; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4;
            canvasVFX.addParticle(new VFXParticle(to.x, to.y, Math.cos(angle) * speed, Math.sin(angle) * speed, "rgba(75, 0, 130, 0.4)", 15, 30));
        }
        setTimeout(() => {
            efeitoDanoJogador();
            callbackDano();
        }, 600);
    } else if (nomeAtk.includes("garras")) {
        let count = 4;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let rx = to.x + (Math.random() - 0.5) * 40;
                let ry = to.y + (Math.random() - 0.5) * 40;
                canvasVFX.fireSlash(rx, ry, 220, (Math.random() - 0.5) * Math.PI, 12, "#a600ff");
                efeitoDanoJogador();
            }, i * 200);
        }
        setTimeout(callbackDano, count * 200 + 100);
    } else {
        animateSpriteDash(false, () => {
            canvasVFX.fireHitSparks(to.x, to.y, "#00ff88", 15);
            efeitoDanoJogador();
            callbackDano();
        });
    }
}

function animarAtaqueGoku(isJogador, nomeAtk, callbackDano) {
    let from = getCharacterCenter(isJogador);
    let to = getCharacterCenter(!isJogador);

    if (nomeAtk.includes("kamehameha") || nomeAtk.includes("super kamehameha")) {
        let isSuper = nomeAtk.includes("super");
        let color = isSuper ? "#ffcc00" : "#00a2ff";
        let width = isSuper ? 75 : 45;
        let duration = isSuper ? 40 : 25;
        canvasVFX.fireBeam(from.x, from.y, to.x, to.y, color, width, duration);
        
        setTimeout(() => {
            aplicarEfeito(isSuper ? "shake-epico" : "shake-forte");
            if (isSuper) aplicarEfeito("flash");
            if (isJogador) efeitoDano(); else efeitoDanoJogador();
            callbackDano();
        }, 800);
    } else if (nomeAtk.includes("dragon rush")) {
        animateSpriteDash(isJogador, () => {
            canvasVFX.fireHitSparks(to.x, to.y, "#ffaa00", 12);
            if (isJogador) efeitoDano(); else efeitoDanoJogador();
            
            setTimeout(() => {
                animateSpriteDash(isJogador, () => {
                    canvasVFX.fireHitSparks(to.x, to.y + 30, "#ff5500", 12);
                    if (isJogador) efeitoDano(); else efeitoDanoJogador();
                    
                    setTimeout(() => {
                        animateSpriteLeap(isJogador, () => {
                            canvasVFX.fireHitSparks(to.x, to.y, "#ffaa00", 25);
                            canvasVFX.addAnimation(new VFXShockwave(to.x, to.y, 120, 15, "#ffcc00", 3));
                            if (isJogador) efeitoDano(); else efeitoDanoJogador();
                            callbackDano();
                        });
                    }, 250);
                });
            }, 250);
        });
    } else {
        animateSpriteDash(isJogador, () => {
            canvasVFX.fireHitSparks(to.x, to.y, "#ffaa00", 15);
            if (isJogador) efeitoDano(); else efeitoDanoJogador();
            callbackDano();
        });
    }
}



// Injetar CSS via JS pro flash do Infinito (pra não precisar de mais CSS)
const style = document.createElement('style');
style.innerHTML = `@keyframes fadeBranco { 0% { opacity: 1; } 100% { opacity: 0; } }`;
document.head.appendChild(style);
/* =========================================================
   O MILAGRE DO BERSERK (INTERCEPTADOR DE HP)
   Isso monitora a vida do Midoriya independente de onde o dano venha!
========================================================= */
let cinematicaBerserkAtiva = false;

// Sobrescrevemos sua função atualizarVida para rodar a checagem automaticamente 
const liberarSkillsOriginal = liberarSkills;
const atualizarVidaOriginal = atualizarVida;
atualizarVida = function() {
    atualizarVidaOriginal(); // Roda a barra visual

    if (jogador && jogador.nome.toLowerCase() === "midoriya" && jogador.formaAtual === "darkdeku" && !jogador.usouBerserk) {
        let hpPercent = jogador.vida / jogador.formas["darkdeku"].vidaMax;
        
        // Ativa se a vida ficar menor ou igual a 20%
        if (hpPercent <= 0.50 && jogador.vida > 0) {
            jogador.usouBerserk = true;
            cinematicaBerserkAtiva = true;
            bloquearSkills();
            
            document.getElementById("texto").textContent = "ÚLTIMO SUSPIRO...";
            document.getElementById("texto").style.color = "red";
            
            setTimeout(() => {
                aplicarEfeito("shake-epico");
                aplicarEfeito("flash");
                document.getElementById("texto").textContent = "ESTADO BERSERK!";
                
                jogador.formaAtual = "berserk";
                let forma = jogador.formas["berserk"];
                jogador.vidaMax = forma.vidaMax;
                jogador.vida += Math.floor(jogador.vidaMax * 0.35); // Cura emergencial
                jogador.energiaMax = forma.energiaMax;
                jogador.energia = forma.energiaMax; 
                imgJogador.src = forma.img;
                
                atualizarVidaOriginal();
                atualizarEnergia();
                mostrarSkills();
                
                setTimeout(() => {
                    document.getElementById("texto").textContent = "";
                    cinematicaBerserkAtiva = false;
                    turno = "jogador"; // Interrompe qualquer combo da CPU e dá o turno de vingança
                    liberarSkillsOriginal();
                }, 2000);
            }, 1500);
        }
    }
};


