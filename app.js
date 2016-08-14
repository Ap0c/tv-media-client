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

		return moviesDB.allDocs({ include_docs: true }).then((movies) => {

			return movies.rows.map((movie) => {
				return { name: movie.doc.name, url: movie.doc.url };
			});

		});

	}

	return {
		populate: populate,
		movies: getMovies
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
const movies = {

	view: function (ctrl) {
		return 'Here are some movies...';
	}

};

// A list of the tv shows.
const tvShows = {

	view: function (ctrl) {
		return 'Here are some tv shows...';
	}

};


// ----- Routing ----- //

// Sets up routing.
function startRouting () {

	m.route.mode = 'pathname';

	m.route(main, '/', {
		'/': mainMenu,
		'/movies': movies,
		'/tv_shows': tvShows
	});

}


// ----- Start ----- //

m.request({ method: 'GET', url: `${MEDIA_SOURCE}/media_info` })
	.then(db.populate)
	.then(startRouting);
