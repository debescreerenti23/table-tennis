const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const pScoreElem = document.getElementById('player-score');
        const aScoreElem = document.getElementById('ai-score');
        const startMsg = document.getElementById('start-msg');

        // Audio Context para sonidos sintetizados
        let audioCtx = null;
        function playSound(freq, type, duration) {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }

        // Configuración
        let gameRunning = false;
        const paddleWidth = 14;
        const paddleHeight = 110;
        const ballRadius = 7;
        let particles = [];
        let trail = [];

        // Estado
        const player = { x: 0, y: 0, score: 0 };
        const ai = { x: 0, y: 0, score: 0, speed: 5 };
        const ball = { x: 0, y: 0, dx: 0, dy: 0, baseSpeed: 8, currentSpeed: 8 };

        function initLayout() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            player.x = 30;
            ai.x = canvas.width - 30 - paddleWidth;
            resetBall();
        }

        function createParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x, y,
                    dx: (Math.random() - 0.5) * 10,
                    dy: (Math.random() - 0.5) * 10,
                    life: 1.0,
                    color
                });
            }
        }

        function resetBall() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.currentSpeed = ball.baseSpeed + (player.score + ai.score) * 0.3;
            const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
            const dir = Math.random() > 0.5 ? 1 : -1;
            ball.dx = dir * Math.cos(angle) * ball.currentSpeed;
            ball.dy = Math.sin(angle) * ball.currentSpeed;
            trail = [];
        }

        function startGame() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gameRunning = true;
            startMsg.style.display = 'none';
            player.score = 0;
            ai.score = 0;
            ai.speed = 5.5;
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
            const mouseY = y - rect.top;
            player.y = mouseY - paddleHeight / 2;
            if (player.y < 10) player.y = 10;
            if (player.y > canvas.height - paddleHeight - 10) player.y = canvas.height - paddleHeight - 10;
        }

        window.addEventListener('mousemove', (e) => handleMove(e.clientY));
        window.addEventListener('touchmove', (e) => {
            handleMove(e.touches[0].clientY);
            e.preventDefault();
        }, { passive: false });
        window.addEventListener('resize', initLayout);

        function update() {
            if (!gameRunning) return;

            // Trail
            trail.push({x: ball.x, y: ball.y});
            if (trail.length > 10) trail.shift();

            // Movimiento
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Paredes
            if (ball.y + ballRadius > canvas.height || ball.y - ballRadius < 0) {
                ball.dy *= -1;
                playSound(300, 'triangle', 0.05);
                createParticles(ball.x, ball.y, '#fff');
            }

            // IA Progresiva
            const aiCenter = ai.y + paddleHeight / 2;
            const aiTargetSpeed = ai.speed + (player.score * 0.2); 
            if (aiCenter < ball.y - 20) ai.y += aiTargetSpeed;
            else if (aiCenter > ball.y + 20) ai.y -= aiTargetSpeed;
            
            if (ai.y < 10) ai.y = 10;
            if (ai.y > canvas.height - paddleHeight - 10) ai.y = canvas.height - paddleHeight - 10;

            // Colisiones con paletas
            if (ball.dx < 0 && ball.x - ballRadius < player.x + paddleWidth && ball.y > player.y && ball.y < player.y + paddleHeight) {
                ball.dx = Math.abs(ball.dx) * 1.05;
                const deltaY = ball.y - (player.y + paddleHeight / 2);
                ball.dy = deltaY * 0.25;
                playSound(600, 'square', 0.1);
                createParticles(ball.x, ball.y, '#4299e1');
            }

            if (ball.dx > 0 && ball.x + ballRadius > ai.x && ball.y > ai.y && ball.y < ai.y + paddleHeight) {
                ball.dx = -Math.abs(ball.dx) * 1.05;
                const deltaY = ball.y - (ai.y + paddleHeight / 2);
                ball.dy = deltaY * 0.25;
                playSound(600, 'square', 0.1);
                createParticles(ball.x, ball.y, '#f56565');
            }

            // Puntos
            if (ball.x < 0) {
                ai.score++;
                playSound(150, 'sawtooth', 0.3);
                scorePoint();
            } else if (ball.x > canvas.width) {
                player.score++;
                playSound(800, 'sine', 0.3);
                scorePoint();
            }

            // Partículas
            particles.forEach((p, i) => {
                p.x += p.dx;
                p.y += p.dy;
                p.life -= 0.02;
                if (p.life <= 0) particles.splice(i, 1);
            });
        }

        function scorePoint() {
            updateScoreUI();
            if (player.score >= 10 || ai.score >= 10) {
                gameRunning = false;
                startMsg.style.display = 'inline-block';
                startMsg.querySelector('h1').innerText = player.score >= 10 ? "🏆 ¡VICTORIA!" : "💀 DERROTA";
                startMsg.querySelector('p').innerText = `Marcador final: ${player.score} - ${ai.score}`;
            } else {
                resetBall();
            }
        }

        function draw() {
            // Fondo con degradado
            const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/1.5);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Red central neon
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 15]);
            ctx.beginPath();
            ctx.moveTo(canvas.width/2, 0);
            ctx.lineTo(canvas.width/2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Estela
            trail.forEach((t, i) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${i / 20})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, ballRadius * (i/10), 0, Math.PI*2);
                ctx.fill();
            });

            // Partículas
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, 3, 3);
            });
            ctx.globalAlpha = 1.0;

            // Paletas con brillo
            ctx.shadowBlur = 20;
            
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#3b82f6';
            drawRoundedRect(player.x, player.y, paddleWidth, paddleHeight, 7);

            ctx.fillStyle = '#f87171';
            ctx.shadowColor = '#ef4444';
            drawRoundedRect(ai.x, ai.y, paddleWidth, paddleHeight, 7);

            // Pelota
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }

        function drawRoundedRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x,y,w,h);
            ctx.fill();
        }

        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        initLayout();
        gameLoop();