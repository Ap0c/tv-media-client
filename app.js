// ----- Requires ----- //

const spawn = require('child_process').spawn;
const ipc = require('electron').ipcRenderer;


// ----- Setup ----- //

const main = document.getElementsByTagName('main')[0];
const MEDIA_SOURCE = 'http://media';


// ----- Models ----- //

const database = (function DB () {

	// ----- Properties ----- //

	let db = null;

	// ----- Functions ----- //

	// Builds the database, sets up the schema.
	function build () {

		const schemaBuilder = lf.schema.create('media', 1);

		schemaBuilder.createTable('movies')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addColumn('url', lf.Type.STRING)
			.addPrimaryKey(['id']);

		schemaBuilder.createTable('shows')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addPrimaryKey(['id']);

		schemaBuilder.createTable('episodes')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addColumn('number', lf.Type.INTEGER)
			.addColumn('season', lf.Type.INTEGER)
			.addColumn('show', lf.Type.INTEGER)
			.addPrimaryKey(['id'])
			.addNullable(['name', 'number', 'season']);

		return schemaBuilder;

	}

	// Inserts given table into database.
	function insertData (table, field) {

		return (data) => {

			// The bind circumvents awkward use of 'this' in lovefield source.
			const rows = data[field].map(table.createRow.bind(table));

			return db.insert().into(table).values(rows).exec().then(() => {
				return data;
			});

		};

	}

	// Refreshes the dataset from the server.
	function retrieveData () {

		const movies = db.getSchema().table('movies');
		const shows = db.getSchema().table('shows');
		const episodes = db.getSchema().table('episodes');
		const metadataUrl = `${MEDIA_SOURCE}/media_info`;

		db.createTransaction().exec([
			db.delete().from(movies),
			db.delete().from(shows),
			db.delete().from(episodes)
		]).then(() => {
			return m.request({ method: 'GET', url: metadataUrl });
		}).then(insertData(movies, 'movies'))
			.then(insertData(shows, 'shows'))
			.then(insertData(episodes, 'episodes'));

	}

	// ----- Methods ----- //

	// Populates the database from the server.
	function populate () {

		const schema = build();

		return schema.connect().then(function (conn) {

			db = conn;
			return retrieveData();

		});

	}

	// Retrieves a list of all the given media in a table.
	function mediaList (tableName) {

		const table = db.getSchema().table(tableName);

		return db.select().from(table).exec();

	}

	// Returns a list of episodes from a given tv show.
	function getEpisodes (showID) {

		const table = db.getSchema().table('episodes');

		return db.select().from(table)
			.where(table.show.eq(showID))
			.orderBy(table.season)
			.orderBy(table.number)
			.exec();

	}

	// ----- Constructor ----- //

	return {
		populate: populate,
		movies: mediaList.bind(null, 'movies'),
		shows: mediaList.bind(null, 'shows'),
		episodes: getEpisodes
	};

})();

// Stores application state for menu lists.
const menuVM = (function MenuVM () {

	// ----- Properties ----- //

	let list = m.prop([]);
	let currentItem = m.prop(0);
	let currentUrl = m.prop('/');

	// ----- Methods ----- //

	// Getter/setter for menu list, to ensure redraw on changes.
	function setgetList (newList) {

		if (newList !== undefined) {

			m.startComputation();
			list(newList);
			currentItem(0);
			currentUrl(newList[0].url);
			m.endComputation();

		} else {
			return list();
		}

	}

	// Updates the current list item, ensures mithril redraw.
	function updateSelection (newItem) {

		m.startComputation();
		currentItem(newItem);
		currentUrl(list()[newItem].url);
		m.endComputation();

	}

	// Moves the selection to the next item in the menu.
	function nextItem () {

		let newItem = currentItem() + 1;

		if (newItem === list().length) {
			newItem = 0;
		}

		updateSelection(newItem);

	}

	// Moves the selection to the previous item in the menu.
	function previousItem () {

		let newItem = currentItem() - 1;

		if (newItem < 0) {
			newItem = list().length - 1;
		}

		updateSelection(newItem);

	}

	// ----- Constructor ----- //

	return {
		currentItem: currentItem,
		list: setgetList,
		url: currentUrl,
		next: nextItem,
		previous: previousItem,
		listType: m.prop('main')
	};

})();

// Stores application state data for player.
const playerVM = (function PlayerVM () {

	// ----- Properties ----- //

	let src = m.prop('');
	let fullscreen = m.prop(false);
	let playing = m.prop(false);

	// ----- Methods ----- //

	// Getter/setter for src, ensures mithril update.
	function getsetSrc (source) {

		if (source !== undefined) {

			m.startComputation();
			src(`${MEDIA_SOURCE}${source}`);
			fullscreen(true);
			playing(true);
			m.endComputation();

		} else {
			return src();
		}

	}

	// Getter/setter for playing, ensures mithril update.
	function getsetPlaying (playStatus) {

		if (playStatus !== undefined) {

			m.startComputation();
			playing(playStatus);
			m.endComputation();

		} else {
			return playing();
		}

	}

	// Getter/setter for fullscreen, ensures mithril update.
	function getsetFullscreen (fullscreenStatus) {

		if (fullscreenStatus !== undefined) {

			m.startComputation();
			fullscreen(fullscreenStatus);
			playing(fullscreenStatus);
			m.endComputation();

		} else {
			return fullscreen();
		}

	}

	// ----- Constructor ----- //

	return {
		src: getsetSrc,
		fullscreen: getsetFullscreen,
		playing: getsetPlaying
	};

})();


