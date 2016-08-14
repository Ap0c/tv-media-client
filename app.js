// ----- Setup ----- //

let main = document.getElementsByTagName('main')[0];


// ----- Components ----- //

let menu = {

	view: function (ctrl) {

		return [
			m('a[href="/movies"]', { config: m.route }, 'Movies'),
			m('a[href="/tv_shows"]', { config: m.route }, 'TV Shows')
		];

	}

};

let movies = {

	view: function (ctrl) {
		console.log('here');
		return 'Here are some movies...';
	}

};

let tvShows = {

	view: function (ctrl) {
		return 'Here are some tv shows...';
	}

};


// ----- Routing ----- //

m.route.mode = 'pathname';

m.route(main, '/', {
	'/': menu,
	'/movies': movies,
	'/tv_shows': tvShows
});
