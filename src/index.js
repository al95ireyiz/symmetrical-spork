import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let rotations = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
else
{	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () =>
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
			init();
		}
	};

	function init ()
	{

		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color(0.0);
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);



		let randomX = ((Math.floor(Math.random() * 5) + 1) * .1).toFixed(1)
		let randomY = ((Math.floor(Math.random() * 3) + 1) * .1).toFixed(1)

		let wins = windowManager.getWindows() ?? [];

		let c = new t.Color();
		c.setRGB(.1, 1.0, .5);


		let metaData = { rotation: { x: randomX, y: randomY }, color: c };

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		updateNumberOfCubes();
	}

	function updateNumberOfCubes ()
	{
		let wins = windowManager.getWindows();

		// remove all cubes
		cubes.forEach((c) => {
			world.remove(c);
		})

		cubes = [];
		rotations = [];

		// add new cubes based on the current window setup
		for (let i = 0; i < wins.length; i++)
		{
			let win = wins[i];

			let c = new t.Color(win.metaData.color)
			c.setHSL(c.r * i, c.g, c.b)
			console.log(c)

			const s = 100;
			let cube = new t.Mesh(new t.DodecahedronGeometry(s, 1), new t.MeshBasicMaterial({
				color: c,
				wireframe: true,
				transparent: false,
				opacity: .5
			}));
			cube.position.x = win.shape.x + (win.shape.w * .5);
			cube.position.y = win.shape.y + (win.shape.h * .5);

			cubes.push(cube);


		}

		const temp = []
		if (cubes.length < 3) {
			for (let i = 0; i < cubes.length; i++) {
				const j = i === 0 ? cubes.length - 1 : i - 1;


				let win = wins[i];

				let pCube = cubes[j];
				let cube = cubes[i];
				const s = 100;

				let nucleus = new t.Mesh(new t.DodecahedronGeometry(s * .2, 1), new t.MeshBasicMaterial({
					color: pCube.material.color,
					wireframe: true,
					transparent: false,
					opacity: .5
				}));

				cube.add(nucleus);
				world.add(cube);
				temp.push(cube)
			}
		}
		else {
			for (let i = 0; i < cubes.length; i++) {
				const j = i === 0 ? cubes.length - 1 : i - 1;
				const k = i === cubes.length - 1 ? 0 : i + 1;


				let win = wins[i];

				let pCube = cubes[j];
				let nCube = cubes[k]

				let cube = cubes[i];

				const s = 100;
				const offset = 20

				let nucleusLeft = new t.Mesh(new t.DodecahedronGeometry(s * .2, 1), new t.MeshBasicMaterial({
					color: pCube.material.color,
					wireframe: true,
					transparent: false,
					opacity: .5
				}));

				let nucleusRight = new t.Mesh(new t.DodecahedronGeometry(s * .2, 1), new t.MeshBasicMaterial({
					color: nCube.material.color,
					wireframe: true,
					transparent: false,
					opacity: .5
				}));

				nucleusLeft.position.x = -1 * offset;
				nucleusRight.position.x = offset;

				cube.add(nucleusLeft);
				cube.add(nucleusRight);
				world.add(cube);
				temp.push(cube);

				console.log(win)

			}
		}
		cubes = [...temp]
	}

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let t = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();


		// loop through all our cubes and update their positions based on current window positions
		for (let i = 0; i < cubes.length; i++)
		{
			let cube = cubes[i];
			let win = wins[i];
			let _t = t;// + i * .2;

			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)}

			cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
			cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;

			const possibleRotations = [.1, .2, .3, .4, .5]

			cube.rotation.x = _t * win.metaData.rotation.x;
			cube.rotation.y = _t * win.metaData.rotation.y;
		};

		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}


	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
}