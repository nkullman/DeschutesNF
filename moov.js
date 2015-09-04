var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
	
var xScale = d3.scale.linear()
    .range([0, width]);

var yScale = d3.scale.linear()
    .range([height, 0]);

var colorScale = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");
	
var svg = d3.select(".scatterplotDiv").append("svg")
    .attr('viewBox', "0 0 " + (width + margin.right + margin.left) + " " + (height + margin.top + margin.bottom))
    .attr('preserveAspectRatio',"xMinYMin meet")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
d3.csv("visualization/data/frontiers.csv", function(error, data) {
  if (error) throw error;
  
  var scatterPlotCols = Object.keys(data[0]);
  var objectives = [];
  scatterPlotCols.forEach(function(d){
    if (d !== "Frontier" && d !== "SolutionIndex"){
      objectives.push(d);
    }
  });
  var numObjectives = objectives.length;
  var xVarCtr = 0,
      yVarCtr = 1;
  var xVar = updateVar(xVarCtr),
      yVar = updateVar(yVarCtr);
  function updateVar(varCtr){
      return objectives[varCtr % numObjectives];
  }

  data.forEach(function(d) {
    for (var keyIdx in scatterPlotCols) {
      var key = scatterPlotCols[keyIdx];
      if (key !== "Frontier"){
        d[key] = +d[key];
      }
    }
  });

  xScale.domain(d3.extent(data, function(d) { return d[xVar]; })).nice();
  yScale.domain(d3.extent(data, function(d) { return d[yVar]; })).nice();

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .on("click", updateXAxis)
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .style("cursor", "pointer")
      .text(xVar); // will have to add more logic and hard-coded details if we want to add units, make more descriptive, etc.

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .on("click", updateYAxis)
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style("cursor", "pointer")
      .text(yVar) // will have to add more logic and hard-coded details if we want to add units, make more descriptive, etc.

  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d) { return xScale(d[xVar]); })
      .attr("cy", function(d) { return yScale(d[yVar]); })
      .style("fill", function(d) { return colorScale(d.Frontier); });

  var legend = svg.selectAll(".legend")
      .data(colorScale.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", colorScale);

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
      
 function updateYAxis(){
   // update what the variable encoded is
    yVarCtr++;
    yVar = updateVar(yVarCtr);
    // update the scale
    yScale.domain(d3.extent(data, function(d) { return d[yVar]; })).nice();
    // update the axes
    d3.select(".y.axis").transition().call(yAxis);
    d3.select(".y.axis .label").text(yVar);
    // update the circles
    d3.selectAll(".dot").transition()
      .attr("cy", function(d) {return yScale(d[yVar])});
  }
  
  function updateXAxis(){
   // update what the variable encoded is
    xVarCtr++;
    xVar = updateVar(xVarCtr);
    // update the scale
    xScale.domain(d3.extent(data, function(d) { return d[xVar]; })).nice();
    // update the axes
    d3.select(".x.axis").transition().call(xAxis);
    d3.select(".x.axis .label").text(xVar);
    // update the circles
    d3.selectAll(".dot").transition()
      .attr("cx", function(d) {return xScale(d[xVar])});
  }

});