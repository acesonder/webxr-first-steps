/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

import { LEVELS, gameManager } from './GameManager.js';

import { Text } from 'troika-three-text';

const FONT_PATH = 'assets/SpaceMono-Bold.ttf';
const PRIMARY_COLOR = 0xffa276;
const SECONDARY_COLOR = 0x4a9eff;
const BACKGROUND_COLOR = 0x1a1a2e;
const HOVER_COLOR = 0xffcc00;

// Layout constants for level selection
const LEVEL_BUTTON_START_Y = 0.7;
const LEVEL_BUTTON_SPACING = 0.35;

/**
 * Create a text mesh
 */
function createText(text, fontSize, color, anchorX = 'center', anchorY = 'middle') {
	const textMesh = new Text();
	textMesh.text = text;
	textMesh.fontSize = fontSize;
	textMesh.font = FONT_PATH;
	textMesh.color = color;
	textMesh.anchorX = anchorX;
	textMesh.anchorY = anchorY;
	textMesh.sync();
	return textMesh;
}

/**
 * Create a panel background
 */
function createPanel(width, height, color = BACKGROUND_COLOR, opacity = 0.85) {
	const geometry = new THREE.PlaneGeometry(width, height);
	const material = new THREE.MeshBasicMaterial({
		color: color,
		transparent: true,
		opacity: opacity,
		side: THREE.DoubleSide,
	});
	return new THREE.Mesh(geometry, material);
}

/**
 * Create a button with text
 */
function createButton(text, width, height, onClick) {
	const group = new THREE.Group();
	group.userData.isButton = true;
	group.userData.onClick = onClick;
	group.userData.hovered = false;

	// Button background
	const bgGeometry = new THREE.PlaneGeometry(width, height);
	const bgMaterial = new THREE.MeshBasicMaterial({
		color: SECONDARY_COLOR,
		transparent: true,
		opacity: 0.9,
	});
	const background = new THREE.Mesh(bgGeometry, bgMaterial);
	background.userData.buttonBackground = true;
	group.add(background);

	// Button border
	const borderGeometry = new THREE.EdgesGeometry(bgGeometry);
	const borderMaterial = new THREE.LineBasicMaterial({ color: PRIMARY_COLOR });
	const border = new THREE.LineSegments(borderGeometry, borderMaterial);
	border.position.z = 0.001;
	group.add(border);

	// Button text
	const buttonText = createText(text, height * 0.4, 0xffffff);
	buttonText.position.z = 0.01;
	group.add(buttonText);

	return group;
}

/**
 * MenuUI class - handles main menu display
 */
export class MenuUI {
	constructor(scene) {
		this.scene = scene;
		this.menuGroup = new THREE.Group();
		this.menuGroup.position.set(0, 1.5, -2);
		this.buttons = [];
		this.currentView = 'main'; // 'main', 'levels', 'settings'
		this.visible = true;

		this.createMainMenu();
		scene.add(this.menuGroup);
	}

	createMainMenu() {
		// Clear existing
		while (this.menuGroup.children.length > 0) {
			this.menuGroup.remove(this.menuGroup.children[0]);
		}
		this.buttons = [];

		// Background panel
		const panel = createPanel(2.5, 2.2);
		panel.position.z = -0.01;
		this.menuGroup.add(panel);

		// Title
		const title = createText('TARGET PRACTICE', 0.18, PRIMARY_COLOR);
		title.position.y = 0.7;
		this.menuGroup.add(title);

		// Subtitle
		const subtitle = createText('WebXR First Steps', 0.08, 0xaaaaaa);
		subtitle.position.y = 0.5;
		this.menuGroup.add(subtitle);

		// Play button
		const playBtn = createButton('PLAY', 1.2, 0.25, () => {
			this.showLevelSelect();
		});
		playBtn.position.y = 0.15;
		this.menuGroup.add(playBtn);
		this.buttons.push(playBtn);

		// Settings button
		const settingsBtn = createButton('SETTINGS', 1.2, 0.25, () => {
			this.showSettings();
		});
		settingsBtn.position.y = -0.2;
		this.menuGroup.add(settingsBtn);
		this.buttons.push(settingsBtn);

		// Quick start hint
		const hint = createText('Point and click to select', 0.05, 0x888888);
		hint.position.y = -0.6;
		this.menuGroup.add(hint);

		this.currentView = 'main';
	}

