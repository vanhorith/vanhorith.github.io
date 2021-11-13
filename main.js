// “Characteristics of pattern formation and evolution in approximations of Physarum transport networks.”
// https://uwe-repository.worktribe.com/output/980579

let W = window.innerWidth;
let H = window.innerHeight;

// dat.GUI
let agentsSettings = function(){
    this.sensorOffset = 50;              // Sensor offset distance
	this.sensorAngle = 22.5/180*Math.PI; // Sensor angle from forward position
	this.turnSpeed = 22.5/180*Math.PI;   // A turning rate for each agent
	this.speed = 3;                      // A speed for each agent
	this.decayT = 0.95;                  // Trail-map chemoattractant diffusion decay factor
	this.depositT = 5;                       // Chemoattractant deposition per step
	this.numAgents = 5000;               // Number of agents

	this.startCenter = false;            // Starts each agent in the center of the screen
}//Agents()

let settings = new agentsSettings();
let img;
const agents = [];
let trail;



function setup(){
	createCanvas(W, H);
	trail = new Float32Array(W * H);
	img = createGraphics(W, H);
	img.pixelDensity(1);
	
	let gui = new dat.GUI();
	gui.add(settings, 'sensorOffset', 1, 100);
	gui.add(settings, 'sensorAngle', 0.1, PI);
	gui.add(settings, 'turnSpeed', 0.1, PI);
	gui.add(settings, 'speed', 0, 15);
	gui.add(settings, 'depositT', 0, 25);
	gui.add(settings, 'decayT', 0, 1);
	gui.add(settings, 'numAgents', 1, 20000);

	gui.add(settings, 'startCenter');

	let obj = { reset: function () { reset(); } }
	gui.add(obj, 'reset');
}//setup()



function index(x, y) { return x + y * width; }//index()



function compute(agents, trail, W, H){
	for(let agent of agents){
		function sense(theta){
			return trail[index(
				Math.round(agent.x + Math.cos(agent.randHeading + theta) * settings.sensorOffset),
				Math.round(agent.y + Math.sin(agent.randHeading + theta) * settings.sensorOffset)
			)];
		}//sense()

		const FL = sense(settings.sensorAngle);
		const F  = sense(0);
		const FR = sense(-settings.sensorAngle);

		const randTurnSpeed = (Math.random() * 0.25 + 1) * settings.turnSpeed;

		if (F > FL && F > FR)
			continue;
		else if (FL > FR)
			agent.randHeading += randTurnSpeed;
		else if (FR > FL)
			agent.randHeading -= randTurnSpeed;
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
				decayingTrail[index(x-1, y-1)] * 1/16 +
				decayingTrail[index(x  , y-1)] * 1/8  +
				decayingTrail[index(x+1, y-1)] * 1/16 +

				decayingTrail[index(x-1, y)] * 1/8 +
				decayingTrail[index(x  , y)] * 1/4 +
				decayingTrail[index(x+1, y)] * 1/8 +

				decayingTrail[index(x-1, y+1)] * 1/16 +
				decayingTrail[index(x  , y+1)] * 1/8  +
				decayingTrail[index(x+1, y+1)] * 1/16
			);
			trail[index(x, y)] = Math.min(1.0, diffused * settings.decayT);
		}//for
	}//for

	return trail;
}//compute()



let shouldRegenerate = true;
function regenerate(){
	agents.splice(0,agents.length); // empty list

	if(settings.startCenter){
		for(let i = 0; i < settings.numAgents; ++i){
			const vector = 2 * Math.PI*i/settings.numAgents;
			agents.push({
				x: W/2,
				y: H/2,
				randHeading: vector - Math.PI / 2,
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



function render(trail){
	img.loadPixels();
	
	let i = 0;
	for(let y = 0; y < W; ++y){
		for(let x = 0; x < H; ++x){
			const trailBuffer = trail[i];
			const curbrightness = Math.floor(trailBuffer * 255);
	
			img.pixels[i*4+0] = curbrightness;
			img.pixels[i*4+1] = curbrightness;
			img.pixels[i*4+2] = curbrightness;
			img.pixels[i*4+3] = 255;
	
			i++;
		}//for
	}//for

  img.updatePixels();
}//render()



function draw(){  
  if(shouldRegenerate)
    regenerate();

  trail = compute(agents, trail, W, H);
  
  render(trail);
  image(img, 0, 0, W, H);
}//draw()