// “Characteristics of pattern formation and evolution in approximations of Physarum transport networks.”
// https://uwe-repository.worktribe.com/output/980579

// Gaussian kernel for diffusion of each trail
const gaussianFilter = [
	1/16, 1/8, 1/16,
	 1/8, 1/4,  1/8,
	1/16, 1/8, 1/16,
];

let W = window.innerWidth;
let H = window.innerHeight;
let img;
const agents = [];
let trail;
let shouldRegenerate = true;
let paused = false;


// dat.GUI
let agentsSettings = function(){
	this.numAgents    = 4000;           // Number of agents

    this.sensorOffset = 10;             // Sensor offset distance
	this.sensorAngle  = 40/180*Math.PI; // Sensor angle from forward position in radians
	
	this.turnSpeed    = 40/180*Math.PI; // A turning rate for each agent in radians
	this.speed        = 3;              // A speed for each agent
	
	this.decayT       = 0.95;           // Trail-map chemoattractant diffusion decay factor
	this.depositT     = 1.33;           // Chemoattractant deposition per step

	this.rParticle    = 255;            // Red channel (Particle)
	this.gParticle    = 255;            // Green channel (Particle)
	this.bParticle    = 255;            // Blue channel (Particle)

	this.rBackground  = 0;              // Red channel (background/trail)
	this.gBackground  = 0;              // Green channel (background/trail)
	this.bBackground  = 0;              // Blue channel (background/trail)

	this.startCenter  = false;          // Starts each agent in the center of the screen
	this.pause        = false;          // Pause the main loop
}//Agents()
let settings = new agentsSettings();



function setup(){
	createCanvas(W, H);
	background(0);
	trail = new Float32Array(W * H);
	img = createGraphics(W, H);
	img.pixelDensity(1);
	
	let gui = new dat.GUI();

	gui.add(settings, 'numAgents'   , 1  , 20000);

	var f1 = gui.addFolder('Sensor Actions');
	f1.add(settings, 'sensorOffset', 1  , 100  );
	f1.add(settings, 'sensorAngle' , 0.1, PI   );
	f1.open();

	var f2 = gui.addFolder('Speed Actions');
	f2.add(settings, 'turnSpeed'   , 0.1, PI   );
	f2.add(settings, 'speed'       , 0  , 15   );
	f2.open();

	var f3 = gui.addFolder('Chemoattractant Deposition and Decay');
	f3.add(settings,   'depositT'    , 0  , 10   );
	f3.add(settings,   'decayT'      , 0  , 1    );
	f3.open();

	var f4 = gui.addFolder('Particle Color');
	f4.add(settings, 'rParticle', 0, 255);
	f4.add(settings, 'gParticle', 0, 255);
	f4.add(settings, 'bParticle', 0, 255);
	f4.open();

	var f5 = gui.addFolder('Background Color');
	f5.add(settings, 'rBackground', 0, 255);
	f5.add(settings, 'gBackground', 0, 255);
	f5.add(settings, 'bBackground', 0, 255);
	f5.open();

	gui.add(settings, 'startCenter');
	gui.add(settings, 'pause').onChange(function() { pause(); });

	let obj = { reset: function () { reset(); } }
	gui.add(obj, 'reset');
}//setup()



function index(x, y) { return x + y * width; }//index()



