// ----- Setup ----- //

let main = document.getElementsByTagName('main')[0];


// ----- Components ----- //

let menu = {

	controller: function () {},

	view: function (ctrl) {

		return [
			m('a', [
				m('h2', 'Movies')
			]),
			m('a', [
				m('h2', 'TV Shows')
			])
		];

	}

};


// ----- Mount ----- //

m.mount(main, menu);
