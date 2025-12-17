'use strict';

var activePBRButton;
var screenshotKey = false;
var playbackSpeedButtons = false;
var screenshotFunctionality = 0;
var screenshotFormat = "png";
var extension = 'png';
var isAppended = false;

// Auto-screenshot variables
var autoScreenshotEnabled = false;
var autoScreenshotInterval = 5; // minutes
var autoScreenshotTimer = null;
var telegramBotToken = '';
var telegramChatId = '';

// Function to send screenshot to Telegram
async function SendToTelegram(blob, filename) {
	if (!telegramBotToken || !telegramChatId) {
		console.error('Telegram bot token or chat ID not configured');
		return false;
	}

	const formData = new FormData();
	formData.append('chat_id', telegramChatId);
	formData.append('photo', blob, filename);
	formData.append('caption', filename);

	try {
		console.log('Sending to Telegram...', {
			chatId: telegramChatId,
			filename: filename,
			blobSize: blob.size
		});

		const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		
		if (result.ok) {
			console.log('Screenshot sent to Telegram successfully');
			return true;
		} else {
			console.error('Telegram API error:', result.description);
			console.error('Full response:', result);
			return false;
		}
	} catch (error) {
		console.error('Error sending to Telegram:', error);
		return false;
	}
}

function CaptureScreenshot(isAuto = false) {
	var appendixTitle = "screenshot." + extension;
	var title;
	var headerEls = document.querySelectorAll("h1.title.ytd-video-primary-info-renderer");

	function SetTitle() {
		if (headerEls.length > 0) {
			title = headerEls[0].innerText.trim();
			return true;
		} else {
			return false;
		}
	}
	
	if (SetTitle() == false) {
		headerEls = document.querySelectorAll("h1.watch-title-container");
		if (SetTitle() == false)
			title = '';
	}

	var player = document.getElementsByClassName("video-stream")[0];
	if (!player) {
		console.error('Video player not found');
		return;
	}

	var time = player.currentTime;
	title += " ";

	let minutes = Math.floor(time / 60);
	time = Math.floor(time - (minutes * 60));

	if (minutes > 60) {
		let hours = Math.floor(minutes / 60);
		minutes -= hours * 60;
		title += hours + "-";
	}

	title += minutes + "-" + time;
	title += " " + appendixTitle;

	var canvas = document.createElement("canvas");
	canvas.width = player.videoWidth;
	canvas.height = player.videoHeight;
	canvas.getContext('2d').drawImage(player, 0, 0, canvas.width, canvas.height);

	var downloadLink = document.createElement("a");
	downloadLink.download = title;

	function DownloadBlob(blob) {
		downloadLink.href = URL.createObjectURL(blob);
		downloadLink.click();
	}

	async function ClipboardBlob(blob) {
		const clipboardItemInput = new ClipboardItem({ "image/png": blob });
		await navigator.clipboard.write([clipboardItemInput]);
	}

	// For auto-screenshots, always send to Telegram (and also save/copy based on settings)
	if (isAuto) {
		if (telegramBotToken && telegramChatId) {
			canvas.toBlob(async function (blob) {
				await SendToTelegram(blob, title);
				console.log('Auto-screenshot sent to Telegram:', title);
			}, 'image/png');
		} else {
			console.error('Telegram not configured. Please set bot token and chat ID in extension options.');
		}
		
		// Also save/copy to clipboard if functionality is set for that
		if (screenshotFunctionality == 1 || screenshotFunctionality == 2) {
			canvas.toBlob(async function (blob) {
				await ClipboardBlob(blob);
			}, 'image/png');
		}
		
		if (screenshotFunctionality == 0 || (screenshotFunctionality == 2 && screenshotFormat !== 'png')) {
			canvas.toBlob(async function (blob) {
				DownloadBlob(blob);
			}, 'image/' + screenshotFormat);
		}
		return;
	}

	// Original functionality for manual screenshots
	if (screenshotFunctionality == 1 || screenshotFunctionality == 2) {
		canvas.toBlob(async function (blob) {
			await ClipboardBlob(blob);
			if (screenshotFunctionality == 2 && screenshotFormat === 'png') {
				DownloadBlob(blob);
			}
		}, 'image/png');
	}

	if (screenshotFunctionality == 0 || (screenshotFunctionality == 2 && screenshotFormat !== 'png')) {
		canvas.toBlob(async function (blob) {
			DownloadBlob(blob);
		}, 'image/' + screenshotFormat);
	}
}

