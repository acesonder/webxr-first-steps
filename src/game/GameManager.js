/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Game states enum
 */
export const GameState = {
	MENU: 'menu',
	PLAYING: 'playing',
	LEVEL_COMPLETE: 'level_complete',
	GAME_OVER: 'game_over',
};

/**
 * Level configurations
 */
export const LEVELS = [
	{
		id: 1,
		name: 'Beginner',
		description: 'Learn the basics',
		targetCount: 3,
		targetSpeed: 0,
		scoreToComplete: 30,
		timeLimit: 60,
		movingTargets: false,
	},
	{
		id: 2,
		name: 'Intermediate',
		description: 'More targets',
		targetCount: 5,
		targetSpeed: 0,
		scoreToComplete: 80,
		timeLimit: 60,
		movingTargets: false,
	},
	{
		id: 3,
		name: 'Advanced',
		description: 'Faster respawn',
		targetCount: 5,
		targetSpeed: 0,
		scoreToComplete: 150,
		timeLimit: 45,
		movingTargets: false,
	},
	{
		id: 4,
		name: 'Expert',
		description: 'Moving targets',
		targetCount: 5,
		targetSpeed: 1.5,
		scoreToComplete: 200,
		timeLimit: 60,
		movingTargets: true,
	},
	{
		id: 5,
		name: 'Master',
		description: 'Ultimate challenge',
		targetCount: 7,
		targetSpeed: 2.5,
		scoreToComplete: 300,
		timeLimit: 90,
		movingTargets: true,
	},
];

/**
 * Default game settings
 */
const DEFAULT_SETTINGS = {
	leftHandedMode: false,
	musicVolume: 0.5,
	sfxVolume: 1.0,
};

/**
 * GameManager class - handles game state, levels, and settings
 */
export class GameManager {
	constructor() {
		this.state = GameState.MENU;
		this.currentLevel = 0;
		this.score = 0;
		this.timeRemaining = 0;
		this.settings = { ...DEFAULT_SETTINGS };
		this.onStateChange = null;
		this.onScoreChange = null;
		this.onTimeChange = null;
		this.onSettingsChange = null;
		this.highScores = [0, 0, 0, 0, 0];
		this.loadSettings();
	}

	/**
	 * Load settings from localStorage
	 */
	loadSettings() {
		try {
			const saved = localStorage.getItem('webxr-game-settings');
			if (saved) {
				this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			}
			const scores = localStorage.getItem('webxr-high-scores');
			if (scores) {
				this.highScores = JSON.parse(scores);
			}
		} catch (e) {
			console.warn('Could not load settings:', e);
		}
	}

	/**
	 * Save settings to localStorage
	 */
	saveSettings() {
		try {
			localStorage.setItem(
				'webxr-game-settings',
				JSON.stringify(this.settings),
			);
			localStorage.setItem('webxr-high-scores', JSON.stringify(this.highScores));
		} catch (e) {
			console.warn('Could not save settings:', e);
		}
	}

	/**
	 * Update a setting
	 */
	setSetting(key, value) {
		this.settings[key] = value;
		this.saveSettings();
		if (this.onSettingsChange) {
			this.onSettingsChange(this.settings);
		}
	}

	/**
	 * Toggle left-handed mode
	 */
	toggleLeftHandedMode() {
		this.setSetting('leftHandedMode', !this.settings.leftHandedMode);
		return this.settings.leftHandedMode;
	}

	/**
	 * Get the current level configuration
	 */
	getCurrentLevelConfig() {
		if (this.currentLevel < 0 || this.currentLevel >= LEVELS.length) {
			return LEVELS[0];
		}
		return LEVELS[this.currentLevel];
	}

	/**
	 * Set game state
	 */
	setState(newState) {
		this.state = newState;
		if (this.onStateChange) {
			this.onStateChange(newState);
		}
	}

	/**
	 * Start a specific level
	 */
	startLevel(levelIndex) {
		if (levelIndex < 0 || levelIndex >= LEVELS.length) {
			levelIndex = 0;
		}
		this.currentLevel = levelIndex;
		this.score = 0;
		const levelConfig = this.getCurrentLevelConfig();
		this.timeRemaining = levelConfig.timeLimit;
		this.setState(GameState.PLAYING);
		if (this.onScoreChange) {
			this.onScoreChange(this.score);
		}
	}

	/**
	 * Add score
	 */
	addScore(points) {
		this.score += points;
		if (this.onScoreChange) {
			this.onScoreChange(this.score);
		}

		// Check for level completion
		const levelConfig = this.getCurrentLevelConfig();
		if (this.score >= levelConfig.scoreToComplete) {
			this.completeLevel();
		}
	}

	/**
	 * Update time remaining
	 */
	updateTime(delta) {
		if (this.state !== GameState.PLAYING) return;

		this.timeRemaining -= delta;
		if (this.onTimeChange) {
			this.onTimeChange(this.timeRemaining);
		}

		if (this.timeRemaining <= 0) {
			this.timeRemaining = 0;
			this.gameOver();
		}
	}

	/**
	 * Complete current level
	 */
	completeLevel() {
		// Save high score
		if (this.score > this.highScores[this.currentLevel]) {
			this.highScores[this.currentLevel] = this.score;
			this.saveSettings();
		}
		this.setState(GameState.LEVEL_COMPLETE);
	}

	/**
	 * Game over
	 */
	gameOver() {
		this.setState(GameState.GAME_OVER);
	}

	/**
	 * Go to next level
	 */
	nextLevel() {
		if (this.currentLevel < LEVELS.length - 1) {
			this.startLevel(this.currentLevel + 1);
		} else {
			this.goToMenu();
		}
	}

	/**
	 * Return to main menu
	 */
	goToMenu() {
		this.setState(GameState.MENU);
	}

	/**
	 * Restart current level
	 */
	restartLevel() {
		this.startLevel(this.currentLevel);
	}

	/**
	 * Check if left-handed mode is enabled
	 */
	isLeftHanded() {
		return this.settings.leftHandedMode;
	}

	/**
	 * Get the controller hand for the blaster
	 */
	getBlasterHand() {
		return this.settings.leftHandedMode ? 'left' : 'right';
	}
}

// Singleton instance
export const gameManager = new GameManager();
