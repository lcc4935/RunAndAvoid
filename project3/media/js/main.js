// We will use `strict mode`, which helps us by having the browser catch many common JS mistakes
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
"use strict";
const app = new PIXI.Application({
    width: 600,
    height: 600
});
//document.body.appendChild(app.view);
document.getElementById("game").appendChild(app.view);

// constants
const sceneWidth = app.view.width;
const sceneHeight = app.view.height;	

// pre-load the images
app.loader.
    add([
        "media/images/squareCharacter.jpg",
    ]);
app.loader.onProgress.add(e => { console.log(`progress=${e.progress}`) });
app.loader.onComplete.add(setup);
app.loader.load();

// aliases
let stage;

// game variables
let startScene;
let gameScene,ship,lifeLabel,hitBlue,hitRed,hitGreen;
let gameOverScene;

let circles = [];
let cBlue = [];
let cGreen = [];
let cRed = [];
let bullets = [];
let aliens = [];
let explosions = [];
let explosionTextures;
let life = 5;
let levelNum = 1;
let paused = true;
let scale = 0.1;

//Part 1

function setup() {
	stage = app.stage;
    // #1 - Create the `start` scene
    startScene = new PIXI.Container();
    stage.addChild(startScene);
	
    // #2 - Create the main `game` scene and make it invisible
    gameScene = new PIXI.Container();
    gameScene.visible = false;
    stage.addChild(gameScene);

    // #3 - Create the `gameOver` scene and make it invisible
    gameOverScene = new PIXI.Container();
    gameOverScene.visible = false;
    stage.addChild(gameOverScene);
	
    // #4 - Create labels for all 3 scenes
    createLabelsAndButtons();
	
    // #5 - Create ship
    scale = scaleSize();
    ship = new Ship(scale);
    console.log(scale);
    gameScene.addChild(ship);
	
    // #6 - Load Sounds
    hitBlue = new Howl({
        src: ['media/sounds/hitBlue.mp3']
    });
    hitRed = new Howl({
        src: ['media/sounds/hitRed.wav']
    });
    hitGreen = new Howl({
        src: ['media/sounds/hitGreen.mp3']
    });
		
	// #8 - Start update loop
    app.ticker.add(gameLoop);
	
    // #9 - Start listening for click events on the canvas
	
	// Now our `startScene` is visible
	// Clicking the button calls startGame()
}

function createLabelsAndButtons() {

    let buttonStyle = new PIXI.TextStyle({
        fill: 0x0000FF,
        fontSize: 48,
        fontFamily: "Futura"
    });

    let startLabel1 = new PIXI.Text("Run & Avoid");
    startLabel1.style = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 107,
        fontFamily: 'Futura',
        stroke: 0x0000FF,
        strokeThickness: 6
    });
    startLabel1.x = 10;
    startLabel1.y = 150;
    startScene.addChild(startLabel1);

    let startButton = new PIXI.Text("Play");
    startButton.style = buttonStyle;
    startButton.x = 240;
    startButton.y = sceneHeight - 200;
    startButton.interactive = true;
    startButton.buttonMode = true;
    startButton.on("pointerup",startGame);
    startButton.on('pointover',e=>e.targetalpha = 0.7);
    startButton.on(`pointerout`,e=>e.currentTarget.alpha = 1.0);
    startScene.addChild(startButton);

    let textStyle = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 18,
        fontFamily: "Futura",
        stroke: 0x0000FF,
        strokeThickness: 4
    });

    lifeLabel = new PIXI.Text();
    lifeLabel.style = textStyle;
    lifeLabel.x = 5;
    lifeLabel.y = 26;
    gameScene.addChild(lifeLabel);
    increaseLifeBy(0);
    decreaseLifeBy(0);

    let gameOverText = new PIXI.Text("Game Over!");
    textStyle = new PIXI.TextStyle({
        fill: 0xFFFFFF,
        fontSize: 64,
        fontFamily: "Futura",
        stroke: 0x0000FF,
        strokeThickness: 6
    });
    gameOverText.style = textStyle;
    gameOverText.x = 100;
    gameOverText.y = sceneHeight/2 - 160;
    gameOverScene.addChild(gameOverText);

    let playAgainButton = new PIXI.Text("Play Again?");
    playAgainButton.style = buttonStyle;
    playAgainButton.x = 150;
    playAgainButton.y = sceneHeight - 100;
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on("pointerup",startGame);
    playAgainButton.on("pointerover",e=>e.target.alpha = 0.7);
    playAgainButton.on("pointerout",e=>e.currentTarget.alpha = 1.0);
    gameOverScene.addChild(playAgainButton);

}

function startGame() {
    startScene.visible = false;
    gameOverScene.visible = false;
    gameScene.visible = true;
}

function increaseLifeBy(value) { //greenvalue
    life += value;
    lifeLabel.text = `Life ${life}`;
}

function decreaseLifeBy(value) { //redvalue
    life -= value;
    lifeLabel.text = `Life ${life}`;
}

//Part 2

