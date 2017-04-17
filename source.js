var reviewData;
var chartData;

var reviews = [];
var pitchforkArtists = [];
var years = [];
var genre;

var charts;
var chartPositions = [];

var merged = [];

var topScorers = [];

formatDate = d3.timeFormat("%m-%d-%Y");
//parse through pitchfork data
d3.json("reviews.json", function (error, json) {
	//console.log("Parsing pitchfork data");
	reviewData = json;
	parseDate = d3.timeParse("%m-%d-%Y");

	reviews = reviewData.map(function(k){
		var add = new Date(1970, 1, 1);
		add.setTime(add.getTime()+k.published);
		return{
			album: k.album[0],
			artist: k.artists,
			date: parseDate(formatDate(add)),
			score: k.score[0],
			//best_new_music: k.best_new_music,
			genre: k.genres
		};
	});

	reviews.sort(function(a,b){
		return b.score - a.score;
	});
	
	pitchforkArtists = d3.nest()
		.key(function(k) { return k.artist; })
		.entries(reviews);

	years = d3.nest()
		.key(function(k) { return k.date.getFullYear(); })
		.key(function(k) { return k.artist; })
		.rollup(function(v){
			return{
				score: d3.mean(v, function(d) {return d.score;}),
				genre: v[0].genre
			}
		})
		.entries(reviews);
	years = years.sort(function(a,b){
		return a.key - b.key;
	});
});

d3.tsv("us_billboard.tsv", function (error, tsv) {
	//console.log("Parsing billboard data");
	chartData = tsv;
	parseDate = d3.timeParse("%Y-%m-%d");

	charts = chartData.map(function(k) {
		return{
			artist: k.artist,
			title: k.title,
			peak_position: k.peak_position,
			total_weeks: k.total_weeks
		}
	});

	chartPositions = d3.nest()
		.key(function(k) { return k.artist; })
		.key(function(k) { return k.title; })
		.entries(chartData.map(function (k) {
			return{
				artist: k.artist,
				title: k.title,
				peak_position: k.peak_position,
				total_weeks: k.total_weeks
			}
		}));

	pitchforkArtists.forEach(function(k) {
		var artist = k.key;
		var albums;
		var charters = [];
		var non_charters = [];
		var tot_score = 0;
		var top_chart_position = 100000;
		var num_bnm = 0;

		var hasCharted = false;

		chartPositions.forEach(function(j) {
			if(artist.toUpperCase() === j.key){
				albums = intersect(k.values, j.values);
				hasCharted = true;
			}
		});
		if(!hasCharted){ albums = k.values; }

		albums.forEach(function(a) {
			if(a.top_chart_position != null){
				charters.push(a);
				if(a.top_chart_position < top_chart_position){
					top_chart_position = a.top_chart_position;
				}
			}
			else{
				non_charters.push(a);
			}
			tot_score += parseFloat(a.score);
			if(a.best_new_music){
				num_bnm++;
			}
		});

		var insert = {
			artist: artist,
			albums: albums,
			charters: charters,
			non_charters: non_charters,
			avg_score: tot_score/albums.length,
			top_chart_position: top_chart_position,
			num_bnm: num_bnm
		}
		merged.push(insert);
	});
	
	merged.sort(function(a,b) {
		return b.avg_score - a.avg_score;
	})

	var count = 24;
	var i = 0;
	merged.forEach(function(k) {
		if(k.albums.length > 5 && i < count){
			i++;
			topScorers.push(k);
		}
	});
	
});

function intersect(pitchforkAlbums, billboardAlbums) {
	var albums = [];
	pitchforkAlbums.forEach(function(p) {
		var hasCharted = false;
		billboardAlbums.forEach(function(b) {
			if(p.album.toUpperCase() === b.key.toUpperCase()){
				hasCharted = true;
				var add = {
					album: p.album,
					score: p.score,
					top_chart_position: b.values[0].peak_position,
					best_new_music: p.best_new_music,
					date: p.date,
					genres: p.genre
				}
				albums.push(add);
			}
		});
		if(!hasCharted){
			var add = {
				album: p.album,
				score: p.score,
				top_chart_position: null,
				best_new_music: p.best_new_music,
				date: p.date,
				genres: p.genre
			}
			albums.push(add);
		}
	});
	return albums;
}