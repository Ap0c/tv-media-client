// ----- Setup ----- //

const main = document.getElementsByTagName('main')[0];
const MEDIA_SOURCE = 'http://media';


// ----- Models ----- //

const db = (function DB () {

	let moviesDB = new PouchDB('movies');
	let showsDB = new PouchDB('shows');
	let episodesDB = new PouchDB('episodes');

	// Resets the models, then fills with media metadata.
	function populate (mediaData) {

		return Promise.all([
			moviesDB.destroy(),
			showsDB.destroy(),
			episodesDB.destroy()
		]).then(function () {
			moviesDB = new PouchDB('movies');
			showsDB = new PouchDB('shows');
			episodesDB = new PouchDB('episodes');
		}).then(() => {

			return Promise.all([
				moviesDB.bulkDocs(mediaData.movies),
				showsDB.bulkDocs(mediaData.shows),
				episodesDB.bulkDocs(mediaData.episodes)
			]);

		});

	}

	// Returns a list of movies.
	function getMovies () {

		let movieList = m.prop([]);

		moviesDB.allDocs({ include_docs: true }).then((movies) => {

			movieList(movies.rows.map((movie) => {
				return { name: movie.doc.name, url: movie.doc.url };
			}));

			m.redraw();

		});

		return movieList;

	}

	// Returns a list of tv shows.
	function getShows () {

		let showList = m.prop([]);

		showsDB.allDocs({ include_docs: true }).then((shows) => {

			showList(shows.rows.map((show) => {
				return { name: show.doc.name, id: show.doc.id };
			}));

			m.redraw();

		});

		return showList;

	}

	// Returns a list of episodes from a given tv show.
	function getEpisodes (showID) {

		let episodeList = m.prop([]);

		episodesDB.find({
			selector: { show: showID },
			sort: { sort: [ { season: 'desc' }, { number: 'desc' } ] }
		}).then((episodes) => {

			episodeList(episodes.docs);
			m.redraw();

		});

		return episodeList;

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
		return { movies: db.movies() };
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
		return { shows: db.shows() };
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
		return { episodes: db.episodes(m.route.param('showID')) };
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

m.request({ method: 'GET', url: `${MEDIA_SOURCE}/media_info` })
	.then(db.populate)
	.then(startRouting);
