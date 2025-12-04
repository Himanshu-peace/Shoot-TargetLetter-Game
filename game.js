// Scales everything based on screen size
// Background fills the whole screen
// Bow scales to 20% of screen width
// Balloons scale to 12% of screen width
// Arrow scales to 8% of screen width
// Confetti sprite sheet loaded and ready


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

// -------------------------------------------
// PRELOAD (LOAD ASSETS)
// -------------------------------------------
function preload() {

    // ------------------- IMAGES -------------------
    this.load.image("background", "assets/sky-background2.png");        // 1080×1080
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
    let bowScale = (this.scale.width * 0.20) / 300;
    bow.setScale(bowScale);


    // ------------------- BALLOON GROUP -------------------
    balloonsGroup = this.physics.add.group();

    spawnBalloon.call(this, 200, 200, "Da");
    spawnBalloon.call(this, this.scale.width - 200, 300, "Meem");
    spawnBalloon.call(this, this.scale.width / 2, 150, "Noon");


    // ------------------- ARROW EXAMPLE SCALING -------------------
    exampleArrow = this.add.image(
        bow.x,
        bow.y - 120,
        "arrow"
    ).setOrigin(0.5);

    /*
      Arrow original: 80×80  
      Desired: ~8% of screen width
    */
    let arrowScale = (this.scale.width * 0.08) / 80;
    exampleArrow.setScale(arrowScale);


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
}

// -------------------------------------------
// UPDATE LOOP
// -------------------------------------------
function update() {
    // Nothing here yet — this step is ONLY for asset scaling & placement
}

// -------------------------------------------
// BALLOON SPAWNER (WITH LETTER TEXT)
// -------------------------------------------
function spawnBalloon(x, y, letterName) {
    const balloon = this.add.image(x, y, "balloon").setOrigin(0.5);

    /*
      Balloon original: 256×256
      Desired scale: 12% of screen width
    */
    let balloonScale = (this.scale.width * 0.12) / 256;
    balloon.setScale(balloonScale);

    // Add letter label on balloon
    let text = this.add.text(x, y, letterName, {
        fontFamily: "Arial",
        fontSize: `${24 * balloonScale}px`,
        color: "#000",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Group balloon & text together
    balloonsGroup.add(balloon);
}