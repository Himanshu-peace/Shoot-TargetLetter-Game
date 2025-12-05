const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { 
        default: "arcade" 
    },
    scene: { 
        preload, create, update 
    }
};

let game = new Phaser.Game(config);

let bow;
let balloonsGroup;
let exampleArrow; 
let confettiAnimReady = false;
let isAiming = false;
let lastTapTime = 0;
let aimArrow = null;   // arrow that stays with bow during aim
let arrowGroup;
let sceneTargetLetter;
let targetText;            
let hitCounter = 0;       
let streakCounter = 0;      
let hitCounterText;     
let possibleLetters = ["A",  "B", "C", "D", "E", "f"];
let winPopup = null;
let losePopup = null;
let gameFrozen = false;  

// PRELOAD (LOAD ASSETS)
function preload() {
    //loading images
    this.load.image("background", "assets/sky-background1.png");       
    this.load.image("balloon", "assets/balloon-removebg-preview.png"); 
    this.load.image("bow", "assets/bow-removebg-preview.png");        
    this.load.image("arrow", "assets/arrow-removebg.png");      

    this.load.spritesheet("confetti", "assets/confetti-sprite-removebg.png", {
        frameWidth: 128,
        frameHeight: 128
    });

    //loading audio
    this.load.audio("correct", "assets/correct.mp3");
    this.load.audio("wrong", "assets/wrong.mp3");
    this.load.audio("yay", "assets/yay-sound.mp3");
    this.load.audio("bubblepop", "assets/bubble-pop-sound.mp3");
    this.load.audio("victory", "assets/victory.mp3");
    this.load.audio("confettiPop", "assets/applause-sound.mp3");
}

