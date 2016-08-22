// ----- Requires ----- //

const spawn = require('child_process').spawn;


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

	// ----- Methods ----- //

	function setgetList (newList) {

		if (newList !== undefined) {

			m.startComputation();
			list(newList);
			m.endComputation();

		} else {
			return list();
		}

	}

	// ----- Constructor ----- //

	return {
		focus: m.prop(0),
		list: setgetList,
		url: m.prop('/')
	};

})();

// Stores application state data for player.
const playerVM = (function PlayerVM () {

	// ----- Properties ----- //

	let src = m.prop('');
	let fullscreen = m.prop(false);
	let playing = false;

	// ----- Methods ----- //

	// Getter/setter for src.
	function getsetSrc (source) {

		if (source !== undefined) {

			src(`${MEDIA_SOURCE}${source}`);
			fullscreen(true);

		} else {
			return src();
		}

	}

	// ----- Constructor ----- //

	return {
		src: getsetSrc,
		fullscreen: fullscreen
	};

})();


// ----- Components ----- //

// The main menu.
const mainMenu = {

	view: function (ctrl) {

		return [
			m('a[href="/movies"]', { config: m.route }, 'Movies'),
			m('a[href="/tv_shows"]', { config: m.route }, 'TV Shows')
		];

	}

};

// A list of the movies.
const movieComponent = {

	controller: function () {

		database.movies().then(menuVM.list);
		return { movies: menuVM.list };

	},

	view: function (ctrl) {

		return m('ul', ctrl.movies().map((movie, idx) => {

			return m('li', { onclick: () => { playerVM.src(movie.url); } },
				movie.name);

		}));

	}

};

// A list of the tv shows.
const showsComponent = {

	controller: function () {

		database.shows().then(menuVM.list);
		return { shows: menuVM.list };

	},

	view: function (ctrl) {

		return m('ul', ctrl.shows().map((show, idx) => {

			return m('li', [
				m(`a[href="/show/${show.id}"]`, { config: m.route }, show.name)
			]);

		}));

	}

};

// A list of the episodes for a given show.
const episodesComponent = {

	controller: function () {

		database.episodes(m.route.param('showID')).then(menuVM.list);
		return { episodes: menuVM.list };

	},

	view: function (ctrl) {

		return m('ul', ctrl.episodes().map((episode, idx) => {
			return m('li', `Season ${episode.season}, Ep ${episode.number}`);
		}));

	}

};

// The video player.
const playerComponent = {

	fullscreen: function (element) {

		if (playerVM.fullscreen()) {

			element.webkitRequestFullscreen();
			element.play();

		}

	},

	controller: function () {
		return { vm: playerVM };
	},

	view: function (ctrl) {
		return m('video', { src: ctrl.vm.src(), config: playerComponent.fullscreen });
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
const cec = spawn('cec-client');
const re = /key pressed: ([a-z].*) \(/;

// Updates the app based upon which key is pressed.
function handleKey (key) {
	console.log(key);
}

// Retrieves and parses data from the hdmi cec input.
cec.stdout.on('data', function parseCec (data) {

	let match = data.toString().match(re);

	if (match) {
		handleKey(match[1]);
	}

});


// ----- Run ----- //

database.populate().then(startRouting);
m.mount(document.getElementById('player'), playerComponent);