function gameLoop(){
    if (paused) return; // keep this commented out for now

	// #1 - Calculate "delta time"
    let dt = 1/app.ticker.FPS;
    if (dt > 1/12) dt=1/12;
	
	
	// #2 - Move Ship
	let mousePosition = app.renderer.plugins.interaction.mouse.global;
    //ship.position = mousePosition;

    let amt = 6 * dt;

    let newX = lerp(ship.x, mousePosition.x, amt);
    let newY = lerp(ship.y, mousePosition.y, amt);

    let w2 = ship.width/2;
    let h2 = ship.height/2;
    //let w2 = shipSizeWidth();
    //let h2 = shipSizeHeight();

    ship.x = clamp(newX,0+w2,sceneWidth-w2);
    ship.y = clamp(newY,0+h2,sceneHeight-h2);
	
	// #3 - Move Circles
	for (let c of circles) {
        c.move(dt);
        if (c.x <= c.radius || c.x >= sceneWidth-c.radius) {
            c.reflectX();
            c.move(dt);
        }
        if (c.y <= c.radius || c.y >= sceneHeight-c.radius) {
            c.reflectY();
            c.move(dt);
        }
    }
	
	// #4 - Move Bullets
    for (let b of bullets){
		b.move(dt);
	}
	
	// #5 - Check for Collisions
	for (let c of circles) {
        if (c.isAlive && rectsIntersect(c,ship) && c.value == "green") {
            hitGreen.play();
            gameScene.removeChild(c);
            c.isAlive = false;
            increaseLifeBy(1);
            cGreen.pop();
            
            scale = scaleSize();
            ship.resize(scale);

        }
        if (c.isAlive && rectsIntersect(c,ship) && c.value == "red") {
            hitRed.play();
            gameScene.removeChild(c);
            c.isAlive = false;
            decreaseLifeBy(1);
            cRed.pop();

            scale = scaleSize();
            ship.resize(scale);

        }
        if (c.isAlive && rectsIntersect(c,ship) && c.value == "blue") {
            hitBlue.play();
            gameScene.removeChild(c);
            c.isAlive = false;
            cBlue.pop();

        }
    }

	// #6 - Now do some clean up
    circles = circles.filter(c=>c.isAlive);
    explosions = explosions.filter(e=>e.playing);
	
	// #7 - Is game over?
	if (life <= 0){
        end();
        return; // return here so we skip #8 below
    }
	
    // #8 - Load next level
    if (cBlue.length == 0){
        cRed.length = 0;
        cGreen.length = 0;
        levelNum ++;
        loadLevel();
    }
}

function createCircles(numCircles) {
    let red = getRandomInt(numCircles/3, numCircles/2);
    let green = getRandomInt(numCircles/4, numCircles/2);
    let blue = numCircles;
    for (let i = 0; i < blue; i++) {
        let c = new Circle(10,0x0000FF);
        c.x = Math.random() * (sceneWidth - 50) + 25;
        c.y = Math.random() * (sceneWidth - 400) + 25;
        c.value = "blue";
        cBlue.push(c);
        circles.push(c);
        gameScene.addChild(c);
    }
    for (let i = 0; i < green; i++) {
        let c = new Circle(10,0x00FF00);
        c.x = Math.random() * (sceneWidth - 50) + 25;
        c.y = Math.random() * (sceneWidth - 400) + 25;
        c.value = "green";
        cGreen.push(c);
        circles.push(c);
        gameScene.addChild(c);
    }
    for (let i = 0; i < red; i++) {
        let c = new Circle(10,0xFF0000);
        c.x = Math.random() * (sceneWidth - 50) + 25;
        c.y = Math.random() * (sceneWidth - 400) + 25;
        c.value = "red";
        cRed.push(c);
        circles.push(c);
        gameScene.addChild(c);
    }

}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }

function loadLevel(){
	createCircles(levelNum * 5);
	paused = false;
}

function startGame() {
    startScene.visible = false;
    gameOverScene.visible = false;
    gameScene.visible = true;
    levelNum = 1;
    life = 5;
    increaseLifeBy(0);
    decreaseLifeBy(0);
    ship.x = 300;
    ship.y = 550;
    loadLevel();
}

function end() {
    paused = true;
    scale = 0.1;
    circles.forEach(c=>gameScene.removeChild(c));
    circles = [];
    cBlue = [];
    cRed = [];
    cGreen = [];

    bullets.forEach(b=>gameScene.removeChild(b));
    bullets = [];

    explosions.forEach(e=>gameScene.removeChild(e));
    explosions = [];

    gameOverScene.visible = true;
    gameScene.visible = false;
}

//Part 3

function scaleSize() {
    if (life >= 10){
        scale = 0.2;
    } else if (life == 9) {
        scale = 0.18;
    } else if (life == 8) {
        scale = 0.16;
    } else if (life == 7) {
        scale = 0.14;
    } else if (life == 6) {
        scale = 0.12;
    } else if (life == 5) {
        scale = 0.1;
    } else if (life == 4) {
        scale = 0.08;
    } else if (life == 3) {
        scale = 0.06;
    } else if (life == 2) {
        scale = 0.04;
    } else if (life <= 1) {
        scale = 0.02;
    }

    return scale;
}