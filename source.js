var reviewData;
var chartData;

var reviews = [];
var pitchforkArtists = [];
var years = [];
var chosen_artists = [];
var genre;

var charts;
var chartPositions = [];

var merged = [];
var topScorers = [];
var nonOneHits = [];

var positions = new Array(6).fill(0);

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
            .attr("max", "2017")
            .attr("step", "1")
            .attr("value", "1999")
            .style("width", "500px")
            .on("input", function () {
                year = Number(this.value);
                rank();
                showpie(positions);
            });

        rank();
        draw_top_charters();
        showpie(positions);

        var div_2 = document.getElementById('overTime');
        div_2.style.display = 'none';

        d3.select("#by_artist").on("click", function(){
            var div_1 = document.getElementById('charters');
            var div_2 = document.getElementById('overTime');
            div_2.style.display = 'none';
            div_1.style.display = 'block';
        });

        d3.select("#by_album").on("click", function(){
            var div_1 = document.getElementById('charters');
            var div_2 = document.getElementById('overTime');
            div_1.style.display = 'none';
            div_2.style.display = 'block';
        });

    });

function data_process_A(json) {
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
        var num_top_charted = 0;

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
                num_top_charted++;
                if(parseInt(a.top_chart_position) < parseInt(top_chart_position)){
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
            num_top_charted: num_top_charted,
            num_bnm: num_bnm
        };
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
        if(k.num_top_charted > 1){
            nonOneHits.push(k);
        }
    });
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
        .style("text-anchor", "middle").style("dominant-baseline", "middle");

    svg.append("text").attr("class", "artist")
        .text(artist.artist).attr("x", "75").attr("y","145")
        .style("text-anchor", "middle");

    svg.append("text").attr("class", "label")
        .text("Average Score").attr("x", "200").attr("y","145");

    svg.append("svg:image").attr("class","artistIMG")
        .attr("xlink:href", "./images/" + artist.artist + ".jpg")
        .attr("width", 100).attr("height", 100)
        .attr("x", 25).attr("y", 25)
        .style("cursor", "pointer")
        .on("click",function(){
            index = chosen_artists.indexOf(artist.artist);
            if(index<0)
                chosen_artists=[artist.artist];
            else
                chosen_artists=[];

            console.log(chosen_artists);
            draw_top_charters();
            rank();
        });

    svg.append("text").attr("class", "label")
        .text("Albums").attr("x", "300").attr("y","25")
        .style("alignment-baseline", "hanging");

    var tool_tip = d3.tip()
        .attr("class", "d3-tip-top")
        .offset([-8, 0])
        .html(function(d){
            return getfavorite(d);});

    svg.call(tool_tip);
    svg.selectAll("circles")
        .data(artist.albums)
        .enter().append("g")
        .attr("class", "circles")
        .append("circle")
        .attr("r","4")
        .attr("cx", "300")
        .attr("cy",function(d,i){return 54 + 16*i;})
        .style("fill",function(d){
            if(d.best_new_music) return "red";
            else return "black";
        })
        .on('mouseover', tool_tip.show)
        .on('mouseout', tool_tip.hide);

}