// ----- Components ----- //

// Makes sure the current element is always visible.
function align (listItem) {
	listItem.scrollIntoView();
}

// An item in a menu list.
function listItem (text, itemNumber) {

	let options = {};

	if (itemNumber === menuVM.currentItem()) {
		options = { config: align, class: 'selected' };
	}

	return m('li', options, text);

}

// A menu list.
function listView (list, textField) {

	return m('ul', list().map((item, idx) => {
		return listItem(item[textField], idx);
	}));

}

// The main menu.
const mainMenu = {

	controller: function () {

		menuVM.list([
			{ text: 'Movies', url: '/movies' },
			{ text: 'TV Shows', url: '/tv_shows' }
		]);

		menuVM.listType('main');
		return { menu: menuVM.list };

	},

	view: function (ctrl) {
		return listView(ctrl.menu, 'text');
	}

};

// A list of the movies.
const movieComponent = {

	controller: function () {

		database.movies().then(menuVM.list);
		menuVM.listType('movies');

		return { movies: menuVM.list };

	},

	view: function (ctrl) {
		return listView(ctrl.movies, 'name');
	}

};

// A list of the tv shows.
const showsComponent = {

	controller: function () {

		database.shows().then((shows) => {

			menuVM.list(shows.map((show) => {

				show.url = `/show/${show.id}`;
				return show;

			}));

		});

		menuVM.listType('shows');

		return { shows: menuVM.list };

	},

	view: function (ctrl) {
		return listView(ctrl.shows, 'name');
	}

};

// A list of the episodes for a given show.
const episodesComponent = {

	controller: function () {

		database.episodes(m.route.param('showID')).then(menuVM.list);
		menuVM.listType('episodes');
		return { episodes: menuVM.list };

	},

	view: function (ctrl) {

		return m('ul', ctrl.episodes().map((ep, idx) => {

			let name = ep.name ? `, ${ep.name}` : '';
			return listItem(`Season ${ep.season}, Ep ${ep.number}${name}`, idx);

		}));

	}

};

// The video player.
const playerComponent = {

	videoElement: null,

	playState: function (element) {

		playerComponent.videoElement = element;

		if (playerVM.fullscreen()) {
			ipc.send('request-fullscreen');
		} else if (document.fullscreenElement) {
			document.exitFullscreen();
		}

		if (element.paused && playerVM.playing()) {
			element.play();
		} else if (!element.paused && !playerVM.playing()) {
			element.pause();
		}

	},

	controller: function () {
		return { vm: playerVM };
	},

	view: function (ctrl) {

		return m('video', {
			src: ctrl.vm.src(),
			config: playerComponent.playState
		});

	}

};


// ----- Routing ----- //

// Sets up routing.
function startRouting () {

	m.route.mode = 'pathname';

	m.route(main, '/', {
		'/': mainMenu,
		'/movies': movieComponent,
		'/tv_shows': showsComponent,
		'/show/:showID': episodesComponent
	});

}


// ----- Control Input ----- //

// Spawns the cec client.
// const cec = spawn('cec-client');
// const re = /key pressed: ([a-z].*) \(/;

// Updates the app based upon which key is pressed.
function handleKey (key) {

	if (key === 'down') {
		menuVM.next();
	} else if (key === 'up') {
		menuVM.previous();
	} else if (key === 'select') {

		const listType = menuVM.listType();

		if (listType === 'movies' || listType === 'episodes') {
			playerVM.src(menuVM.url());
		} else if (listType === 'shows' || listType === 'main') {
			m.route(menuVM.url());
		}

	} else if (key === 'exit') {

		if (playerVM.fullscreen()) {
			playerVM.fullscreen(false);
		} else {
			window.history.back();
		}

	} else if (key === 'play') {
		playerVM.playing(true);
	} else if (key === 'pause') {
		playerVM.playing(false);
	}

}

// Retrieves and parses data from the hdmi cec input.
// cec.stdout.on('data', function parseCec (data) {

// 	let match = data.toString().match(re);

// 	if (match) {
// 		handleKey(match[1]);
// 	}

// });

const mapping = {
	'w': 'up',
	's': 'down',
	'Enter': 'select',
	'Escape': 'exit',
	'p': 'play',
	'o': 'pause'
};

// Temporary keyboard input for development purposes.
document.addEventListener('keydown', (event) => {

	const action = mapping[event.key];

	if (action) {
		handleKey(action);
	}

});


// ----- Run ----- //

database.populate().then(startRouting);
m.mount(document.getElementById('player'), playerComponent);