	showLevelSelect() {
		// Clear existing
		while (this.menuGroup.children.length > 0) {
			this.menuGroup.remove(this.menuGroup.children[0]);
		}
		this.buttons = [];

		// Background panel
		const panel = createPanel(3, 2.8);
		panel.position.z = -0.01;
		this.menuGroup.add(panel);

		// Title
		const title = createText('SELECT LEVEL', 0.15, PRIMARY_COLOR);
		title.position.y = 1.1;
		this.menuGroup.add(title);

		// Level buttons
		LEVELS.forEach((level, index) => {
			const yPos = LEVEL_BUTTON_START_Y - index * LEVEL_BUTTON_SPACING;
			
			const levelBtn = createButton(
				`${level.id}. ${level.name}`,
				2.2,
				0.25,
				() => {
					gameManager.startLevel(index);
					this.hide();
				},
			);
			levelBtn.position.y = yPos;
			this.menuGroup.add(levelBtn);
			this.buttons.push(levelBtn);

			// Level description
			const desc = createText(
				`${level.description} | Goal: ${level.scoreToComplete} pts`,
				0.04,
				0x888888,
			);
			desc.position.set(0, yPos - 0.15, 0.01);
			this.menuGroup.add(desc);
		});

		// Back button
		const backBtn = createButton('BACK', 0.8, 0.2, () => {
			this.createMainMenu();
		});
		backBtn.position.y = -1.1;
		this.menuGroup.add(backBtn);
		this.buttons.push(backBtn);

		this.currentView = 'levels';
	}

	showSettings() {
		// Clear existing
		while (this.menuGroup.children.length > 0) {
			this.menuGroup.remove(this.menuGroup.children[0]);
		}
		this.buttons = [];

		// Background panel
		const panel = createPanel(2.5, 2);
		panel.position.z = -0.01;
		this.menuGroup.add(panel);

		// Title
		const title = createText('SETTINGS', 0.15, PRIMARY_COLOR);
		title.position.y = 0.7;
		this.menuGroup.add(title);

		// Left-handed mode toggle
		const leftHandedLabel = createText('Left-Handed Mode:', 0.07, 0xffffff, 'left');
		leftHandedLabel.position.set(-0.9, 0.3, 0.01);
		this.menuGroup.add(leftHandedLabel);

		const leftHandedStatus = createText(
			gameManager.isLeftHanded() ? 'ON' : 'OFF',
			0.07,
			gameManager.isLeftHanded() ? 0x00ff00 : 0xff4444,
		);
		leftHandedStatus.position.set(0.6, 0.3, 0.01);
		this.menuGroup.add(leftHandedStatus);
		this.leftHandedStatus = leftHandedStatus;

		const toggleBtn = createButton('TOGGLE', 0.6, 0.18, () => {
			const isLeftHanded = gameManager.toggleLeftHandedMode();
			this.leftHandedStatus.text = isLeftHanded ? 'ON' : 'OFF';
			this.leftHandedStatus.color = isLeftHanded ? 0x00ff00 : 0xff4444;
			this.leftHandedStatus.sync();
		});
		toggleBtn.position.set(0.6, 0.05, 0);
		this.menuGroup.add(toggleBtn);
		this.buttons.push(toggleBtn);

		// Info text
		const infoText = createText(
			'Switch blaster to left controller',
			0.045,
			0x888888,
		);
		infoText.position.set(0, -0.15, 0.01);
		this.menuGroup.add(infoText);

		// Back button
		const backBtn = createButton('BACK', 0.8, 0.2, () => {
			this.createMainMenu();
		});
		backBtn.position.y = -0.55;
		this.menuGroup.add(backBtn);
		this.buttons.push(backBtn);

		this.currentView = 'settings';
	}

	show() {
		this.menuGroup.visible = true;
		this.visible = true;
		this.createMainMenu();
	}

	hide() {
		this.menuGroup.visible = false;
		this.visible = false;
	}

