// ----- Setup ----- //

const main = document.getElementsByTagName('main')[0];
const MEDIA_SOURCE = 'http://media';


// ----- Models ----- //

const database = (function DB () {

	// ----- Properties ----- //

	let db = null;

	// ----- Methods ----- //

	// Builds the database, sets up the schema.
	function build () {

		let schemaBuilder = lf.schema.create('media', 1);

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
			.addPrimaryKey(['id']);

		return schemaBuilder;

	}

	// Refreshes the dataset from the server.
	function retrieveData () {

		let movies = db.getSchema().table('movies');
		let shows = db.getSchema().table('shows');
		let episodes = db.getSchema().table('episodes');

		let data = null;

		return db.delete().from(movies).exec().then(function () {
			return db.delete().from(shows).exec();
		}).then(function () {
			return db.delete().from(episodes).exec();
		}).then(function () {
			return m.request({ method: 'GET', url: `${MEDIA_SOURCE}/media_info` });
		}).then(function (res) {

			data = res;

			let rows = data.movies.map(function (movie) {
				return movies.createRow(movie);
			});

			return db.insert().into(movies).values(rows).exec();

		}).then(function () {

			let rows = data.shows.map(function (show) {
				return shows.createRow(show);
			});

			return db.insert().into(shows).values(rows).exec();

		}).then(function () {

			let rows = data.episodes.map(function (episode) {
				return episodes.createRow(episode);
			});

			return db.insert().into(episodes).values(rows).exec();

		});

	}

	// Returns a list of movies.
	function getMovies () {

		let movieList = m.prop([]);
		let table = db.getSchema().table('movies');

		db.select(table.name, table.url).from(table).then((result) => {

			movieList(result);
			m.redraw();

		});

		return movieList;

	}

	// Returns a list of tv shows.
	function getShows () {

		let showList = m.prop([]);
		let table = db.getSchema().table('shows');

		db.select().from(table).then((result) => {

			showList(result);
			m.redraw();

		});

		return showList;

	}

	// Returns a list of episodes from a given tv show.
	function getEpisodes (showID) {

		let episodeList = m.prop([]);
		let table = db.getSchema().table('episodes');

		db.select().from(table)
			.where(table.show.eq(showID))
			.orderBy(table.season)
			.orderBy(table.number)
			.then((result) => {

				episodeList(result);
				m.redraw();

		});

		return episodeList;

	}

	// Populates the database from the server.
	function populate () {

		let schema = build();

		return schema.connect().then(function (conn) {
			db = conn;
		});

	}

	return {
		populate: populate,
		movies: getMovies,
		shows: getShows,
		episodes: getEpisodes
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
			return m('li', movie.name);
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


// ----- Start ----- //

database.populate().then(startRouting);
