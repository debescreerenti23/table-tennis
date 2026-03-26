
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const pScoreElem = document.getElementById('player-score');
        const aScoreElem = document.getElementById('ai-score');
        const startMsg = document.getElementById('start-msg');

        let audioCtx = null;
        function playSound(freq, type, duration) {
            if (!audioCtx) return;
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch(e) {}
        }

        let gameRunning = false;
        const paddleWidth = 12;
        let paddleHeight = 100;
        const ballRadius = 6;
        let particles = [];
        let trail = [];

        const player = { x: 0, y: 0, score: 0 };
        const ai = { x: 0, y: 0, score: 0, speed: 4.5 };
        const ball = { x: 0, y: 0, dx: 0, dy: 0, baseSpeed: 7, currentSpeed: 7 };

        function initLayout() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            paddleHeight = Math.max(80, canvas.height * 0.15);
            player.x = 40;
            ai.x = canvas.width - 40 - paddleWidth;
            if (!gameRunning) {
                player.y = canvas.height / 2 - paddleHeight / 2;
                ai.y = canvas.height / 2 - paddleHeight / 2;
            }
            resetBall();
        }

        function createParticles(x, y, color) {
            for (let i = 0; i < 6; i++) {
                particles.push({
                    x, y,
                    dx: (Math.random() - 0.5) * 8,
                    dy: (Math.random() - 0.5) * 8,
                    life: 1.0,
                    color
                });
            }
        }

        function resetBall() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.currentSpeed = ball.baseSpeed + (player.score + ai.score) * 0.25;
            const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
            const dir = Math.random() > 0.5 ? 1 : -1;
            ball.dx = dir * Math.cos(angle) * ball.currentSpeed;
            ball.dy = Math.sin(angle) * ball.currentSpeed;
            trail = [];
        }

        function startGame() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            gameRunning = true;
            startMsg.style.display = 'none';
            player.score = 0; ai.score = 0; ai.speed = 4.5;
            updateScoreUI();
            resetBall();
            playSound(440, 'sine', 0.1);
        }

        function updateScoreUI() {
            pScoreElem.innerText = player.score;
            aScoreElem.innerText = ai.score;
        }

        function handleMove(y) {
            const rect = canvas.getBoundingClientRect();
            player.y = (y - rect.top) - paddleHeight / 2;
            const margin = 10;
            if (player.y < margin) player.y = margin;
            if (player.y > canvas.height - paddleHeight - margin) player.y = canvas.height - paddleHeight - margin;
        }

        window.addEventListener('mousemove', (e) => { if(gameRunning) handleMove(e.clientY); });
        window.addEventListener('touchmove', (e) => {
            if(gameRunning) {
                handleMove(e.touches[0].clientY);
                e.preventDefault();
            }
        }, { passive: false });
        window.addEventListener('resize', initLayout);

        function update() {
            if (!gameRunning) return;

            trail.push({x: ball.x, y: ball.y});
            if (trail.length > 8) trail.shift();

            ball.x += ball.dx;
            ball.y += ball.dy;

            // --- CORRECCIÓN DE REBOTE SUPERIOR E INFERIOR ---
            // Si la pelota toca el borde superior o inferior
            if (ball.y - ballRadius <= 0) {
                ball.y = ballRadius; // Reposicionar dentro
                ball.dy = Math.abs(ball.dy); // Forzar dirección hacia abajo
                playSound(300, 'triangle', 0.05);
                createParticles(ball.x, ball.y, '#fff');
            } else if (ball.y + ballRadius >= canvas.height) {
                ball.y = canvas.height - ballRadius; // Reposicionar dentro
                ball.dy = -Math.abs(ball.dy); // Forzar dirección hacia arriba
                playSound(300, 'triangle', 0.05);
                createParticles(ball.x, ball.y, '#fff');
            }

            // IA
            const aiCenter = ai.y + paddleHeight / 2;
            if (aiCenter < ball.y - 15) ai.y += ai.speed;
            else if (aiCenter > ball.y + 15) ai.y -= ai.speed;

            // Colisiones Paletas
            if (ball.dx < 0 && ball.x - ballRadius < player.x + paddleWidth && ball.x > player.x && ball.y > player.y && ball.y < player.y + paddleHeight) {
                ball.dx = Math.abs(ball.dx) * 1.03;
                ball.dy = (ball.y - (player.y + paddleHeight / 2)) * 0.2;
                ball.x = player.x + paddleWidth + ballRadius;
                playSound(600, 'square', 0.1);
                createParticles(ball.x, ball.y, '#4299e1');
            }

            if (ball.dx > 0 && ball.x + ballRadius > ai.x && ball.x < ai.x + paddleWidth && ball.y > ai.y && ball.y < ai.y + paddleHeight) {
                ball.dx = -Math.abs(ball.dx) * 1.03;
                ball.dy = (ball.y - (ai.y + paddleHeight / 2)) * 0.2;
                ball.x = ai.x - ballRadius;
                playSound(600, 'square', 0.1);
                createParticles(ball.x, ball.y, '#f56565');
            }

            // Puntos
            if (ball.x < 0) { ai.score++; playSound(150, 'sawtooth', 0.3); scorePoint(); }
            else if (ball.x > canvas.width) { player.score++; playSound(800, 'sine', 0.3); scorePoint(); }

            particles.forEach((p, i) => {
                p.x += p.dx; p.y += p.dy; p.life -= 0.03;
                if (p.life <= 0) particles.splice(i, 1);
            });
        }

        function scorePoint() {
            updateScoreUI();
            if (player.score >= 10 || ai.score >= 10) {
                gameRunning = false;
                startMsg.style.display = 'inline-block';
                startMsg.querySelector('h1').innerText = player.score >= 10 ? "🏆 VICTORIA" : "💀 FIN DEL JUEGO";
                startMsg.querySelector('p').innerText = `Final: ${player.score} - ${ai.score}`;
            } else {
                resetBall();
            }
        }

        function draw() {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
            ctx.beginPath(); ctx.moveTo(canvas.width/2, 5); ctx.lineTo(canvas.width/2, canvas.height - 5); ctx.stroke();
            ctx.setLineDash([]);

            trail.forEach((t, i) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${i / 15})`;
                ctx.beginPath(); ctx.arc(t.x, t.y, ballRadius * (i/8), 0, Math.PI*2); ctx.fill();
            });

            particles.forEach(p => {
                ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, 2, 2);
            });
            ctx.globalAlpha = 1.0;

            ctx.shadowBlur = 15;
            ctx.fillStyle = '#60a5fa'; ctx.shadowColor = '#3b82f6';
            if (ctx.roundRect) {
                ctx.beginPath(); ctx.roundRect(player.x, player.y, paddleWidth, paddleHeight, 6); ctx.fill();
                ctx.fillStyle = '#f87171'; ctx.shadowColor = '#ef4444';
                ctx.beginPath(); ctx.roundRect(ai.x, ai.y, paddleWidth, paddleHeight, 6); ctx.fill();
            }

            ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
        initLayout();
        gameLoop();