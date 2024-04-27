class WaterDrop {
    constructor(canvas, x, y, radius = Math.random() * 20 + 20, color = `hsl(${Math.random() * 360}, 75%, 50%)`, speed = Math.random() * 1.5 + 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = x || Math.random() * (canvas.width - radius * 2) + radius;
        this.y = y || canvas.height + radius;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.directionX = (Math.random() - 0.5) * 2;
        this.directionY = (Math.random() - 0.5) * 1;
        this.splitMergeCount = 0;
        this.isProtected = true;  // Initial state is protected
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();

        if (this.isProtected) {
            this.ctx.strokeStyle = this.getFadedColor();  // Use a faded version of the water drop's color
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
        this.ctx.closePath();
    }

    update(drops) {
        let speedMultiplier = 1 + this.splitMergeCount * 0.001;
        this.y -= (this.speed * speedMultiplier) * this.canvas.globalSpeedMultiplier + this.directionY;
        this.x += this.directionX * this.canvas.globalSpeedMultiplier;
        this.boundaryCheck();
        if (!this.isProtected) {  // Only check for interactions if not protected
            this.interactionCheck(drops);
        }
    }

    interact() {
        // Method to handle poking by the user
        this.isProtected = false;  // Remove protection
    }

    boundaryCheck() {
        if (this.x < this.radius || this.x > this.canvas.width - this.radius) {
            this.directionX = -this.directionX;
        }
    }

    interactionCheck(drops) {
        drops.forEach(drop => {
            if (drop !== this && this.intersect(drop)) {
                this.mixColors(drop);
                this.grow(drop);
            }
        });
    }

    getFadedColor() {
        let colorParts = this.color.match(/(\d+), (\d+)%, (\d+)%/);
        let hue = colorParts[1];
        let saturation = colorParts[2];
        let lightness = parseInt(colorParts[3]);
        return `hsla(${hue}, ${saturation}%, ${Math.min(100, lightness + 30)}%, 0.5)`; // Increase lightness and add transparency
    }

    intersect(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + other.radius;
    }

    mixColors(other) {
        let hue1 = parseInt(this.color.slice(4, this.color.indexOf(',')));
        let hue2 = parseInt(other.color.slice(4, other.color.indexOf(',')));
        let newHue = (hue1 + hue2) / 2;
        this.color = `hsl(${newHue % 360}, 75%, 50%)`;
        other.color = this.color;
        this.splitMergeCount++;
        other.splitMergeCount++;
        this.canvas.score += 10 * this.speed;
    }

    grow(other) {
        let combinedVolume = Math.PI * this.radius * this.radius + Math.PI * other.radius * other.radius;
        let growthFactor = 1.05;
        let newRadius = Math.sqrt((combinedVolume * growthFactor) / Math.PI);
        this.radius = newRadius > this.canvas.maxRadius ? this.canvas.maxRadius : newRadius;
        other.radius = this.radius;
    }

    split() {
        let newRadius = this.radius / Math.sqrt(2) * (0.95 + Math.random() * 0.05);
        if (newRadius < 10) return [];
        this.splitMergeCount++;
        this.canvas.score += 5 * this.speed;
        return [
            new WaterDrop(this.canvas, this.x - this.radius, this.y, newRadius, this.color, this.speed),
            new WaterDrop(this.canvas, this.x + this.radius, this.y, newRadius, this.color, this.speed)
        ];
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isGameOver = false;
        this.canvas.score = 0;
        this.canvas.globalSpeedMultiplier = parseFloat(document.getElementById('speedControl').value);
        this.canvas.maxRadius = 75;
        document.getElementById('speedControl').addEventListener('input', () => {
            this.canvas.globalSpeedMultiplier = parseFloat(document.getElementById('speedControl').value);
        });

        this.timeLeft = 120;
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timeDisplay.textContent = this.timeLeft;
        this.waterDrops = [];

        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this), { passive: false });
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.animate();
        setInterval(() => this.updateTime(), 1000);
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth > 800 ? 800 : window.innerWidth;
        this.canvas.height = window.innerHeight * 0.8;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.waterDrops.forEach((drop, index) => {
            if (drop.intersect({x, y, radius: 1})) {
                if (drop.isProtected) {
                    drop.interact();  // Remove protection on click
                } else {
                    const splits = drop.split();
                    this.waterDrops.splice(index, 1, ...splits);
                }
            }
        });
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("click", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    addWaterDrop() {
        this.waterDrops.push(new WaterDrop(this.canvas));
    }

    handleWaterDrops() {
        this.waterDrops.forEach(drop => drop.update(this.waterDrops));
        this.waterDrops = this.waterDrops.filter(drop => drop.y + drop.radius > 0);
        this.waterDrops.forEach(drop => drop.draw());
        if (this.waterDrops.length < 10 && Math.random() > 0.95) {
            this.addWaterDrop();
        }
    }

    displayScore() {
        this.ctx.font = '16px Finlandica';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`Score: ${parseInt(this.canvas.score)}`, 10, 20);
    }

    updateTime() {
        if (this.timeLeft > 0 && !this.isGameOver) {
            this.timeLeft--;
            this.timeDisplay.textContent = this.timeLeft;
        } else if (this.timeLeft === 0) {
            this.endGame();
        }
    }

    endGame() {
        this.isGameOver = true; // Set game over flag to true
        this.ctx.font = '40px Finlandica';
        this.ctx.fillStyle = 'red';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Time Up! Game Over!', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Final Score: ${parseInt(this.canvas.score)}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        cancelAnimationFrame(this.animationFrameId);
    }

    animate() {
        if (this.isGameOver) {
            return; // Stop the animation loop if the game is over
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.handleWaterDrops();
        this.displayScore();
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
}

new Game('gameCanvas');
