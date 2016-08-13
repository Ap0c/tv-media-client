// ----- Requires ----- //

const {app, BrowserWindow} = require('electron');


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
