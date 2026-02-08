const { _electron: electron } = require('@playwright/test');
const path = require('path');
const { test, expect } = require('@playwright/test');

test('app launches and displays UI', async () => {
	// Get the Electron executable path
	const electronPath = require('electron');
	
	// Get the path to the compiled main process
	const mainPath = path.join(__dirname, '../../.build/index.js');
	
	// Launch the Electron app
	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, '--dev'],
		timeout: 30000
	});
	
	// Wait for at least one window to be created
	// The app may create multiple windows (splash screen, main window)
	// Use firstWindow() which waits for the first window to be created
	const window = await electronApp.firstWindow();
	
	// Wait for the window to be ready
	await window.waitForLoadState('domcontentloaded');
	
	// The app uses BrowserView for the UI, which isn't directly accessible via Playwright
	// But we can verify the app launched by checking:
	// 1. The window exists
	// 2. The Electron app process is running
	// 3. The window has loaded
	
	// Verify the Electron app is running
	const process = electronApp.process();
	expect(process).not.toBeNull();
	expect(process.pid).toBeGreaterThan(0);
	
	// Verify we have a window
	expect(window).not.toBeNull();
	
	// Wait a bit for the app to fully initialize
	await new Promise(resolve => setTimeout(resolve, 1000));
	
	// Clean up - the app shows an exit confirmation modal when closing
	// We need to send the app-exit IPC message to bypass the modal
	// The BrowserView exposes window.eyas.send('app-exit') which triggers the exit
	try {
		// Access the main process context to send the app-exit IPC message
		// This bypasses the exit confirmation modal
		// The parameter is the result of require('electron') in the main app
		const result = await electronApp.evaluate((electron) => {
			const { BrowserWindow } = electron;
			const windows = BrowserWindow.getAllWindows();
			
			if (windows.length > 0) {
				const mainWindow = windows[0];
				const browserViews = mainWindow.getBrowserViews();
				
				// Send the app-exit message through the BrowserView's webContents
				// This executes in the renderer context and calls window.eyas.send('app-exit')
				if (browserViews.length > 0) {
					return browserViews[0].webContents.executeJavaScript(`
						if (window.eyas && window.eyas.send) {
							window.eyas.send('app-exit');
							true;
						} else {
							false;
						}
					`);
				}
			}
			return false;
		});
		
		// Wait for the app to process the exit message
		if (result) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	} catch (error) {
		// If sending the message fails, the close() below will trigger the modal
		// which is acceptable - the test will still verify the app launched
		console.log('Could not send app-exit message:', error.message);
	}
	
	// Close the app - if the IPC message was sent successfully, this should close cleanly
	// Otherwise it may show the modal, but the test has already verified the app launched
	await electronApp.close();
});

test('app launches with eyas:// URL in argv (start-up request path)', async () => {
	const electronPath = require('electron');
	const mainPath = path.join(__dirname, '../../.build/index.js');

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, '--dev', 'eyas://example.com/test'],
		timeout: 30000
	});

	const window = await electronApp.firstWindow();
	await window.waitForLoadState('domcontentloaded');

	expect(electronApp.process()).not.toBeNull();
	expect(electronApp.process().pid).toBeGreaterThan(0);
	expect(window).not.toBeNull();

	await new Promise(resolve => setTimeout(resolve, 1000));

	try {
		const result = await electronApp.evaluate((electron) => {
			const { BrowserWindow } = electron;
			const windows = BrowserWindow.getAllWindows();
			if (windows.length > 0) {
				const mainWindow = windows[0];
				const browserViews = mainWindow.getBrowserViews();
				if (browserViews.length > 0) {
					return browserViews[0].webContents.executeJavaScript(`
						if (window.eyas && window.eyas.send) {
							window.eyas.send('app-exit');
							true;
						} else { false; }
					`);
				}
			}
			return false;
		});
		if (result) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	} catch (error) {
		console.log('Could not send app-exit message:', error.message);
	}
	await electronApp.close();
});
