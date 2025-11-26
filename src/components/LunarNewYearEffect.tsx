import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    wind: number;
    rotation: number;
    rotationSpeed: number;
    emoji: string;
}

export function LunarNewYearEffect() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const emojiCanvasesRef = useRef<Record<string, HTMLCanvasElement>>({});

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Pre-render emojis to off-screen canvases
        const preRenderEmoji = (emoji: string, size: number) => {
            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = size;
            offScreenCanvas.height = size;
            const offCtx = offScreenCanvas.getContext('2d');
            if (offCtx) {
                offCtx.font = `${size * 0.8}px serif`; // Use 80% of canvas size for font to ensure it fits
                offCtx.textAlign = 'center';
                offCtx.textBaseline = 'middle';
                offCtx.fillText(emoji, size / 2, size / 2);
            }
            return offScreenCanvas;
        };

        // Initialize emoji canvases if not already done
        if (Object.keys(emojiCanvasesRef.current).length === 0) {
            const emojis = ['🧧', '🌼', '🌸'];
            // Render at high resolution (64px) for crisp scaling
            emojis.forEach(emoji => {
                emojiCanvasesRef.current[emoji] = preRenderEmoji(emoji, 64);
            });
        }

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Create particles
        const createParticles = () => {
            const particles: Particle[] = [];
            // Reduced density slightly for better performance while maintaining look
            const count = Math.floor((canvas.width * canvas.height) / 15000);

            const emojis = ['🧧', '🌼', '🌸'];

            for (let i = 0; i < count; i++) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];

                // Resize red envelope to be smaller as requested
                let size;
                if (emoji === '🧧') {
                    size = Math.random() * 10 + 12; // 12px - 22px
                } else {
                    size = Math.random() * 15 + 15; // 15px - 30px
                }

                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: size,
                    speed: Math.random() * 1 + 0.5, // Slower speed (0.5 - 1.5)
                    wind: Math.random() * 1 - 0.5,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 2,
                    emoji: emoji
                });
            }

            return particles;
        };

        particlesRef.current = createParticles();

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach((particle) => {
                // Update position
                particle.y += particle.speed;
                particle.x += particle.wind;
                particle.rotation += particle.rotationSpeed;

                // Reset if particle goes off screen
                if (particle.y > canvas.height + 50) {
                    particle.y = -50;
                    particle.x = Math.random() * canvas.width;
                }
                if (particle.x > canvas.width + 50) {
                    particle.x = -50;
                } else if (particle.x < -50) {
                    particle.x = canvas.width + 50;
                }

                // Draw particle using pre-rendered image
                const emojiCanvas = emojiCanvasesRef.current[particle.emoji];
                if (emojiCanvas) {
                    ctx.save();
                    ctx.translate(particle.x, particle.y);
                    ctx.rotate((particle.rotation * Math.PI) / 180);
                    // Draw image centered at (0,0) with the particle's size
                    ctx.drawImage(
                        emojiCanvas,
                        -particle.size / 2,
                        -particle.size / 2,
                        particle.size,
                        particle.size
                    );
                    ctx.restore();
                }
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