// Start auto-screenshot timer
function StartAutoScreenshot() {
	if (autoScreenshotTimer) {
		clearInterval(autoScreenshotTimer);
	}

	if (autoScreenshotEnabled) {
		// Take first screenshot immediately
		CaptureScreenshot(true);
		
		// Then set up interval
		const intervalMs = autoScreenshotInterval * 60 * 1000;
		autoScreenshotTimer = setInterval(() => {
			CaptureScreenshot(true);
		}, intervalMs);
		
		console.log(`Auto-screenshot started: every ${autoScreenshotInterval} minutes`);
	}
}

// Stop auto-screenshot timer
function StopAutoScreenshot() {
	if (autoScreenshotTimer) {
		clearInterval(autoScreenshotTimer);
		autoScreenshotTimer = null;
		console.log('Auto-screenshot stopped');
	}
}

// Toggle auto-screenshot
function ToggleAutoScreenshot() {
	autoScreenshotEnabled = !autoScreenshotEnabled;
	chrome.storage.sync.set({'autoScreenshotEnabled': autoScreenshotEnabled});
	
	if (autoScreenshotEnabled) {
		StartAutoScreenshot();
		autoScreenshotButton.innerHTML = "Auto ON";
		autoScreenshotButton.style.color = "#0f0";
		autoScreenshotButton.style.fontWeight = "bold";
		autoScreenshotButton.classList.add('SYTactive');
		autoScreenshotButton.title = `Auto-screenshot ACTIVE (every ${autoScreenshotInterval} min) - Click to stop`;
	} else {
		StopAutoScreenshot();
		autoScreenshotButton.innerHTML = "Auto OFF";
		autoScreenshotButton.style.color = "#aaa";
		autoScreenshotButton.style.fontWeight = "normal";
		autoScreenshotButton.classList.remove('SYTactive');
		autoScreenshotButton.title = "Auto-screenshot INACTIVE - Click to start";
	}
}

function AddScreenshotButton() {
	var ytpRightControls = document.getElementsByClassName("ytp-right-controls")[0];
	if (!ytpRightControls) {
		isAppended = false;
		return;
	}

	ytpRightControls.prepend(screenshotButton);
	ytpRightControls.prepend(autoScreenshotButton);
	isAppended = true;

	chrome.storage.sync.get('playbackSpeedButtons', function(result) {
		if (result.playbackSpeedButtons) {
			ytpRightControls.prepend(speed3xButton);
			ytpRightControls.prepend(speed25xButton);
			ytpRightControls.prepend(speed2xButton);
			ytpRightControls.prepend(speed15xButton);
			ytpRightControls.prepend(speed1xButton);

			var playbackRate = document.getElementsByTagName('video')[0].playbackRate;
			switch (playbackRate) {
				case 1:
					speed1xButton.classList.add('SYTactive');
					activePBRButton = speed1xButton;
					break;
				case 2:
					speed2xButton.classList.add('SYTactive');
					activePBRButton = speed2xButton;
					break;
				case 2.5:
					speed25xButton.classList.add('SYTactive');
					activePBRButton = speed25xButton;
					break;
				case 3:
					speed3xButton.classList.add('SYTactive');
					activePBRButton = speed3xButton;
					break;
			}
		}
	});
}

var screenshotButton = document.createElement("button");
screenshotButton.className = "screenshotButton ytp-button";
screenshotButton.style.width = "auto";
screenshotButton.innerHTML = "Screenshot";
screenshotButton.style.cssFloat = "left";
screenshotButton.onclick = () => CaptureScreenshot(false);

var autoScreenshotButton = document.createElement("button");
autoScreenshotButton.className = "ytp-button SYText";
autoScreenshotButton.style.width = "auto";
autoScreenshotButton.innerHTML = "Auto OFF";
autoScreenshotButton.title = "Toggle auto-screenshot to Telegram";
autoScreenshotButton.style.cssFloat = "left";
autoScreenshotButton.style.color = "#aaa";
autoScreenshotButton.onclick = ToggleAutoScreenshot;

