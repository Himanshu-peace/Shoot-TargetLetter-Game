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
    this.load.audio("yay", "assets/yay.mp3");
    this.load.audio("bubblepop", "assets/bubble-pop-sound.mp3");
    this.load.audio("victory", "assets/victory.mp3");
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

    spawnBalloon.call(this, 200, 200, "Da");
    spawnBalloon.call(this,  500, 150, "moon");
    spawnBalloon.call(this, this.scale.width - 200, 300, "Meem");
    spawnBalloon.call(this, this.scale.width / 2, 150, "Noon")

    // ------------------- ARROW EXAMPLE SCALING -------------------
    //not needed on the screen arrow should be coming from bow only
    // exampleArrow = this.add.image(
    //     bow.x,
    //     bow.y - 120,
    //     "arrow"
    // ).setOrigin(0.5);

    /*
      Arrow original: 80×80  
      Desired: ~8% of screen width
    */
    // let arrowScale = (this.scale.width * 0.08) / 80;
    // exampleArrow.setScale(arrowScale);


    // ------------------- CONFETTI ANIMATION -------------------
    this.anims.create({
        key: "confettiPop",
        frames: this.anims.generateFrameNumbers("confetti", {
            start: 0, end: 15
        }),
        frameRate: 20,
        hideOnComplete: true
    });

    confettiAnimReady = true;

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
// function spawnBalloon(x, y, letterName) {
//     const balloon = this.add.image(x, y, "balloon").setOrigin(0.5);

//     /*
//       Balloon original: 256×256
//       Desired scale: 12% of screen width
//     */
//     let balloonScale = (this.scale.width * 0.12) / 256;
//     balloon.setScale(balloonScale);

//     // Add letter label on balloon
//     let text = this.add.text(x, y, letterName, {
//         fontFamily: "Arial",
//         fontSize: `${24 * balloonScale}px`,
//         color: "#000",
//         fontStyle: "bold"
//     }).setOrigin(0.5);

//     // Group balloon & text together
//     balloonsGroup.add(balloon);
// }

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
}



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

    const realArrow = scene.physics.add.image(bow.x, bow.y, "arrow")
        .setOrigin(0.5)
        .setScale(aimArrow.scale)
        .setRotation(angle);

    const speed = scene.scale.width * 1.2;
    realArrow.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );

    aimArrow.destroy();
    aimArrow = null;
}