function rank(){
    var svg_rank = d3.select("#rank");
    svg_rank.selectAll("*").remove();

    var width = svg_rank.attr("width");
    var height = svg_rank.attr("height");
    var padding = 40;

    var intervals = new Array(31).fill(0);
    positions.fill(0);
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
            if (!i.hasOwnProperty("top_chart_position"))
                i.top_chart_position = 100000;
            if (!i.top_chart_position)
                i.top_chart_position = 100000;
            data = data.concat([i]);
        })
    })
    data.sort(function(a,b){return a.top_chart_position - b.top_chart_position;});
    data = data.filter(function(d){return d.date.getFullYear() == year;});

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
        .attr("class", function(d){
            if(chosen_artists.indexOf(d.artist[0])<0) return "circles";
            else { return "chosen circles";}
        })
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
            if(d.score >= 7)
                return yscale(format(d.score));
        })
        .attr("r", function (d) {
            if(d.score >= 7)
                return "4.5";
        })
        .style("fill",function(d){
            if( d.top_chart_position!=100000){
                //console.log(parseInt(d.top_chart_position/40));
                positions[parseInt(d.top_chart_position/40)]+=1;
                return colorScale(Number(d.top_chart_position));
            }
            else{
                positions[5] += 1;
                return "grey";
            }
        })
        .on('mouseover', tool_tip.show)
        .on('mouseout', tool_tip.hide);
    //console.log(positions);

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

    svg_rank.selectAll(".chosen circle")
        .transition()
        .duration(1000)
        .on("start", function repeat() {
            d3.active(this)
                .style("r","3")
                .transition()
                .style("r","5")
                .transition()
                .on("start", repeat);
        });
}

function getinfo(item,time){
    var info = "";
    info += "Artist: "+ item.artist[0]+ "<br>";
    info += "Album: "+ item.album + "<br>";
    if(item.top_chart_position!=100000)
        info += "Top Position:" + item.top_chart_position;

    return info;
}

function getfavorite(item){
    var info = "";
    //console.log(item);

    info += "<p><i><b> "+ item.album + "</i></b></p>";
    info += "<p>Year: "+ item.date.getFullYear()+ "</p>";
    info += "<p>Score: "+ item.score + "</p>";
    if(item.best_new_music)
        info += "<b><p>Best New Music</b></p>";
    if(item.top_chart_position!=100000)
        info += "<p>Top Position:" + item.top_chart_position + "</p>";

    return info;
}

function getArtist(item){
    var info = "";

    info += "Name: "+ item.artist + "<br>";
    info += "Average score: "+ item.avg_score.toFixed(2) + "<br>";
    info += "Portion of albums been on top chart: "+ item.num_top_charted + " of " + item.albums.length + "<br>";
    info += "Highest Position: " + item.top_chart_position;

    return info;
}

function draw_top_charters(){
    //console.log("Boris");

    var svg = d3.select("#top_charter");
    svg.selectAll("*").remove();

    var width = svg.attr("width");
    var height = svg.attr("height");
    var padding = 60;

    var dataset = [];
    var score_range = [10, 0];
    var position_quantity = [];
    while(position_quantity.length <= 200){
        position_quantity.push(0);
    }

    for(var i = 0; i < merged.length; i++){
        if(merged[i]["top_chart_position"] <= 100 && merged[i]["num_top_charted"] > 1){
            if(Number.isInteger(parseInt(merged[i]["top_chart_position"]))){
                dataset.push(merged[i]);
                position_quantity[parseInt(merged[i]["top_chart_position"])]++;
                if(merged[i]["avg_score"].toFixed(2) < score_range[0]){
                    score_range[0] = merged[i]["avg_score"].toFixed(2);
                }
                if(merged[i]["avg_score"].toFixed(2) > score_range[1]){
                    score_range[1] = merged[i]["avg_score"].toFixed(2);
                }
            }
        }
    }
    var position_counter = position_quantity.slice();
    score_range[0] = Math.floor(score_range[0]);
    score_range[1] = Math.floor(score_range[1]);

    var yScale = d3.scaleLinear()
        .domain([100,1])
        .range([height-padding*1.5,padding*0.5]);

    var yAxis = d3.axisLeft(yScale);
    svg.append("g")
        .attr("transform","translate("+padding+",0)")
        .call(yAxis);
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Ranking");

    var tool_tip = d3.tip()
        .attr("class", "d3-tip")
        .offset([-8, 0])
        .html(function(d){
            return getArtist(d)
        });

    var colorScale = d3.scaleLinear()
        .domain([score_range[0],score_range[1]])
        .range(['#f2f2f2', '#ff0000']);
        //.range(['#ffeda0', '#f03b20']);

    var legend = d3.range(score_range[0], score_range[1], 1);



    svg.call(tool_tip);

    svg.selectAll(".circles")
        .data(dataset)
        .enter().append("g")
        .attr("class", function(d){
            if(chosen_artists.indexOf(d.artist)<0) return "circles";
            else return "chosen circles";
        })
        .append("circle")
        .attr("cx", function (d){
            var position = parseInt(d["top_chart_position"]);
            position_counter[position]--;
            return padding + (15 * (position_quantity[position] - position_counter[position]))
        })
        .attr("cy", function (d) {
            return yScale(d["top_chart_position"]);
        })
        .attr("r", "4")
        .style("fill", function(d){
            return colorScale(d["avg_score"])
        })
        .on('mouseover', tool_tip.show)
        .on('mouseout', tool_tip.hide);

    svg.selectAll(".chosen circle")
        .transition()
        .duration(500)
        .on("start", function repeat() {
            d3.active(this)
                .style("fill","orange")
                .attr("r", 10)
                .transition()
                .style("fill","white")
                .attr("r", 4)
                .transition()
                .on("start", repeat);
        });

    svg.selectAll("rects")
        .data(legend)
        .enter().append("g")
        .attr("class","rect")
        .append("rect")
        .attr("x",function(d,i){return 40*i+60;})
        .attr("y",0)
        .attr("width","40")
        .attr("height","10")
        .style("fill",function(d){return colorScale(d);});

    svg.selectAll("legend")
        .data(legend)
        .enter().append("g")
        .append("text")
        .attr("x",function(d,i){return 40*i+60;})
        .attr("y", 20)
        .text(function(d,i){return d;})
        .style("text-anchor", "left")
        .style("alignment-baseline","center")
        .style("font-size","10");
}

