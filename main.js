// ----- Requires ----- //

const {app, BrowserWindow} = require('electron');
const ipc = require('electron').ipcMain;


// ----- Setup ----- //

let win = null;


// ----- Functions ----- //

// Creates browser window displaying main page.
function createWindow () {

	win = new BrowserWindow({ width: 800, height: 600 });
	win.loadURL(`file://${__dirname}/index.html`);

	win.on('closed', () => {
		win = null;
	});

	ipc.on('request-fullscreen', () => {

		const cmd = 'playerComponent.videoElement.webkitRequestFullscreen()';
		win.webContents.executeJavaScript(cmd, true);

	});

}


// ----- Event Listeners ----- //

app.on('ready', createWindow);

app.on('window-all-closed', () => {

	if (process.platform !== 'darwin') {
		app.quit();
	}

});

// macOS dock icon click.
app.on('activate', () => {

	if (win === null) {
		createWindow();
	}

});
