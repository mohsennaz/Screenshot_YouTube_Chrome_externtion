'use strict';

// Load all settings
chrome.storage.sync.get([
	'screenshotKey', 
	'playbackSpeedButtons', 
	'screenshotFunctionality', 
	'screenshotFileFormat',
	'autoScreenshotEnabled',
	'autoScreenshotInterval',
	'telegramBotToken',
	'telegramChatId'
], function(result) {
	// Basic settings
	ScreenshotKeyCheck.checked = result.screenshotKey || false;
	PlaybackSpeedButtonsCheck.checked = result.playbackSpeedButtons || false;
	PlaybackSpeedButtonsChange();

	// Screenshot functionality
	if (result.screenshotFunctionality === undefined) {
		chrome.storage.sync.set({ screenshotFunctionality: 2 });
		result.screenshotFunctionality = 2;
	}
	var radios = document.getElementsByName("ScreenshotFunctionalityCheck");
	radios[result.screenshotFunctionality].checked = true;

	// Screenshot format
	ScreenshotFileFormat.value = result.screenshotFileFormat || 'png';

	// Auto-screenshot settings
	AutoScreenshotCheck.checked = result.autoScreenshotEnabled || false;
	AutoScreenshotInterval.value = result.autoScreenshotInterval || 5;
	TelegramBotToken.value = result.telegramBotToken || '';
	TelegramChatId.value = result.telegramChatId || '';
});

// Basic screenshot settings
ScreenshotKeyCheck.oninput = function() {
	chrome.storage.sync.set({'screenshotKey': this.checked});
	showSuccessMessage();
};

function ScreenshotFunctionalitySet(value) {
	chrome.storage.sync.set({ screenshotFunctionality: parseInt(value) });
	showSuccessMessage();
};

SFCSave.oninput = function() {
	ScreenshotFunctionalitySet(this.value);
};
SFCCopy.oninput = function() {
	ScreenshotFunctionalitySet(this.value);
};
SFCBoth.oninput = function() {
	ScreenshotFunctionalitySet(this.value);
};

PlaybackSpeedButtonsCheck.oninput = function() {
	chrome.storage.sync.set({'playbackSpeedButtons': this.checked});
	PlaybackSpeedButtonsChange();
	showSuccessMessage();
};

function PlaybackSpeedButtonsChange() {
	PlaybackSpeedHelp.hidden = !PlaybackSpeedButtonsCheck.checked;
}

ScreenshotFileFormat.onchange = function() {
	chrome.storage.sync.set({'screenshotFileFormat': this.value});
	showSuccessMessage();
};

// Auto-screenshot settings
AutoScreenshotCheck.oninput = function() {
	chrome.storage.sync.set({'autoScreenshotEnabled': this.checked});
	showSuccessMessage();
};

AutoScreenshotInterval.oninput = function() {
	const value = parseInt(this.value);
	if (value >= 1 && value <= 60) {
		chrome.storage.sync.set({'autoScreenshotInterval': value});
		showSuccessMessage();
	} else {
		showErrorMessage('Interval must be between 1 and 60 minutes');
	}
};

TelegramBotToken.oninput = function() {
	const value = this.value.trim();
	chrome.storage.sync.set({'telegramBotToken': value});
	
	if (value) {
		validateTelegramToken(value);
	}
};

TelegramChatId.oninput = function() {
	const value = this.value.trim();
	chrome.storage.sync.set({'telegramChatId': value});
	showSuccessMessage();
};

// Validate Telegram bot token format
function validateTelegramToken(token) {
	const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
	
	if (!tokenPattern.test(token)) {
		showErrorMessage('Invalid token format. Should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
		return false;
	}
	
	showSuccessMessage();
	return true;
}

// Show success message
function showSuccessMessage() {
	const successMsg = document.getElementById('successMessage');
	const errorMsg = document.getElementById('errorMessage');
	
	errorMsg.style.display = 'none';
	successMsg.style.display = 'block';
	
	setTimeout(() => {
		successMsg.style.display = 'none';
	}, 3000);
}

// Show error message
function showErrorMessage(message) {
	const successMsg = document.getElementById('successMessage');
	const errorMsg = document.getElementById('errorMessage');
	
	successMsg.style.display = 'none';
	errorMsg.textContent = message;
	errorMsg.style.display = 'block';
	
	setTimeout(() => {
		errorMsg.style.display = 'none';
	}, 5000);
}