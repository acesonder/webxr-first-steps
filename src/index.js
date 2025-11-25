/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

import { GameHUD, MenuUI, ResultScreen } from './game/MenuUI.js';
import { GameState, gameManager } from './game/GameManager.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XR_BUTTONS } from 'gamepad-wrapper';
import { gsap } from 'gsap';
import { init } from './init.js';

// Game state
const bullets = {};
const forwardVector = new THREE.Vector3(0, 0, -1);
const bulletSpeed = 10;
const bulletTimeToLive = 1;

const blasterGroup = new THREE.Group();
const targets = [];
let targetModel = null;

// UI components
let menuUI = null;
let gameHUD = null;
let resultScreen = null;

// Audio
let laserSound = null;
let scoreSound = null;

// Scene reference for target management
let sceneRef = null;

/**
 * Initialize targets based on level configuration
 */
function initializeTargets(levelConfig) {
	// Hide all existing targets
	targets.forEach((target) => {
		target.visible = false;
	});

	// Create/show targets based on level config
	const targetCount = levelConfig.targetCount;

	for (let i = 0; i < targetCount; i++) {
		let target;
		if (i < targets.length) {
			target = targets[i];
		} else if (targetModel) {
			target = targetModel.clone();
			sceneRef.add(target);
			targets.push(target);
		} else {
			continue;
		}

		target.visible = true;
		target.scale.set(1, 1, 1);
		target.position.set(
			Math.random() * 10 - 5,
			Math.random() * 2 + 1,
			-Math.random() * 5 - 5,
		);

		// Store movement data for moving targets
		target.userData.moveDirection = new THREE.Vector3(
			Math.random() - 0.5,
			Math.random() - 0.5,
			0,
		).normalize();
		target.userData.moveSpeed = levelConfig.targetSpeed;
		target.userData.isMoving = levelConfig.movingTargets;
	}
}

/**
 * Clear all bullets from the scene
 */
function clearBullets() {
	Object.values(bullets).forEach((bullet) => {
		if (sceneRef) {
			sceneRef.remove(bullet);
		}
	});
	Object.keys(bullets).forEach((key) => delete bullets[key]);
}

/**
 * Handle game state changes
 */
function onGameStateChange(newState) {
	switch (newState) {
		case GameState.MENU:
			menuUI.show();
			gameHUD.hide();
			resultScreen.hide();
			clearBullets();
			targets.forEach((target) => {
				target.visible = false;
			});
			break;

		case GameState.PLAYING: {
			menuUI.hide();
			gameHUD.show();
			resultScreen.hide();
			const levelConfig = gameManager.getCurrentLevelConfig();
			gameHUD.updateLevel(levelConfig);
			gameHUD.updateScore(0);
			gameHUD.updateTime(levelConfig.timeLimit);
			initializeTargets(levelConfig);
			break;
		}

		case GameState.LEVEL_COMPLETE:
			menuUI.hide();
			gameHUD.hide();
			resultScreen.showLevelComplete(
				gameManager.score,
				gameManager.getCurrentLevelConfig(),
			);
			break;

		case GameState.GAME_OVER:
			menuUI.hide();
			gameHUD.hide();
			resultScreen.showGameOver(
				gameManager.score,
				gameManager.getCurrentLevelConfig(),
			);
			break;
	}
}

function setupScene({ scene, camera, _renderer, _player, _controllers }) {
	sceneRef = scene;
	const gltfLoader = new GLTFLoader();

	gltfLoader.load('assets/spacestation.glb', (gltf) => {
		scene.add(gltf.scene);
	});

	gltfLoader.load('assets/blaster.glb', (gltf) => {
		blasterGroup.add(gltf.scene);
	});

	gltfLoader.load('assets/target.glb', (gltf) => {
		targetModel = gltf.scene;
		// Targets will be created when a level starts
	});

	// Initialize UI components
	menuUI = new MenuUI(scene);
	gameHUD = new GameHUD(scene);
	resultScreen = new ResultScreen(scene);

	// Set up game manager callbacks
	gameManager.onStateChange = onGameStateChange;
	gameManager.onScoreChange = (score) => {
		if (gameHUD) {
			gameHUD.updateScore(score);
		}
	};
	gameManager.onTimeChange = (time) => {
		if (gameHUD) {
			gameHUD.updateTime(time);
		}
	};

	// Load and set up positional audio
	const listener = new THREE.AudioListener();
	camera.add(listener);

	const audioLoader = new THREE.AudioLoader();
	laserSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/laser.ogg', (buffer) => {
		laserSound.setBuffer(buffer);
		blasterGroup.add(laserSound);
	});

	scoreSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/score.ogg', (buffer) => {
		scoreSound.setBuffer(buffer);
	});

	// Show main menu
	menuUI.show();
}

/**
 * Handle controller input for UI interaction
 */