	/**
	 * Check for button interactions with controller ray
	 */
	checkInteraction(rayOrigin, rayDirection) {
		if (!this.visible) return null;

		const raycaster = new THREE.Raycaster();
		raycaster.set(rayOrigin, rayDirection);

		for (const button of this.buttons) {
			const intersects = raycaster.intersectObjects(button.children, true);
			if (intersects.length > 0) {
				return button;
			}
		}
		return null;
	}

	/**
	 * Handle button click
	 */
	handleClick(button) {
		if (button && button.userData.onClick) {
			button.userData.onClick();
		}
	}

	/**
	 * Update button hover states
	 */
	updateHover(hoveredButton) {
		for (const button of this.buttons) {
			const isHovered = button === hoveredButton;
			if (isHovered !== button.userData.hovered) {
				button.userData.hovered = isHovered;
				const bg = button.children.find((c) => c.userData.buttonBackground);
				if (bg) {
					bg.material.color.setHex(isHovered ? HOVER_COLOR : SECONDARY_COLOR);
				}
			}
		}
	}

	dispose() {
		this.scene.remove(this.menuGroup);
	}
}

/**
 * GameHUD class - handles in-game HUD display
 */
export class GameHUD {
	constructor(scene) {
		this.scene = scene;
		this.hudGroup = new THREE.Group();
		this.hudGroup.position.set(0, 0.67, -1.44);
		this.hudGroup.rotateX(-Math.PI / 3.3);
		this.visible = false;

		this.createHUD();
		scene.add(this.hudGroup);
		this.hudGroup.visible = false;
	}

	createHUD() {
		// Score display
		this.scoreText = createText('0000', 0.4, PRIMARY_COLOR);
		this.scoreText.position.set(0, 0, 0);
		this.hudGroup.add(this.scoreText);

		// Score label
		const scoreLabel = createText('SCORE', 0.08, 0x888888);
		scoreLabel.position.set(0, 0.35, 0);
		this.hudGroup.add(scoreLabel);

		// Time display
		this.timeText = createText('60', 0.15, SECONDARY_COLOR);
		this.timeText.position.set(0, -0.35, 0);
		this.hudGroup.add(this.timeText);

		// Time label
		const timeLabel = createText('TIME', 0.06, 0x888888);
		timeLabel.position.set(0, -0.2, 0);
		this.hudGroup.add(timeLabel);

		// Level display
		this.levelText = createText('Level 1', 0.08, 0xaaaaaa);
		this.levelText.position.set(0, 0.55, 0);
		this.hudGroup.add(this.levelText);

		// Goal display
		this.goalText = createText('Goal: 30', 0.06, 0x888888);
		this.goalText.position.set(0, -0.55, 0);
		this.hudGroup.add(this.goalText);
	}

	updateScore(score) {
		const clampedScore = Math.max(0, Math.min(9999, score));
		const displayScore = clampedScore.toString().padStart(4, '0');
		this.scoreText.text = displayScore;
		this.scoreText.sync();
	}

	updateTime(time) {
		const displayTime = Math.max(0, Math.ceil(time));
		this.timeText.text = displayTime.toString();
		this.timeText.sync();

		// Change color when time is low
		if (displayTime <= 10) {
			this.timeText.color = 0xff4444;
		} else {
			this.timeText.color = SECONDARY_COLOR;
		}
	}

	updateLevel(levelConfig) {
		this.levelText.text = `Level ${levelConfig.id}: ${levelConfig.name}`;
		this.levelText.sync();
		this.goalText.text = `Goal: ${levelConfig.scoreToComplete} pts`;
		this.goalText.sync();
	}

	show() {
		this.hudGroup.visible = true;
		this.visible = true;
	}

	hide() {
		this.hudGroup.visible = false;
		this.visible = false;
	}

	dispose() {
		this.scene.remove(this.hudGroup);
	}
}

/**
 * ResultScreen class - shows level complete or game over
 */
export class ResultScreen {
	constructor(scene) {
		this.scene = scene;
		this.screenGroup = new THREE.Group();
		this.screenGroup.position.set(0, 1.5, -2);
		this.buttons = [];
		this.visible = false;

		scene.add(this.screenGroup);
		this.screenGroup.visible = false;
	}

