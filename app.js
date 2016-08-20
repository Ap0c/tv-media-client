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

		const list = m.prop([]);
		const table = db.getSchema().table(tableName);

		db.select().from(table).exec().then((result) => {

			list(result);
			m.redraw();

		});

		return list;

	}

	// Returns a list of episodes from a given tv show.
	function getEpisodes (showID) {

		const episodeList = m.prop([]);
		const table = db.getSchema().table('episodes');

		db.select().from(table)
			.where(table.show.eq(showID))
			.orderBy(table.season)
			.orderBy(table.number)
			.exec().then((result) => {

				episodeList(result);
				m.redraw();

		});

		return episodeList;

	}

	// ----- Constructor ----- //

	return {
		populate: populate,
		movies: mediaList.bind(null, 'movies'),
		shows: mediaList.bind(null, 'shows'),
		episodes: getEpisodes
	};

})();

// Stores application state data about player.
const playerVM = (function PlayerVM () {

	// ----- Properties ----- //

	let src = m.prop('');
	let fullscreen = m.prop(false);

	// ----- Methods ----- //

	// Getter/setter for src.
	function getsetSrc (source) {

		if (source) {

			src(`${MEDIA_SOURCE}${source}`);
			fullscreen(true);

		} else {
			return src();
		}

	}

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
		return { movies: database.movies() };
	},

	view: function (ctrl) {

		return m('ul', ctrl.movies().map((movie) => {

			return m('li', { onclick: () => { playerVM.src(movie.url); } },
				movie.name);

		}));

	}

};

// A list of the tv shows.
const showsComponent = {

	controller: function () {
		return { shows: database.shows() };
	},

	view: function (ctrl) {

		return m('ul', ctrl.shows().map((show) => {

			return m('li', [
				m(`a[href="/show/${show.id}"]`, { config: m.route }, show.name)
			]);

		}));

	}

};

// A list of the episodes for a given show.
const episodesComponent = {

	controller: function () {
		return { episodes: database.episodes(m.route.param('showID')) };
	},

	view: function (ctrl) {

		return m('ul', ctrl.episodes().map((episode) => {
			return m('li', `Season ${episode.season}, Ep ${episode.number}`);
		}));

	}

};

// The video player.
const playerComponent = {

	fullscreen: function (element) {

		console.log(element);

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


// ----- Run ----- //

database.populate().then(startRouting);
m.mount(document.getElementById('player'), playerComponent);