function handleUIInteraction(controllers) {
	// Determine which controller to use based on handedness setting
	// For UI, we use the opposite hand from the blaster
	const uiHand = gameManager.isLeftHanded() ? 'right' : 'left';
	const controller = controllers[uiHand] || controllers.right || controllers.left;

	if (!controller) return;

	const { gamepad, raySpace } = controller;

	// Get ray direction from controller
	const rayOrigin = new THREE.Vector3();
	const rayDirection = new THREE.Vector3(0, 0, -1);
	raySpace.getWorldPosition(rayOrigin);
	raySpace.getWorldQuaternion(new THREE.Quaternion()).normalize();
	rayDirection.applyQuaternion(raySpace.quaternion);

	// Check for hover/click on menu buttons
	let hoveredButton = null;

	if (menuUI.visible) {
		hoveredButton = menuUI.checkInteraction(rayOrigin, rayDirection);
		menuUI.updateHover(hoveredButton);

		if (hoveredButton && gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
			menuUI.handleClick(hoveredButton);
		}
	}

	if (resultScreen.visible) {
		hoveredButton = resultScreen.checkInteraction(rayOrigin, rayDirection);
		resultScreen.updateHover(hoveredButton);

		if (hoveredButton && gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
			resultScreen.handleClick(hoveredButton);
		}
	}
}

/**
 * Handle blaster input (shooting)
 */
function handleBlasterInput(controllers, scene) {
	if (gameManager.state !== GameState.PLAYING) return;

	// Get the blaster hand based on settings
	const blasterHand = gameManager.getBlasterHand();
	const controller = controllers[blasterHand];

	if (!controller) return;

	const { gamepad, raySpace, mesh } = controller;

	// Attach blaster to the correct hand
	if (!raySpace.children.includes(blasterGroup)) {
		// Remove from other hand if present
		const otherHand = blasterHand === 'right' ? 'left' : 'right';
		if (controllers[otherHand]?.raySpace.children.includes(blasterGroup)) {
			controllers[otherHand].raySpace.remove(blasterGroup);
			controllers[otherHand].mesh.visible = true;
		}

		raySpace.add(blasterGroup);
		mesh.visible = false;
	}

	// Handle trigger press
	if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
		try {
			gamepad.getHapticActuator(0).pulse(0.6, 100);
		} catch {
			// do nothing
		}

		// Play laser sound
		if (laserSound && laserSound.buffer) {
			if (laserSound.isPlaying) laserSound.stop();
			laserSound.play();
		}

		const bulletPrototype = blasterGroup.getObjectByName('bullet');
		if (bulletPrototype) {
			const bullet = bulletPrototype.clone();
			scene.add(bullet);
			bulletPrototype.getWorldPosition(bullet.position);
			bulletPrototype.getWorldQuaternion(bullet.quaternion);

			const directionVector = forwardVector
				.clone()
				.applyQuaternion(bullet.quaternion);
			bullet.userData = {
				velocity: directionVector.multiplyScalar(bulletSpeed),
				timeToLive: bulletTimeToLive,
			};
			bullets[bullet.uuid] = bullet;
		}
	}
}

/**
 * Update bullets and check for target hits
 */
function updateBullets(delta, scene) {
	if (gameManager.state !== GameState.PLAYING) return;

	Object.values(bullets).forEach((bullet) => {
		if (bullet.userData.timeToLive < 0) {
			delete bullets[bullet.uuid];
			scene.remove(bullet);
			return;
		}
		const deltaVec = bullet.userData.velocity.clone().multiplyScalar(delta);
		bullet.position.add(deltaVec);
		bullet.userData.timeToLive -= delta;

		targets
			.filter((target) => target.visible)
			.forEach((target) => {
				const distance = target.position.distanceTo(bullet.position);
				if (distance < 1) {
					delete bullets[bullet.uuid];
					scene.remove(bullet);

					gsap.to(target.scale, {
						duration: 0.3,
						x: 0,
						y: 0,
						z: 0,
						onComplete: () => {
							target.visible = false;
							setTimeout(() => {
								target.visible = true;
								target.position.x = Math.random() * 10 - 5;
								target.position.z = -Math.random() * 5 - 5;
								target.position.y = Math.random() * 2 + 1;

								gsap.to(target.scale, {
									duration: 0.3,
									x: 1,
									y: 1,
									z: 1,
								});
							}, 500);
						},
					});

					// Add score through game manager
					gameManager.addScore(10);

					if (scoreSound && scoreSound.buffer) {
						if (scoreSound.isPlaying) scoreSound.stop();
						scoreSound.play();
					}
				}
			});
	});
}

/**
 * Update moving targets
 */
function updateTargets(delta) {
	if (gameManager.state !== GameState.PLAYING) return;

	const levelConfig = gameManager.getCurrentLevelConfig();
	if (!levelConfig.movingTargets) return;

	targets
		.filter((target) => target.visible && target.userData.isMoving)
		.forEach((target) => {
			const moveSpeed = target.userData.moveSpeed || levelConfig.targetSpeed;
			const direction = target.userData.moveDirection;

			target.position.x += direction.x * moveSpeed * delta;
			target.position.y += direction.y * moveSpeed * delta;

			// Bounce off boundaries
			if (target.position.x < -5 || target.position.x > 5) {
				direction.x *= -1;
			}
			if (target.position.y < 0.5 || target.position.y > 4) {
				direction.y *= -1;
			}
		});
}

function onFrame(delta, _time, { scene, _camera, _renderer, _player, controllers }) {
	// Handle UI interactions
	handleUIInteraction(controllers);

	// Update game time
	gameManager.updateTime(delta);

	// Handle blaster input during gameplay
	handleBlasterInput(controllers, scene);

	// Update game objects
	updateBullets(delta, scene);
	updateTargets(delta);

	gsap.ticker.tick(delta);
}

init(setupScene, onFrame);