	showLevelComplete(score, levelConfig) {
		this.clear();

		// Background panel
		const panel = createPanel(2.5, 2);
		panel.position.z = -0.01;
		this.screenGroup.add(panel);

		// Title
		const title = createText('LEVEL COMPLETE!', 0.15, 0x00ff00);
		title.position.y = 0.65;
		this.screenGroup.add(title);

		// Score
		const scoreText = createText(`Score: ${score}`, 0.12, PRIMARY_COLOR);
		scoreText.position.y = 0.3;
		this.screenGroup.add(scoreText);

		// Level info
		const levelText = createText(
			`${levelConfig.name} completed!`,
			0.07,
			0xaaaaaa,
		);
		levelText.position.y = 0.05;
		this.screenGroup.add(levelText);

		// Next Level button
		if (levelConfig.id < LEVELS.length) {
			const nextBtn = createButton('NEXT LEVEL', 1.2, 0.25, () => {
				gameManager.nextLevel();
				this.hide();
			});
			nextBtn.position.y = -0.25;
			this.screenGroup.add(nextBtn);
			this.buttons.push(nextBtn);
		}

		// Menu button
		const menuBtn = createButton('MENU', 0.8, 0.2, () => {
			gameManager.goToMenu();
			this.hide();
		});
		menuBtn.position.y = -0.6;
		this.screenGroup.add(menuBtn);
		this.buttons.push(menuBtn);

		this.show();
	}

	showGameOver(score, levelConfig) {
		this.clear();

		// Background panel
		const panel = createPanel(2.5, 2);
		panel.position.z = -0.01;
		this.screenGroup.add(panel);

		// Title
		const title = createText('TIME UP!', 0.15, 0xff4444);
		title.position.y = 0.65;
		this.screenGroup.add(title);

		// Score
		const scoreText = createText(`Score: ${score}`, 0.12, PRIMARY_COLOR);
		scoreText.position.y = 0.3;
		this.screenGroup.add(scoreText);

		// Goal info
		const goalText = createText(
			`Goal was: ${levelConfig.scoreToComplete} pts`,
			0.07,
			0xaaaaaa,
		);
		goalText.position.y = 0.05;
		this.screenGroup.add(goalText);

		// Retry button
		const retryBtn = createButton('TRY AGAIN', 1.2, 0.25, () => {
			gameManager.restartLevel();
			this.hide();
		});
		retryBtn.position.y = -0.25;
		this.screenGroup.add(retryBtn);
		this.buttons.push(retryBtn);

		// Menu button
		const menuBtn = createButton('MENU', 0.8, 0.2, () => {
			gameManager.goToMenu();
			this.hide();
		});
		menuBtn.position.y = -0.6;
		this.screenGroup.add(menuBtn);
		this.buttons.push(menuBtn);

		this.show();
	}

	clear() {
		while (this.screenGroup.children.length > 0) {
			this.screenGroup.remove(this.screenGroup.children[0]);
		}
		this.buttons = [];
	}

	show() {
		this.screenGroup.visible = true;
		this.visible = true;
	}

	hide() {
		this.screenGroup.visible = false;
		this.visible = false;
	}

	/**
	 * Check for button interactions with controller ray
	 */
	checkInteraction(rayOrigin, rayDirection) {
		if (!this.visible) return null;

		const raycaster = new THREE.Raycaster();
		raycaster.set(rayOrigin, rayDirection);

		for (const button of this.buttons) {
			const intersects = raycaster.intersectObjects(button.children, true);
			if (intersects.length > 0) {
				return button;
			}
		}
		return null;
	}

	/**
	 * Handle button click
	 */
	handleClick(button) {
		if (button && button.userData.onClick) {
			button.userData.onClick();
		}
	}

	/**
	 * Update button hover states
	 */
	updateHover(hoveredButton) {
		for (const button of this.buttons) {
			const isHovered = button === hoveredButton;
			if (isHovered !== button.userData.hovered) {
				button.userData.hovered = isHovered;
				const bg = button.children.find((c) => c.userData.buttonBackground);
				if (bg) {
					bg.material.color.setHex(isHovered ? HOVER_COLOR : SECONDARY_COLOR);
				}
			}
		}
	}

	dispose() {
		this.scene.remove(this.screenGroup);
	}
}