function compute(agents, trail, width, height){
	for(let agent of agents){
		function sense(theta){
			return trail[index(
				Math.round(agent.x + Math.cos(agent.randHeading + theta) * settings.sensorOffset),
				Math.round(agent.y + Math.sin(agent.randHeading + theta) * settings.sensorOffset)
			)];
		}//sense()

		const F  = sense(0);                     // Forward
		const FL = sense(settings.sensorAngle);  // Forward left
		const FR = sense(-settings.sensorAngle); // Forward right

		if (F > FL && F > FR)
			continue;
		else if (FL > FR)
			agent.randHeading += settings.turnSpeed;
		else if (FR > FL)
			agent.randHeading -= settings.turnSpeed;
		else
			agent.randHeading += Math.round(Math.random() * 2 - 1) * settings.turnSpeed;
	}//for

	for(let agent of agents){
		agent.x += Math.cos(agent.randHeading) * settings.speed;
		agent.y += Math.sin(agent.randHeading) * settings.speed;
		agent.x = (agent.x + W) % W;
		agent.y = (agent.y + H) % H;
	}//for

	for(let agent of agents){
		const x = Math.round(agent.x);
		const y = Math.round(agent.y);

		if (x <= 0 || y <= 0 || x >= W-1 || y >= H-1)
			continue;
		trail[index(x, y)] += settings.depositT;
	}//for

	let decayingTrail = Float32Array.from(trail);
	for(let y = 1; y < H-1; ++y){
		for(let x = 1; x < W-1; ++x){
			const diffused = (
				decayingTrail[index(x-1, y-1)] * gaussianFilter[0] +
				decayingTrail[index(x  , y-1)] * gaussianFilter[1] +
				decayingTrail[index(x+1, y-1)] * gaussianFilter[2] +

				decayingTrail[index(x-1, y)] * gaussianFilter[3] +
				decayingTrail[index(x  , y)] * gaussianFilter[4] + 
				decayingTrail[index(x+1, y)] * gaussianFilter[5] +

				decayingTrail[index(x-1, y+1)] * gaussianFilter[6] +
				decayingTrail[index(x  , y+1)] * gaussianFilter[7] +
				decayingTrail[index(x+1, y+1)] * gaussianFilter[8]
			);
			trail[index(x, y)] = Math.min(1.0, diffused * settings.decayT);
		}//for
	}//for

	return trail;
}//compute()



function regenerate(){
	agents.splice(0, agents.length);

	if(settings.startCenter){
		for(let i = 0; i < settings.numAgents; ++i){
			const vectorHeading = 2 * Math.PI*i/settings.numAgents;
			agents.push({
				x: W/2,
				y: H/2,
				randHeading: vectorHeading - Math.PI / 2,
			});
		}//for
	} //if
	else{
		for(let i = 0; i < settings.numAgents; ++i){
			agents.push({
				x: Math.random() * W,
				y: Math.random() * H,
				randHeading: Math.random() * 2 * Math.PI,
			});
		}//for
	}//else
	
	shouldRegenerate = false;
}//regenerate()



function reset(){
	trail = new Float32Array(W*H);
	regenerate();
}//reset()



function pause(){
	if(settings.pause)
		noLoop();
	else
		loop();	
}//pause()



function render(){
	const width = canvas.width;
	const height = canvas.height;
	img.loadPixels();
	
	let i = 0;
	for(let y = 0; y < width; ++y){
		for(let x = 0; x < height; ++x){
			const trailBuffer = trail[i];
			const curbrightness = Math.floor(trailBuffer * 200);
			img.pixels[i*4+0] = curbrightness + settings.rBackground;
			img.pixels[i*4+1] = curbrightness + settings.gBackground;
			img.pixels[i*4+2] = curbrightness + settings.bBackground;
			img.pixels[i*4+3] = 100;
	
			i++;
		}//for
	}//for

  img.updatePixels();
  tint(settings.rParticle, settings.gParticle, settings.bParticle);
  img.updatePixels();
}//render()



function draw(){
	// background(0);
	imageMode(CENTER);

	if(shouldRegenerate)
		regenerate();

	trail = compute(agents, trail, W, H);

	render();
	// img.fill(0, 255, 255);
	image(img, W/2, H/2, W, H);
}//draw()



(function () {
	let SSWZ = function () {
		this.keyScrollHandler = function (e) {
			if (e.ctrlKey) {
				e.preventDefault();
				return false;
			}
		}
	};

	if (window === top) {
		let sswz = new SSWZ();
		window.addEventListener('wheel', sswz.keyScrollHandler, { passive: false });
	}
})();