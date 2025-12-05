//-----------collision-Branch-------------------
// -------------------------------------------
// BASIC GAME CONFIG 
// -------------------------------------------

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

// -------------------------------------------
// VARIABLES
// -------------------------------------------
let bow;
let balloonsGroup;
let exampleArrow; // Show using scale only
let confettiAnimReady = false;
let isAiming = false;
let lastTapTime = 0;
let aimArrow = null;   // arrow that stays with bow during aim
let arrowGroup;

let sceneTargetLetter;     // <-- added
let targetText;            // <-- added

// -------------------------------------------
// PRELOAD (LOAD ASSETS)
// -------------------------------------------
function preload() {

    // ------------------- IMAGES -------------------
    this.load.image("background", "assets/sky-background1.png");        // 1080×1080
    this.load.image("balloon", "assets/balloon-removebg-preview.png"); // 256×256
    this.load.image("bow", "assets/bow-removebg-preview.png");         // 300×300
    this.load.image("arrow", "assets/arrow-removebg.png");             // 80×80

    // Confetti sprite sheet (16 frames, 128×128 each)
    this.load.spritesheet("confetti", "assets/confetti-sprite-removebg.png", {
        frameWidth: 128,
        frameHeight: 128
    });

    // ------------------- SOUNDS -------------------
    this.load.audio("correct", "assets/correct.mp3");
    this.load.audio("wrong", "assets/wrong.mp3");
    this.load.audio("yay", "assets/yay-sound.mp3");
    this.load.audio("bubblepop", "assets/bubble-pop-sound.mp3");
    this.load.audio("victory", "assets/victory.mp3");
    this.load.audio("confettiPop", "assets/applause-sound.mp3");
}

// -------------------------------------------
// CREATE (PLACE + SCALE ASSETS)
// -------------------------------------------
function create() {

    // ------------------- BACKGROUND -------------------
    let bg = this.add.image(0, 0, "background").setOrigin(0, 0);

    // SCALE background full-screen regardless of aspect ratio
    bg.setDisplaySize(this.scale.width, this.scale.height);


    // ------------------- BOW SCALING -------------------
    bow = this.add.image(
        this.scale.width / 2,
        this.scale.height - (this.scale.height * 0.15),
        "bow"
    );
    bow.setOrigin(0.5);

    /*
      Bow original dimensions: 300×300
      We want bow width ≈ 20% of screen width
    */
    let bowScale = (this.scale.width * 0.20) / 300;    //this keyword is used to access the current scene
    bow.setScale(bowScale);


    // ------------------- BALLOON GROUP -------------------
    balloonsGroup = this.physics.add.group();

    //test balloons
    spawnBalloon.call(this, 200, 200, "Da");
    spawnBalloon.call(this,  500, 150, "moon");
    spawnBalloon.call(this, this.scale.width - 200, 300, "Meem");
    spawnBalloon.call(this, this.scale.width / 2, 150, "Noon")

    // ------------------- CONFETTI ANIMATION -Fix------------------
this.anims.create({
    key: "confettiPop",
    frames: this.anims.generateFrameNumbers("confetti", { start: 0, end: 15 }),
    frameRate: 24,
    repeat: 0,
    hideOnComplete: true
});


    confettiAnimReady = true;

    arrowGroup = this.physics.add.group();

    // -------------------------------------------
    // ADD TARGET LETTER (NEW)
    // -------------------------------------------
    sceneTargetLetter = "Meem";  // using your test target

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

    // -----------------------------------
    // TOUCH / POINTER INPUT
    // -----------------------------------
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

    // -------------------------------------------
    // ENABLE ARROW → BALLOON COLLISION HANDLER
    // -------------------------------------------
    this.physics.add.overlap(
        arrowGroup,
        balloonsGroup,
        (arrow, balloon) => handleArrowHit(arrow, balloon ,this)
    );

    //testing confetti
    // this.input.once("pointerdown", () => {
    //     createConfetti(this.scale.width/2, this.scale.height/2, this);
    //     this.sound.play("confettiPop");
    // });

}

// -------------------------------------------
// UPDATE LOOP
// -------------------------------------------
function update() {
    // Nothing here yet — this step is ONLY for asset scaling & placement
    balloonsGroup.getChildren().forEach(balloon => {
        
        // Move balloon
        balloon.x += balloon.moveX;
        balloon.y += balloon.moveY;

        // Move its label with it
        balloon.letterText.x = balloon.x;
        balloon.letterText.y = balloon.y;

        // ------------------------------
        // WRAP AROUND SCREEN EDGES
        // ------------------------------
        const w = this.scale.width;
        const h = this.scale.height;

        if (balloon.x > w + 50) balloon.x = -50;
        if (balloon.x < -50) balloon.x = w + 50;

        if (balloon.y > h + 50) balloon.y = -50;
        if (balloon.y < -50) balloon.y = h + 50;

        // Keep text aligned with wrapped balloon
        balloon.letterText.x = balloon.x;
        balloon.letterText.y = balloon.y;
    });
}

