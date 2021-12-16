import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import {Puppet} from "./puppet";

let camera, scene, renderer;
let video;
let detector;
let lastSolvedTime = -1;
let playBtn, shuffleBtn;

function init() {
	const width = window.innerWidth;
	const height = window.innerHeight / 2;

	const div = initHTML(width, height);
	initScene(width, height, div);
}

function initHTML(width, height) {
	const div = document.createElement('div');
	document.body.appendChild(div);

	const videos = [
		'../../resources/danceVideo_001.mp4',
		'../../resources/danceVideo_002.mp4',
		'../../resources/danceVideo_003.mp4',
		'../../resources/danceVideo_004.mp4',
		'../../resources/danceVideo_005.mp4',
	];
	let displayedVideo = 0;

	function nextVideo() {
		const videoCount = videos.length;
		displayedVideo++;
		if (displayedVideo >= videoCount) {
			displayedVideo -= displayedVideo;
		}
		return displayedVideo;
	}

	video = document.createElement('video')
	video.style.width = `${width}px`;
	video.style.height = `${height}px`;
	div.appendChild(video);
	window.video = video;

	const source = document.createElement('source')
	source.src = videos[displayedVideo];
	video.appendChild(source);

	video.addEventListener( "loadedmetadata", function (e) {
		initModel().then(() => {
			solveCurrent(true);
		})
	}, false );

	playBtn = document.createElement('button');
	playBtn.textContent = 'Play';
	playBtn.onclick = () => video.paused ? video.play() : video.pause();
	div.appendChild(playBtn);

	shuffleBtn = document.createElement('button');
	shuffleBtn.textContent = 'Shuffle';
	shuffleBtn.onclick = () => {
		video.pause();
		clearModel();
		source.src = videos[nextVideo()];
		video.load();
	}
	div.appendChild(shuffleBtn);

	return div;
}

let ambre, manu, lani, marlo;
function initScene(width, height, div) {
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xbbbbbb );

	const gridHelper = new THREE.GridHelper( 10, 10 );
	scene.add( gridHelper );

	const axesHelper = new THREE.AxesHelper( 0.5 );
	scene.add( axesHelper );

	ambre = new Puppet(scene, 'face_ambre');
	ambre.load();

	manu = new Puppet(scene, 'face_manu');
	manu.load();

	lani = new Puppet(scene, 'face_lani');
	lani.load();

	marlo = new Puppet(scene, 'face_marlo');
	marlo.load();

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( width, height );
	div.appendChild(renderer.domElement);

	camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 10 );
	camera.position.y = 1.0;
	camera.position.z = 1.75;

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.target.set( 0, 1.0, -3.0 );
	controls.update();
}

function render() {
	renderer.render( scene, camera );
}

async function initModel() {
	const model = poseDetection.SupportedModels.BlazePose
	detector = await poseDetection.createDetector(model, {
		"runtime": 'mediapipe',
		"enableSmoothing": true,
		"modelType": 'heavy',
	})
}

function clearModel() {
	detector = undefined;
}

const solveCurrent = async(force = false) => {
	if (!detector) {
		return;
	}
	if (lastSolvedTime === video.currentTime && !force) {
		return;
	}
	lastSolvedTime = video.currentTime;
	if (!ambre.loaded
		&& !manu.loaded
		&& !lani.loaded
		&& !marlo.loaded
	) {
		return;
	}

	// estimate pose
	const estimationConfig = {flipHorizontal: false};
	const poses = await detector.estimatePoses(video, estimationConfig)
	if (poses.length === 0) {
		return;
	}

	// apply pose
	ambre.root.visible = true;
	ambre.pose = poses;
	ambre.applyPoseToGeo();
	ambre.root.position.z = -0.5;
	ambre.root.position.x = 0.5;

	copyPoseAndOffset(ambre, manu, new THREE.Vector3(-0.5, 0, -0.5), 1.0);
	copyPoseAndOffset(ambre, lani, new THREE.Vector3(-1, 0, 0), 0.75);
	copyPoseAndOffset(ambre, marlo, new THREE.Vector3(1, 0, 0), 0.5);
}

function copyPoseAndOffset(source, target, offset, scale) {
	target.root.visible = true;
	target.copyPoseToGeo(source);
	target.root.position.set(...offset);
	target.root.scale.set(scale, scale, scale);
}

async function animate() {
	await solveCurrent();
	render();
	requestAnimationFrame(animate);
}

init();
animate();