// CREATE loaded assets
function create() {

    //bg image
    let bg = this.add.image(0, 0, "background").setOrigin(0, 0);
    bg.setDisplaySize(this.scale.width, this.scale.height);          //scale bg to fit screen


    //BOW SCALING
    bow = this.add.image(
        this.scale.width / 2,
        this.scale.height - (this.scale.height * 0.15),
        "bow"
    );
    bow.setOrigin(0.5);

    let bowScale = (this.scale.width * 0.20) / 300;    //bow width ≈ 20% of screen width
    bow.setScale(bowScale);


    //ballon physics
    balloonsGroup = this.physics.add.group();
    //create random text ballons
    Phaser.Utils.Array.Shuffle(possibleLetters); // random 8 words

    for (let i = 0; i < 6; i++) {
        let bx = Phaser.Math.Between(100, this.scale.width - 100);
        let by = Phaser.Math.Between(100, this.scale.height - 200);
        spawnBalloon.call(this, bx, by, possibleLetters[i]);
    }

    //animation
    this.anims.create({
        key: "confettiPop",
        frames: this.anims.generateFrameNumbers("confetti", { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0,
        hideOnComplete: true
    });
    confettiAnimReady = true;

    //group arrows
    arrowGroup = this.physics.add.group();

    sceneTargetLetter = "A";  // using your test target

    targetText = this.add.text(
        this.scale.width / 2,
        50,
        "🎯 Target Letter: " + sceneTargetLetter,
        {
            fontFamily: "Arial",
            fontSize: `${this.scale.width * 0.04}px`,
            color: "#fff",
            fontStyle: "bold",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: { x: 20, y: 10 }
        }
    ).setOrigin(0.5);

    //hit counter text
    hitCounterText = this.add.text(
        this.scale.width - 40,
        40,
        "Hits: 0",
        {
            fontFamily: "Arial",
            fontSize: `${this.scale.width * 0.035}px`,
            color: "#fff",
            fontStyle: "bold",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: { x: 20, y: 10 }
        }
    ).setOrigin(1, 0.5);

    //input's
    this.input.on('pointerdown', (pointer) => {
        
        // Detect double-tap
        let currentTime = this.time.now;
        if (currentTime - lastTapTime < 300) {
            // DOUBLE-TAP detected
            startAiming(pointer, this);
        }
        lastTapTime = currentTime;
    });

    this.input.on('pointermove', (pointer) => {
        if (isAiming) {
            rotateBowToward(pointer);
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (isAiming) {
            fireArrow(pointer, this);
        }
    });

    //collision
    this.physics.add.overlap(
        arrowGroup,
        balloonsGroup,
        (arrow, balloon) => handleArrowHit(arrow, balloon ,this)
    );
}

// UPDATE loop function
function update() {
    if (gameFrozen) return;

    balloonsGroup.getChildren().forEach(balloon => {
        // balloon movement 
        balloon.x += balloon.moveX;
        balloon.y += balloon.moveY;

        const w = this.scale.width; //// Prevent leaving screen
        const h = this.scale.height;
        if (balloon.x < balloon.displayWidth/2) {
            balloon.x = balloon.displayWidth/2;           
            balloon.moveX *= -1;
        }
        if (balloon.x > w - balloon.displayWidth/2) {
            balloon.x = w - balloon.displayWidth/2;   
            balloon.moveX *= -1;
        }

        if (balloon.y < balloon.displayHeight/2) {
            balloon.y = balloon.displayHeight/2;
            balloon.moveY *= -1;
        }
        if (balloon.y > h - balloon.displayHeight/2 - 120) {
            balloon.y = h - balloon.displayHeight/2 - 120;
            balloon.moveY *= -1;
        }

        // keep text synced - inside balloon
        balloon.letterText.x = balloon.x;
        balloon.letterText.y = balloon.y;

        // keep balloon away from bow
        const safeRadius = this.scale.height * 0.10; 
        const dx = balloon.x - bow.x;
        const dy = balloon.y - bow.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < safeRadius) {
            const angle = Math.atan2(dy, dx);
            const pushSpeed = 1.5;

            balloon.x += Math.cos(angle) * pushSpeed * 3;
            balloon.y += Math.sin(angle) * pushSpeed * 3;

            balloon.moveX = Math.cos(angle) * pushSpeed;
            balloon.moveY = Math.sin(angle) * pushSpeed;
        }

    });
}

// BALLOON SPAWNER FUNCTION
function spawnBalloon(x, y, letterName) {
    const balloon = this.add.image(x, y, "balloon").setOrigin(0.5);
    
    let balloonScale = (this.scale.width * 0.12) / 256;   // balloon size ratio
    balloon.setScale(balloonScale);

    // Add the balloon to group
    balloonsGroup.add(balloon);

    // Add letter text inside balloon
    let text = this.add.text(x, y, letterName, {
        fontFamily: "Arial",
        fontSize: `${24 * balloonScale}px`,
        color: "#000",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Attach text to balloon object
    balloon.letterText = text;

    // Add balloon to physics system (setting a circle shape around the balloon)
    this.physics.add.existing(balloon);
    balloon.body.setCircle((256 * balloonScale) / 2);

    balloon.body.setOffset(
        (balloon.displayWidth - (256 * balloonScale)) / 2,
        (balloon.displayHeight - (256 * balloonScale)) / 2
    );

    // RANDOM FLOATING MOVEMENT
    // Random direction (-1, 1)
    const dirX = Phaser.Math.Between(-1, 1) === 0 ? 1 : -1;
    const dirY = Phaser.Math.Between(-1, 1) === 0 ? 1 : -1;

    // Random slow speed
    const speed = Phaser.Math.FloatBetween(0.2, 0.5);

    balloon.moveX = dirX * speed;
    balloon.moveY = dirY * speed;
}

// Start aiming function
function startAiming(pointer, scene) {
    isAiming = true;

    if (aimArrow) aimArrow.destroy();

    aimArrow = scene.add.image(bow.x, bow.y, "arrow").setOrigin(0.5);

    let arrowScale = (scene.scale.width * 0.08) / 80;
    aimArrow.setScale(arrowScale);

    aimArrow.rotation = -Math.PI / 2;

    rotateBowToward(pointer);
};
-
// ROTATE BOW TOWARD POINTER
function rotateBowToward(pointer) {
    const dx = pointer.x - bow.x;
    const dy = pointer.y - bow.y;
    const angle = Math.atan2(dy, dx); // This angle assumes arrow points RIGHT

    bow.rotation = angle + Math.PI / 2;

    if (aimArrow) { //place arrow in front of bow
        const offset = bow.displayWidth * 0.35;

        aimArrow.x = bow.x + Math.cos(angle) * offset;
        aimArrow.y = bow.y + Math.sin(angle) * offset;

        aimArrow.rotation = angle;
    }
}

// FIRE ARROW ON RELEASE
function fireArrow(pointer, scene) {
    isAiming = false;
    if (!aimArrow) return; 

    const angle = aimArrow.rotation;

        // Spawn arrow at bow TIP
    const offset = bow.displayWidth * 0.35;
    const startX = bow.x + Math.cos(angle) * offset;
    const startY = bow.y + Math.sin(angle) * offset;

    const realArrow = scene.physics.add.image(bow.x, bow.y, "arrow")    // arrow points RIGHT
        .setOrigin(0.5)
        .setScale(aimArrow.scale)
        .setRotation(angle);

    arrowGroup.add(realArrow);

    // arrow hitbox size before hitting balloon
    realArrow.body.setSize(
        realArrow.displayWidth * 0.6,
        realArrow.displayHeight * 0.3
    );

    const speed = scene.scale.width * 1.2;
    realArrow.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );

    scene.time.delayedCall(3000, () => {
        if (realArrow && realArrow.active) realArrow.destroy();
    });

    aimArrow.destroy();
    aimArrow = null;
}

// HANDLE ARROW HIT collision
function handleArrowHit(arrow, balloon, scene) {

    if (!balloon.active || !arrow.active) return;

    arrow.destroy();

    const isCorrect = (balloon.letterText.text === sceneTargetLetter);

    if (isCorrect) {
        // for correct hit
        scene.sound.play("bubblepop");
        // scene.sound.play("correct");

        createConfetti(balloon.x, balloon.y, scene);

        balloon.letterText.destroy();
        balloon.destroy();

        hitCounter++;
        streakCounter++;
        hitCounterText.setText("Hits: " + hitCounter);

        chooseNewTarget(scene); //change target letter

        // 5-HIT STREAK = Celebration
        if (streakCounter >= 5) {
            createConfetti(scene.scale.width / 2, scene.scale.height / 2, scene);
            scene.sound.play("victory");
            streakCounter = 0;

            showWinPopup(scene); 
        }

    } else {
        // WRONG HIT
        scene.sound.play("wrong");

        streakCounter = 0;

        showFailPopup(scene);

        scene.tweens.add({
            targets: [balloon, balloon.letterText],
            x: balloon.x + 15,
            duration: 80,
            yoyo: true,
            repeat: 2
        });
    }
}

function chooseNewTarget(scene) {
    let available = balloonsGroup.getChildren().filter(b => b.active);

    if (available.length === 0) return;

    let randomBalloon = Phaser.Utils.Array.GetRandom(available);

    sceneTargetLetter = randomBalloon.letterText.text;

    targetText.setText("🎯 Target Letter: " + sceneTargetLetter);
}

//SUCCESS POPPING 5 BALLOONS
function showWinPopup(scene) {
    gameFrozen = true;

    winPopup = scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2,
        "🎉 CONGRATULATIONS! 🎉\nYou got 5 correct hits!\n\nTap anywhere or press SPACE to restart",
        {
            fontFamily: "Arial",
            fontSize: `${scene.scale.width * 0.05}px`,
            color: "#fff",
            fontStyle: "bold",
            align: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: { x: 40, y: 40 }
        }
    ).setOrigin(0.5).setDepth(99999);

    // Input to restart
    scene.input.once("pointerdown", () => restartGame(scene));
    scene.input.keyboard.once("keydown-SPACE", () => restartGame(scene));
}


//FAIL TO POP 5 BALLOONS
function showFailPopup(scene) {
    gameFrozen = true;

    losePopup = scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2,
        "❌ Wrong Balloon!\nYour 5-hit streak was broken.\nTap to try again",
        {
            fontFamily: "Arial",
            fontSize: `${scene.scale.width * 0.045}px`,
            color: "#fff",
            fontStyle: "bold",
            align: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: { x: 40, y: 40 }
        }
    ).setOrigin(0.5).setDepth(99999);

    // Input to restart
    scene.input.once("pointerdown", () => restartGame(scene));
    scene.input.keyboard.once("keydown-SPACE", () => restartGame(scene));
}

// RESTART THE GAME 
function restartGame(scene) {
    gameFrozen = false;
    hitCounter = 0;
    streakCounter = 0;

    if (winPopup) winPopup.destroy();
    if (losePopup) losePopup.destroy();

    hitCounterText.setText("Hits: 0");

    //destroy all objects
    balloonsGroup.getChildren().forEach(b => {
        if (b.letterText) b.letterText.destroy();
    });
    balloonsGroup.clear(true, true);
    arrowGroup.clear(true, true);

    // Respawn all balloons at restart
    Phaser.Utils.Array.Shuffle(possibleLetters);
    for (let i = 0; i < 6; i++) {
        let bx = Phaser.Math.Between(100, scene.scale.width - 100);
        let by = Phaser.Math.Between(100, scene.scale.height - 200);
        spawnBalloon.call(scene, bx, by, possibleLetters[i]);
    }

    chooseNewTarget(scene); // New target
}

//confetti
function createConfetti(x, y, scene) {

    const scaleSize = (scene.scale.width * 0.25) / 128;

    const spr = scene.add.sprite(x, y, "confetti")
        .setScale(scaleSize)
        .setOrigin(0.5)
        .setDepth(9999);

    spr.play("confettiPop");
    // scene.sound.play("yay");


    spr.on("animationcomplete", () => {
        spr.destroy();
    });
}