// -------------------------------------------
// BALLOON SPAWNER (WITH LETTER TEXT)
// -------------------------------------------
function spawnBalloon(x, y, letterName) {
    const balloon = this.add.image(x, y, "balloon").setOrigin(0.5);
    
    // Scale balloon (same as before)
    let balloonScale = (this.scale.width * 0.12) / 256;
    balloon.setScale(balloonScale);

    // Add the balloon to group
    balloonsGroup.add(balloon);

    // ------------------------------
    // LETTER LABEL
    // ------------------------------
    let text = this.add.text(x, y, letterName, {
        fontFamily: "Arial",
        fontSize: `${24 * balloonScale}px`,
        color: "#000",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Attach text to balloon object
    balloon.letterText = text;

    // -------------------------------------------
    // FIX BALLOON HITBOX (NEW)
    // -------------------------------------------
    this.physics.add.existing(balloon);
    balloon.body.setCircle((256 * balloonScale) / 2);

    balloon.body.setOffset(
        (balloon.displayWidth - (256 * balloonScale)) / 2,
        (balloon.displayHeight - (256 * balloonScale)) / 2
    );

    // ------------------------------
    // RANDOM FLOATING MOVEMENT
    // ------------------------------
    // Random direction (-1, 1)
    const dirX = Phaser.Math.Between(-1, 1) === 0 ? 1 : -1;
    const dirY = Phaser.Math.Between(-1, 1) === 0 ? 1 : -1;

    // Random slow speed (good for kids)
    const speed = Phaser.Math.FloatBetween(0.2, 0.5);

    balloon.moveX = dirX * speed;
    balloon.moveY = dirY * speed;
}


// -----------------------------------
// START AIMING
// -----------------------------------
function startAiming(pointer, scene) {
    isAiming = true;

    if (aimArrow) aimArrow.destroy();

    aimArrow = scene.add.image(bow.x, bow.y, "arrow").setOrigin(0.5);

    let arrowScale = (scene.scale.width * 0.08) / 80;
    aimArrow.setScale(arrowScale);

    // Rotation fix: PNG points UP, but Phaser expects arrow to point RIGHT
    aimArrow.rotation = -Math.PI / 2;

    rotateBowToward(pointer);
};



// -----------------------------------
// ROTATE BOW TOWARD POINTER
// -----------------------------------
function rotateBowToward(pointer) {
    const dx = pointer.x - bow.x;
    const dy = pointer.y - bow.y;
    const angle = Math.atan2(dy, dx); // This angle assumes arrow points RIGHT

    // If bow PNG points UP by default, add +90 degrees
    bow.rotation = angle + Math.PI / 2;

    // if (aimArrow) {
    //     aimArrow.x = bow.x;
    //     aimArrow.y = bow.y;

    //     // Arrow should match the firing angle correctly
    //     aimArrow.rotation = angle;
    // }

    if (aimArrow) {
    // distance arrow should appear IN FRONT of bow
        const offset = bow.displayWidth * 0.35;

        aimArrow.x = bow.x + Math.cos(angle) * offset;
        aimArrow.y = bow.y + Math.sin(angle) * offset;

        aimArrow.rotation = angle;
    }
}


// -----------------------------------
// FIRE ARROW ON RELEASE
// -----------------------------------
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

    // FIX ARROW HITBOX
    realArrow.body.setSize(
        realArrow.displayWidth * 0.6,
        realArrow.displayHeight * 0.3
    );

    const speed = scene.scale.width * 1.2;
    realArrow.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );

        // Auto-destroy when off-screen
    // realArrow.setCollideWorldBounds(false);
    scene.time.delayedCall(3000, () => {
        if (realArrow && realArrow.active) realArrow.destroy();
    });

    aimArrow.destroy();
    aimArrow = null;
}

// -----------------------------------
// HANDLE ARROW HIT co
// -----------------------------------
function handleArrowHit(arrow, balloon, scene) {

    if (!balloon.active || !arrow.active) return;

    // Remove arrow immediately
    arrow.destroy();

    const targetLetter = "Meem"; // <— for testing; will become dynamic later

    if (balloon.letterText.text === targetLetter) {
        // -------------------------------
        // CORRECT HIT
        // -------------------------------
        scene.sound.play("bubblepop");
        scene.sound.play("correct");

        //debugger point
        // console.log(scene.textures.get("confetti").frameTotal); // 16 frames for confetti Testing
        createConfetti(balloon.x, balloon.y, scene);

        // remove balloon
        balloon.letterText.destroy();
        balloon.destroy();

    } else {
        // -------------------------------
        // WRONG HIT → wiggle balloon
        // -------------------------------
        scene.sound.play("wrong");

        scene.tweens.add({
            targets: [balloon, balloon.letterText],
            x: balloon.x + 15,
            duration: 80,
            yoyo: true,
            repeat: 2
        });
    }
}

// -----------------------------------
// CREATE CONFETTI
// -----------------------------------
function createConfetti(x, y, scene) {

    const scaleSize = (scene.scale.width * 0.25) / 128;

    const spr = scene.add.sprite(x, y, "confetti")
        .setScale(scaleSize)
        .setOrigin(0.5)
        .setDepth(9999);

    spr.play("yay");


    spr.on("animationcomplete", () => {
        spr.destroy();
    });
}