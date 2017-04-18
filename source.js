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

var year = 1999;

formatDate = d3.timeFormat("%m-%d-%Y");

//parse through pitchfork data
d3.queue()
.defer(d3.json,"reviews.json")
.defer(d3.tsv,"us_billboard.tsv")
.await(function(error,json,tsv){

    data_process_A(json);
    data_process_B(tsv);

    topScorers.forEach(function(a) {
        renderArtistModule("#favorites", a);
    });

    var slider = d3.select("#choice");

    slider.append("input")
	    .attr("type", "range")
	    .attr("class", "slider")
	    .attr("id", "slider")
	    .attr("min", "1999")
	    .attr("max", "2016")
	    .attr("step", "1")
	    .attr("value", "1999")
	    .style("width", "500px")
	    .on("input", function () {
	        year = Number(this.value);
	        rank();
    	});

    rank();
});

function data_process_A(json) {
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
            best_new_music: k.best_new_music,
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

}

function data_process_B(tsv) {
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

    var count = 9;
    var i = 0;
    merged.forEach(function(k) {
        if(k.albums.length > 3 && i < count){
            i++;
            topScorers.push(k);
        }
    //console.log(merged);
    })
}

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

function renderArtistModule(div, artist) {
    var div = d3.select(div);
    var aX = 0;
	var svg = div.append("svg").attr("width", 350).attr("height", 155).style("margin","5px");
    svg.append("circle")
        .attr("cx",200).attr("cy",75).attr("r", 50).attr("class", "rating")
    svg.append("text")
        .text(d3.format(".2f")(artist.avg_score)).attr("x", 200).attr("y", 75).attr("class", "ratingC")
        .style("text-anchor", "middle").style("dominant-baseline", "middle")
    svg.append("text").attr("class", "artist")
        .text(artist.artist).attr("x", "75").attr("y","145")
        .style("text-anchor", "middle");
    svg.append("text").attr("class", "label")
		.text("Average Score").attr("x", "200").attr("y","145");
    svg.append("svg:image").attr("class","artistIMG")
        .attr("xlink:href", "./images/" + artist.artist + ".jpg")
        .attr("width", 100).attr("height", 100)
        .attr("x", 25).attr("y", 25);
	svg.append("text").attr("class", "label")
 		.text("Albums").attr("x", "300").attr("y","25")
		.style("alignment-baseline", "hanging");
	aX = 300;
	var aY = 54;
	artist.albums.forEach(function (a) {
		var color = "black";
		if(a.best_new_music){
			color = "red";
		}
		svg.append("circle")
			.attr("cx", aX)
			.attr("cy", aY)
			.attr("r", 3)
			.style("fill", color);
		aY += 12;
	});
}

function rank(){
	var svg_rank = d3.select("#rank");
	svg_rank.selectAll("*").remove();

	var width = svg_rank.attr("width");
	var height = svg_rank.attr("height");
	var padding = 40;

	var intervals = new Array(31).fill(0);
	var format = d3.format(".1f");

	var colorScale = d3.scaleLinear()
	.domain([1,200])
	.range(['#f03b20','#ffeda0']);

	var legend = d3.range(0, 200, 20);

	var yscale = d3.scaleLinear().domain([7,10]).range([height-padding*1.5,padding*0.5]);

	var yaxis = d3.axisLeft(yscale);
	svg_rank.append("g").attr("transform","translate("+padding+",0)").call(yaxis.tickFormat(d3.format(".1f")));

	var data_rank = merged.sort(function(a,b){return b.avg_score-a.avg_score;}).slice(0,2000);

	data = [];
	data_rank.forEach(function(d){
	    d.albums.forEach(function(i){
	        if (!i.hasOwnProperty("artist"))
	            i.artist = [d.artist];
	        data = data.concat([i]);
	    })
	})

	var item;

	var tool_tip = d3.tip()
		.attr("class", "d3-tip")
		.offset([-8, 0])
		.html(function(d){
		return getinfo(d,year)});

	svg_rank.call(tool_tip);

	svg_rank.selectAll("circles")
		.data(data)
		.enter().append("g")
		.attr("class", "circles")
		.append("circle")
		.attr("cx", function (d) {
		    score = format(d.score);
		    if(d.score >= 7 && d.date.getFullYear()==year){
		        item = d;
		        intervals[score*10-70] += 1;
		        return intervals[score*10-70]*10 + padding +10;
		    }
		})
		.attr("cy", function (d) {
		    if(d.score >= 7 && d.date.getFullYear()==year)
		        return yscale(format(d.score));
		})
		.attr("r", function (d) {
		    if(d.score >= 7 && d.date.getFullYear()==year)
		        return "3";
		})
		.style("fill",function(d){
		    if(d.hasOwnProperty("top_chart_position") && d.top_chart_position){
		        return colorScale(Number(d.top_chart_position));
		    }
		    else
		        return "grey";
		})
		.on('mouseover', tool_tip.show)
		.on('mouseout', tool_tip.hide);

	svg_rank.selectAll("rects")
		.data(legend)
		.enter().append("g")
		.attr("class","rect")
		.append("rect")
		.attr("x",function(d,i){return 40*i+60;})
		.attr("y","460")
		.attr("width","40")
		.attr("height","10")
		.style("fill",function(d){return colorScale(d);});

	svg_rank.selectAll("legend")
		.data(legend)
		.enter().append("g")
		.append("text")
		.attr("x",function(d,i){return 40*i+60;})
		.attr("y","480")
		.text(function(d,i){return d;})
		.style("text-anchor", "left")
		.style("alignment-baseline","center")
		.style("font-size","10");
}

function getinfo(item,time){
    var info = "";

    info += "Artist: "+ item.artist[0]+ "<br>";
    info += "Album: "+ item.album + "<br>";
    info += "Year: "+ item.date.getFullYear()+ "<br>";
    info += "Score: "+ item.score + "<br>";
    if(item.hasOwnProperty("top_chart_position") && item.top_chart_position)
        info += "Top Position:" + item.top_chart_position;

    return info;
}