function showpie(data){
    var svg_pie = d3.select("#pie");
    svg_pie.selectAll("*").remove();

    var arc = d3.arc()
        .innerRadius(30)
        .outerRadius(50);

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d; });

    var color = ['#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c'];
    var exist = ['#d9d9d9','grey'];

    var pies_1 = svg_pie.selectAll(".pies")
        .data(pie(data.slice(0,5)))
        .enter()
        .append('g')
        .attr('class','arc')
        .attr("transform","translate(50,250)");

    pies_1.append("path")
        .transition(1000)
        .attr('d',arc)
        .attr("fill",function(d,i){
            return color[4-i];
        });

    percentage = d3.sum(data.slice(0,5));

    var pies_2 = svg_pie.selectAll(".pies")
        .data(pie([percentage,data[5]]))
        .enter()
        .append('g')
        .attr('class','arc')
        .attr("transform","translate(50,100)");

    pies_2.append("path")
        .transition(1000)
        .attr('d',arc)
        .attr("fill",function(d,i){
            return exist[i];
        });

    svg_pie.append("text")
        .attr("x","150")
        .attr("y","50")
        .text(year)
        .style("text-anchor", "left")
        .style("alignment-baseline","center")
        .style("font-size","20");

    svg_pie.append("text")
        .attr("x","140")
        .attr("y","100")
        .text(d3.format(".2f")(percentage/data[5]*100) + "% show on the chart")
        .style("text-anchor", "left")
        .style("alignment-baseline","center")
        .style("font-size","15");

    svg_pie.append("rect")
        .attr("x","120")
        .attr("y", "87.5")
        .attr("width","15")
        .attr("height","15")
        .style("fill",exist[0]);

    positions.slice(0,5).forEach(function(d,i){
        svg_pie.append("rect")
            .attr("x","120")
            .attr("y", 187.5+i*30)
            .attr("width","15")
            .attr("height","15")
            .style("fill",color[4-i]);

        svg_pie.append("text")
            .attr("x","140")
            .attr("y", 200+i*30)
            .text(d3.format(".1f")(d/percentage*100) + "% in top " + i*40+ "-" +(i+1)*40)
            .style("text-anchor", "left")
            .style("alignment-baseline","center")
            .style("font-size","15");
    })
}