var speed1xButton = document.createElement("button");
speed1xButton.className = "ytp-button SYText";
speed1xButton.innerHTML = "1×";
speed1xButton.onclick = function() {
	document.getElementsByTagName('video')[0].playbackRate = 1;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed15xButton = document.createElement("button");
speed15xButton.className = "ytp-button SYText";
speed15xButton.innerHTML = "1.5×";
speed15xButton.onclick = function() {
	document.getElementsByTagName('video')[0].playbackRate = 1.5;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed2xButton = document.createElement("button");
speed2xButton.className = "ytp-button SYText";
speed2xButton.innerHTML = "2×";
speed2xButton.onclick = function() {
	document.getElementsByTagName('video')[0].playbackRate = 2;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed25xButton = document.createElement("button");
speed25xButton.className = "ytp-button SYText";
speed25xButton.innerHTML = "2.5×";
speed25xButton.onclick = function() {
	document.getElementsByTagName('video')[0].playbackRate = 2.5;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed3xButton = document.createElement("button");
speed3xButton.className = "ytp-button SYText";
speed3xButton.innerHTML = "3×";
speed3xButton.onclick = function() {
	document.getElementsByTagName('video')[0].playbackRate = 3;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

activePBRButton = speed1xButton;

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
	screenshotKey = result.screenshotKey;
	playbackSpeedButtons = result.playbackSpeedButtons;
	
	if (result.screenshotFileFormat === undefined) {
		screenshotFormat = 'png';
	} else {
		screenshotFormat = result.screenshotFileFormat;
	}

	if (result.screenshotFunctionality === undefined) {
		screenshotFunctionality = 0;
	} else {
		screenshotFunctionality = result.screenshotFunctionality;
	}

	if (screenshotFormat === 'jpeg') {
		extension = 'jpg';
	} else {
		extension = screenshotFormat;
	}

	// Load auto-screenshot settings
	autoScreenshotEnabled = result.autoScreenshotEnabled || false;
	autoScreenshotInterval = result.autoScreenshotInterval || 5;
	telegramBotToken = result.telegramBotToken || '';
	telegramChatId = result.telegramChatId || '';

	// Start auto-screenshot if enabled
	if (autoScreenshotEnabled && telegramBotToken && telegramChatId) {
		StartAutoScreenshot();
		if (autoScreenshotButton) {
			autoScreenshotButton.innerHTML = "Auto ON";
			autoScreenshotButton.style.color = "#0f0";
			autoScreenshotButton.style.fontWeight = "bold";
			autoScreenshotButton.classList.add('SYTactive');
			autoScreenshotButton.title = `Auto-screenshot ACTIVE (every ${autoScreenshotInterval} min) - Click to stop`;
		}
	}
});

document.addEventListener('keydown', function(e) {
	if (document.activeElement.contentEditable === 'true' || 
		document.activeElement.tagName === 'INPUT' || 
		document.activeElement.tagName === 'TEXTAREA' || 
		document.activeElement.contentEditable === 'plaintext')
		return true;

	if (playbackSpeedButtons) {
		switch (e.key) {
			case 'q':
				speed1xButton.click();
				e.preventDefault();
				return false;
			case 's':
				speed15xButton.click();
				e.preventDefault();
				return false;
			case 'w':
				speed2xButton.click();
				e.preventDefault();
				return false;
			case 'e':
				speed25xButton.click();
				e.preventDefault();
				return false;
			case 'r':
				speed3xButton.click();
				e.preventDefault();
				return false;
		}
	}

	if (screenshotKey && e.key === 'p') {
		CaptureScreenshot(false);
		e.preventDefault();
		return false;
	}
});

AddScreenshotButton();

function onDomChange(mutationsList, observer) {
	let run = false;
	for (let mutation of mutationsList) {
		if (mutation.type === 'childList') {
			run = true;
		}
	}

	if (run) {
		let ytpRightControls = document.getElementsByClassName("ytp-right-controls")[0];
		if (ytpRightControls && isAppended === false) {
			AddScreenshotButton();
		}
	}
}

const observer = new MutationObserver(onDomChange);

observer.observe(document.body, {
	childList: true,
	subtree: true
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
	StopAutoScreenshot();
});