var margin = {top: 20, right: 200, bottom: 30, left: 50},
    width = 1000 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
	
var xScale = d3.scale.linear()
    .range([0, width]);

var yScale = d3.scale.linear()
    .range([height, 0]);
    
var radiusScale = d3.scale.sqrt();

var colorScale = d3.scale.category10();

var initFinalMapObj = "FireHazardIncrease"; // other option (for now) is "MinOwlHabitat"
var initFinalMapObjColorScale = d3.scale.linear();
if (initFinalMapObj == "FireHazardIncrease"){
  initFinalMapObjColorScale.range(["white","red"]);
} else {
  initFinalMapObjColorScale.range(["#d3d3d3","green"]);
}

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");
    
var xVar,
    yVar,
    radiusVar,
    scatterPlotCols,
    objectives,
    numObjectives,
    dotRadius = 4,
    radiusScaleRange = [dotRadius,dotRadius],
    numMapsPerRow = 4,
    datafilename;
    
var intro = introJs();
    
radiusScale.range(radiusScaleRange);
    
var encodeRadius = false;
var drilldownTypeSelector = 0;
var selected_solutions = [];
var sortType = [];
    
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    var thisdata = d[0][0]["__data__"];
    var result = "";
    for (var col in scatterPlotCols){
      if (col !== "SolutionIndex" && col !== "UniqueID"){
        result += "<strong>" + scatterPlotCols[col] + ":</strong> <span style='color:#e8f4f8'>" + thisdata[scatterPlotCols[col]] + "</span>"
        if (col !== scatterPlotCols.length - 1) { result += "<br>";}
      };
    }
    return result;
  })
	
var svg = d3.select(".scatterplotDiv").append("svg")
    .attr('id',"scatterPlotSVG")
    .attr('viewBox', "0 0 " + (width + margin.right + margin.left) + " " + (height + margin.top + margin.bottom))
    .attr('preserveAspectRatio',"xMinYMin meet")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
d3.select("#scatterPlotSVG").call(tip);
    
d3.csv("visualization/mapMaking/mapMakingData_noneOnly_final.csv",function(maperror, mapdata) {
  if (maperror) throw maperror;
  // filter to the objective we're interested in plotting
  var curmapdata = mapdata.filter(function(d){return d.Objective === initFinalMapObj;})
  curmapdata.forEach(function (d) {
    d.UniqueID = d.Frontier + "-" + d.SolutionIndex;
    d.MapColumn = +d.MapColumn;
    d.Value = +d.Value
  });
  // determine the domain for the coloring scales
  var vals = [];
  curmapdata.filter(function(row){
    return (row.MapColumn === 0 || row.MapColumn === numMapsPerRow-1);
  }).forEach(function(d){
    // put all d.Value 's in an array. Then, since we're in an extent sandwich, it should get what we want
    vals.push(d.Value);
    return;
  });
  initFinalMapObjColorScale.domain(d3.extent(vals));
  
  var urlfrontierName = getParameterByName("frontier");
  if (urlfrontierName === "none"){
    datafilename = "climateChange_EfficientSolutions_NoneOnly.csv";
  } else if (urlfrontierName === "e85"){
    datafilename = "climateChange_EfficientSolutions_E85.csv";
  } else {
    datafilename = "climateChange_EfficientSolutions_primary.csv";
  }
  
//d3.csv("visualization/data/" + datafilename, function(error, data) {
d3.csv("visualization/data/climateChange_AllSolutions_primary.csv", function(error, data) {
  
  if (error) throw error;
    
  /** 2D Scatterplot's zoom */
  var zoomListener = d3.behavior.zoom()
    .scaleExtent([1,10])
    .on("zoom", zoomHandler);
    
  function zoomHandler() {
    
    var t = d3.event.translate;
    var s = d3.event.scale;
    // bound horizontal panning
    if (t[0] > 0)  { t[0] = 0; }
    if (t[0] < -(width*s - width)) { t[0] = -(width*s - width); }
    // bound vertical panning
    if (t[1] > 0)  { t[1] = 0; }
    if (t[1] < -(height*s - height)) { t[1] = -(height*s - height); }

    zoomListener.translate(t);
    
    // update axes
    svg.select(".x.axis").call(xAxis);
    svg.select(".y.axis").call(yAxis);
    // update points
    d3.selectAll(".dot")
      .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")")
      .attr("r", function(d) {return radiusScale(d[radiusVar])/d3.event.scale});
  }
  
  scatterPlotCols = Object.keys(data[0]);
  scatterPlotCols.forEach(function(){sortType.push(1);})
  objectives = [];
  scatterPlotCols.forEach(function(d){
    if (d !== "Frontier" && d !== "SolutionIndex"){
      objectives.push(d);
    }
  });
  numObjectives = objectives.length;
  var xVarCtr = 0,
      yVarCtr = 1;
  xVar = updateVar(xVarCtr);
  yVar = updateVar(yVarCtr);
  radiusVar = objectives.filter(function(d){return d !== xVar && d !== yVar;})[0]
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
    d["UniqueID"] = d["Frontier"] + "-" + d["SolutionIndex"];
  });

  xScale.domain(d3.extent(data, function(d) { return d[xVar]; })).nice();
  yScale.domain(d3.extent(data, function(d) { return d[yVar]; })).nice();
  radiusScale.domain(d3.extent(data, function(d) { return d[radiusVar]; })).nice()
  d3.select("#scatterPlotSVG").call(zoomListener.x(xScale).y(yScale));

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label xAxisLabel")
      .on("click", updateXAxis)
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .style("cursor", "pointer")
      .text(xVar);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label yAxisLabel")
      .on("click", updateYAxis)
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style("cursor", "pointer")
      .text(yVar);

  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("id", function(d){ return "dot-" + d.UniqueID; })
      .classed("selected", false)
      .on('mouseover', function(){
          d3.select(this).call(tip.show);
          classMeAndMyBrothers(this, "active", true);
        })
      .on('mouseout', function(){
          d3.select(this).call(tip.hide);
          classMeAndMyBrothers(this, "active", false);
        })
      .on("click", function(d){
        clickToggleSelected(d);
      })
      .attr("r", function(d) {return radiusScale(d[radiusVar])/zoomListener.scale();})
      .attr("cx", function(d) { return xScale(d[xVar]); })
      .attr("cy", function(d) { return yScale(d[yVar]); })
      .attr("fill", function(d) { return colorScale(d.Frontier); })
      .attr("opacity", 0.2)
      .style("cursor","pointer");

  var legend = svg.selectAll(".legend")
      .data(colorScale.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width + 24)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", colorScale);

  legend.append("text")
      .attr("x", width + 18)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
  
  // "Unselect all" option 
  d3.select(".legend").append("text")
      .attr("transform", "translate(0," + colorScale.domain().length*20 + ")")
      .attr("x", width)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("text-decoration","underline")
      .style("cursor","pointer")
      .on("click", function(){
        selected_solutions = [];
        updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions);
        drawDrilldown(drilldownTypeSelector);
      })
      .text("Unselect all solutions")
  // "Reset view" option 
  d3.select(".legend").append("text")
      .attr("transform", "translate(0," + (colorScale.domain().length + 1)*20 + ")")
      .attr("x", width)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .style("text-decoration","underline")
      .style("cursor","pointer")
      .on("click", function(){
        d3.select("#scatterPlotSVG").transition().call(zoomListener.translate([0,0]).scale(1).event);
      })
      .text("Reset chart view")
  // Radius legend title
  d3.select(".legend").append("text")
      .attr("class","radiusLegend")
      .attr("id", "radiusLegendTitle")
      .attr("transform", "translate(0," + (colorScale.domain().length + 4)*20 + ")")
      .attr("x", width)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "beginning")
      .style("font-size", "1.15em")
      .text(radiusVar);
  // values for the legend
  var radiusLegendVals = radiusScale.domain().map(function(d) {return d;})
  radiusLegendVals.splice(1,0,d3.mean(radiusScale.domain()));
  // build rows of legend
  var radiusLegend = d3.select(".legend").selectAll("radiusLegendEntry").data(radiusLegendVals).enter()
      .append("g")
        .attr("class","radiusLegend radiusLegendEntry")
        .attr("transform", function(d, i) { return "translate(0," + ((colorScale.domain().length + 5)*20 + i*(10*radiusScale.range()[1])) + ")"; });
  // the symbols...
  radiusLegend.append("circle")
      .attr("cx", width + 24 + 5*radiusScale.range()[1])
      .attr("r", function(d){return radiusScale(d);})
      .attr("cy","1em")
      .attr("fill", "#7f7f7f");
  // the text
  radiusLegend.append("text")
      .attr("x", width + 18)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
  // hide if no radius encoding used
  if(!encodeRadius) {d3.selectAll(".radiusLegend").attr("display","none");}
      
    // toggle the encoding of a third variable on the radius of the scatter plot dots
    d3.select("#encode3rdVar")
      .on("click", function(){
        encodeRadius = !encodeRadius;
        if (encodeRadius){
          radiusScaleRange = [dotRadius*0.5, dotRadius*5];
          radiusScale.range(radiusScaleRange);
          updateRadiusLegend();
          d3.selectAll(".radiusLegend").attr("display","default");
        } else {
          d3.selectAll(".radiusLegend").attr("display","none");
          radiusScaleRange = [dotRadius, dotRadius];
          radiusScale.range(radiusScaleRange);
        }
        // update the circles
        d3.selectAll(".dot").transition()
          .attr("r", function(d) {return radiusScale(d[radiusVar])/zoomListener.scale();});
      })
      
  drawDrilldown(drilldownTypeSelector);
  
  d3.select("#makeParallelCoordsButton")
    .on("click", function(){
      drilldownTypeSelector = 0;
      drawDrilldown(drilldownTypeSelector);
    });
  d3.select("#makeMapsButton")
    .on("click", function(){
      drilldownTypeSelector = 1;
      drawDrilldown(drilldownTypeSelector);
    });
  d3.select("#drawTableButton")
    .on("click", function(){
      drilldownTypeSelector = 2;
      drawDrilldown(drilldownTypeSelector);
    });
  d3.select("#aboutStudyButton")
    .on("click", function(){
      drilldownTypeSelector = 3;
      drawDrilldown(drilldownTypeSelector);
    });
  d3.select("#toolHelpButton")
    .on("click", function(){
      drilldownTypeSelector = 4;
      drawDrilldown(drilldownTypeSelector);
    });
    
  // site tour function
  defineIntro(intro);
  d3.select("#startSiteTour")
		.on("click", function(){
			intro.start();
		});
    
    /** To ensure robustness to the number of objectives,
     * breakout the functinoality that is specific to 3-dimensions */
    if (objectives.length === 3){
      // add div to hold 3D scatter plot
      d3.select(".scatterplot-wrap").insert("div",":first-child")
        .attr("id", "threeDScatterDiv")
        .attr("class", "inactiveScatterPlot");
      // make dimension-toggle button
      d3.select(".scatterplot-wrap").insert("button",":first-child")
        .attr("id","toggle2D3D")
        .on("click", function(){
          d3.select("#scatterplotDiv").classed("inactiveScatterPlot",!d3.select("#scatterplotDiv").classed("inactiveScatterPlot"));
          d3.select("#threeDScatterDiv").classed("inactiveScatterPlot",!d3.select("#threeDScatterDiv").classed("inactiveScatterPlot"));
        })
        .text("Toggle 2D/3D")
      // draw the 3D scatterplot
      make3DScatterPlot(data);
      // enable on-click selection of points
      d3.selectAll(".threeDpoint")
        .on("click", function(){
          var objData = {},
              objId = this.id;
          objData.UniqueID = objId.substring(objId.indexOf("-") + 1, objId.lengh)
          clickToggleSelected(objData);
        })
        .on("mouseover", function(){
          classMeAndMyBrothers(this, "active", true);
        })
        .on("mouseout", function(){
          classMeAndMyBrothers(this, "active", false);
        });
      // ensure proper classing of selected points
      updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions)
    }

      
 function updateYAxis(){
    // update which variable is encoded on y-axis
    yVarCtr++;
    if (yVarCtr % numObjectives === xVarCtr % numObjectives){ yVarCtr++; }
    yVar = updateVar(yVarCtr);
    // update which variable is encoded to circle size
    radiusVar = objectives.filter(function(d){return d !== xVar && d !== yVar;})[0]
    // update the y and radius scales
    yScale.domain(d3.extent(data, function(d) { return d[yVar]; })).nice();
    radiusScale.domain(d3.extent(data, function(d) { return d[radiusVar]; })).nice();
    // update the axes
    d3.select(".y.axis").transition().duration(1000).call(yAxis);
    d3.select(".y.axis .label").text(yVar);
    // update the zoom behavior
    zoomListener.y(yScale);
    // update the circles' y pos. and radius
    d3.selectAll(".dot").transition().duration(1000)
      .attr("cy", function(d) {return yScale(d[yVar])})
      .attr("r", function(d) {return radiusScale(d[radiusVar])/zoomListener.scale();});
    // update radius legend
    d3.select(this).call(updateRadiusLegend);
    // reset zoom
    d3.select("#scatterPlotSVG").transition().call(zoomListener.translate([0,0]).scale(1).event);
  }
  
  function updateXAxis(){
    // update which variable is encoded on x-axis
    xVarCtr++;
    if (xVarCtr % numObjectives === yVarCtr % numObjectives){ xVarCtr++; }
    xVar = updateVar(xVarCtr);
    // update which variable is encoded to circle size
    radiusVar = objectives.filter(function(d){return d !== xVar && d !== yVar;})[0]
    // update the x and radius scales
    xScale.domain(d3.extent(data, function(d) { return d[xVar]; })).nice();
    radiusScale.domain(d3.extent(data, function(d) { return d[radiusVar]; })).nice();
    // update the axes
    d3.select(".x.axis").transition().duration(1000).call(xAxis);
    d3.select(".x.axis .label").text(xVar);
    // update the zoom behavior
    zoomListener.x(xScale);
    // update the circles' x pos. and radius
    d3.selectAll(".dot").transition().duration(1000)
      .attr("cx", function(d) {return xScale(d[xVar])})
      .attr("r", function(d) {return radiusScale(d[radiusVar])/zoomListener.scale();});
    // update the radius legend
    d3.select(this).call(updateRadiusLegend);
    // reset zoom
    d3.select("#scatterPlotSVG").transition().call(zoomListener.translate([0,0]).scale(1).event);
  }
  
  // Ensure proper classing of paths
  function updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions){
    d3.selectAll(".dot,.pcforegroundPath,.threeDpoint").classed("selected",false);
    selected_solutions.forEach(function(d,i){
      d3.selectAll("#path-" + d + ",#dot-" + d + ",#threeDpoint-" + d).classed("selected",true)
    });
  }
  
  function classMeAndMyBrothers(element, className, classification){
    var uid = element.id.substring(element.id.indexOf("-")+1);
    d3.selectAll("#path-" + uid + ",#dot-" + uid + ",#threeDpoint-" + uid).classed(className, classification)
  }
  
  // update the radius legend
  function updateRadiusLegend(){
    // update legend vals...
    radiusLegendVals = radiusScale.domain().map(function(d) {return d;})
    radiusLegendVals.splice(1,0,d3.mean(radiusScale.domain()));
    // update title
    d3.select("#radiusLegendTitle").text(radiusVar);
    // update entries' circle sizes
    d3.selectAll(".radiusLegend circle").attr("r", function(d,i){return radiusScale(radiusLegendVals[i]);})
    // update entries' text
    d3.selectAll(".radiusLegend text").text(function(d,i){return radiusLegendVals[i];})
  }
  
  function clickToggleSelected(graphObjData){
    var uniqueid = graphObjData.UniqueID;
    // get graph objects corresponding to this solution
    var graphObjs = d3.selectAll("#dot-" + uniqueid + ",#path-" + uniqueid + ",#threeDpoint-" + uniqueid);
    var idxOfObjID = selected_solutions.indexOf(uniqueid);
    if (idxOfObjID > -1){
      // already in solutions, so we remove it
      selected_solutions.splice(idxOfObjID,1);
      // unclass the graph objects
      graphObjs.classed("selected", false);
    } else {
      // not in solutions, so add it
      selected_solutions.push(uniqueid);
      // class graph objects
      graphObjs.classed("selected", true);
    }
    updateTable(selected_solutions);
    updateMapTable(selected_solutions);
    drawDrilldown(drilldownTypeSelector);
  }
  
  function drawDrilldown(drilldownTypeSelector){
    d3.select(".drilldownDiv").html("");
    if (drilldownTypeSelector === 0){
      drawParallelCoordsPlot();
    }
    else if (drilldownTypeSelector === 1){
      drawMap();
    }
    else if (drilldownTypeSelector === 2){
      drawTable();
    }
    else if (drilldownTypeSelector === 3){
      drawAboutPage();
    }
    else {
      drawHelpPage();
    }
  }
  
  function drawParallelCoordsPlot(){
    var pcmargin = {top: 30, right: 10, bottom: 10, left: 10},
    pcwidth = 800 - pcmargin.left - pcmargin.right,
    pcheight = 400 - pcmargin.top - pcmargin.bottom;

    var pcxScale = d3.scale.ordinal().rangePoints([0, width], 1),
        pcyScale = {},
        pcDragging = {};
    
    var pcline = d3.svg.line(),
        pcaxis = d3.svg.axis().orient("left"),
        pcforeground,
        dimensions;
        
    var pcsvg = d3.select(".drilldownDiv").append("svg")
        .attr('id',"pcSVG")
        .attr('viewBox', "0 0 " + (pcwidth + pcmargin.right + pcmargin.left) + " " + (pcheight + pcmargin.top + pcmargin.bottom))
        .attr('preserveAspectRatio',"xMinYMin meet")
      .append("g")
        .attr("transform", "translate(" + pcmargin.left + "," + pcmargin.top + ")");
        
    pcsvg.call(tip);
        
    // Extract the list of dimensions and create a scale for each.
    pcxScale.domain(dimensions = objectives.filter(function(d) {
      return (pcyScale[d] = d3.scale.linear()
          .domain(d3.extent(data, function(p) { return +p[d]; }))
          .range([height, 0]));
    }));
      
    // Add blue foreground lines for focus.
    pcforeground = pcsvg.append("g")
        .attr("class", "pcforeground")
      .selectAll("path")
        .data(data)
      .enter().append("path")
        .attr("class","pcforegroundPath")
        .attr("id", function(d){ return "path-" + d.UniqueID; })
        .attr("stroke", function(d) { return colorScale(d.Frontier); })
        .style("fill", "none")
        .on('mouseover', function(){
          d3.select(this).call(tip.show);
          classMeAndMyBrothers(this, "active", true);
        })
        .on('mouseout', function(){
          d3.select(this).call(tip.hide);
          classMeAndMyBrothers(this, "active", false);
        })
        .on("click", function(d){
          clickToggleSelected(d);
        })
        .attr("d", path)
        .attr("opacity", 0.2)
        .style("cursor", "pointer");
    
    
    // Add a group element for each dimension.
    var pcg = pcsvg.selectAll(".dimension")
        .data(dimensions)
      .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + pcxScale(d) + ")"; });
          
          
    // Add an axis and title.
    pcg.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(pcaxis.scale(pcyScale[d])); })
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; });
  
    // Add and store a brush for each axis.
    pcg.append("g")
        .attr("class", "brush")
        .each(function(d) {
          d3.select(this).call(pcyScale[d].brush = d3.svg.brush().y(pcyScale[d]).on("brushstart", pcbrushstart).on("brush", pcbrush));
        })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);
        
    // Ensure proper classing of paths
    updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions);
        
    function position(d) {
      var v = pcDragging[d];
      return v == null ? pcxScale(d) : v;
    }
    
    function transition(g) {
      return g.transition().duration(500);
    }
    
    // Returns the path for a given data point.
    function path(d) {
      return pcline(dimensions.map(function(p) { return [position(p), pcyScale[p](d[p])]; }));
    }
    
    function pcbrushstart() {
      d3.event.sourceEvent.stopPropagation();
    }
    
    function inPCBrushSelection(d, actives, extents) {
      return actives.every(function(p, i) {
          return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? true : false;
    }
    
    // Handles a brush event, toggling the display of foreground lines.
    function pcbrush() {
      var actives = dimensions.filter(function(p) { return !pcyScale[p].brush.empty(); }),
          extents = actives.map(function(p) { return pcyScale[p].brush.extent(); });
      selected_solutions = [];
      d3.selectAll(".pcforegroundPath").each(function(d){
        if (inPCBrushSelection(d,actives,extents)){
          selected_solutions.push(d.UniqueID);
        }
      });
      if (actives.length === 0){ selected_solutions = []; }
      updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions);
    }
  }
 
  function drawMap(){
    generateMapTable(selected_solutions, numMapsPerRow);
    updateMapTable(selected_solutions, numMapsPerRow);
  }
  
  function generateMapTable(solutions, numMapsPerRow){
    var arrMapsPerRow = d3.range(numMapsPerRow);
    var table = d3.select(".drilldownDiv")
        .append("table")
        .attr("id","mapTable")
        .style("width","100%");
    var thead = table.append("thead");
    var tbody = table.append("tbody");
    // create table header
    thead.append("tr")
      .selectAll("th")
      .data(arrMapsPerRow)
      .enter()
      .append("th")
        .attr("id", function (d,i) {return "mapTableHeader" + i;})
        .text(function(colName) {
          if (colName === 0) {return "Initial Fire Hazard";}
          else if (colName === 1) {return "Treatment in period 1";}
          else if (colName === 2) {return "Treatment in period 2";}
          else if (colName === 3) {return "Final Fire Hazard";}
        });
        
    // holder for table rows while selection emtpy
    tbody.append("tr").attr("class","tempRow")
      .append("td")
        .attr("colspan",arrMapsPerRow.length)
        .style("text-align","center")
        .text("Data will populate when a selection is made");
        
    // prepend click-to-delete area
    table.selectAll("tr").insert("th",":first-child")
      .on("click",function (d,i){
        if (typeof d != 'undefined'){ clickToggleSelected(d); }
      })
      .text(function(d){
        if (typeof d != 'undefined'){ return "[unselect]"; }
        else{ return ""; }
      });
  }
  
  function updateMapTable(solutions, numMapsPerRow){
      var mapDivSideLength = 200;
      var arrMapsPerRow = d3.range(numMapsPerRow);
      var workingData = data.filter(function(d){
        return (selected_solutions.indexOf(d["UniqueID"]) > -1);
      });
      var table = d3.select("#mapTable");
      var tbody = table.select("tbody");
        // if selection not empty...
      if (solutions.length > 0){
        // remove tempRow,
        d3.select(".tempRow").remove();
        // generate table rows
        var rows = tbody.selectAll("tr.mapRow").data(workingData, function(d) { return d["UniqueID"];});
        rows.enter()
          .append("tr")
            .attr("class","mapRow")
            .attr("id", function(d) {
              return "mapRow-" + d["UniqueID"];
            })
            .insert("th",":first-child")
              .attr("class","deleteTableRowTrigger")
              .style("cursor","pointer")
              .on("click",function (d){
                if (typeof d != 'undefined'){ clickToggleSelected(d); }
              })
              .text(function(d){
                if (typeof d != 'undefined'){ return "[unselect]"; }
                else{ return ""; }
              });
        rows.exit().remove();
        // generate table cells
        var cells = rows.selectAll("td")
          .data(function(row){
            return arrMapsPerRow.map(function() {
              return row["UniqueID"];
            })
          })
          .enter()
          .append("td")
            // within each cell, create div
            .append("div")
              .attr("class", "mapDiv")
              .attr("id", function(d,i) {return "mapDiv-" + d + "-" + i;})
              .style("width", mapDivSideLength + "px")
              .style("height", mapDivSideLength + "px")
              .style("border", "1px solid #7f7f7f")
              // and to each div, give a map
              .each(function(d,i){makeAMap(d,i)});
      } else {
        // new strategy for zero-length site selection
        d3.select(".drilldownDiv").html("");
        generateMapTable(solutions, numMapsPerRow);
      }
      
      function makeAMap(uniqueID,mapCol){
        
        var filldata = curmapdata.filter(function(row){
          return (row.UniqueID === uniqueID && row.MapColumn === mapCol);
        });
        
        console.log(filldata);
        
        var thisDivID = "mapDiv-" + uniqueID + "-" + mapCol;
        var thisDiv = d3.select("#" + thisDivID);
        
        var mapSVG = thisDiv.append("svg")
          .attr('viewBox', "0 0 " + mapDivSideLength + " " + mapDivSideLength)
          .attr('preserveAspectRatio',"xMinYMin meet");
        var mapSVGg = mapSVG.append("g");
          
        var zoom = d3.behavior.zoom()
          .scaleExtent([1, 10])
          .on("zoom", zoomed);
          
        mapSVG.append("text")
          .attr("x", 3)
          .attr("y", "1em")
          .text("Frontier-solution: " + uniqueID);
        var thisDivTooltip = mapSVG.append("text")
          .attr("x", 3)
          .attr("y", "2em");
        var thisDivTooltip2l = mapSVG.append("text")
          .attr("x", 3)
          .attr("y", "3em");
        mapSVG.append("text")
          .attr("x", mapDivSideLength - 3)
          .attr("y", mapDivSideLength - 3)
          .attr("dy", "-1em")
          .style("text-anchor","end")
          .style("cursor","pointer")
          .style("text-decoration","underline")
          .on("click", function(){
            mapSVGg.transition().call(zoom.translate([0,0]).scale(1).event)
          })
          .text("reset");
          
        var mapSVGgg = mapSVGg.append("g");
        
        var projection,
            path,
            t,
            s;
            
        mapSVGg.call(zoom).call(zoom.event);
          
        d3.json("visualization/data/drink.json", function(json) {
          // create unit projection
          projection = d3.geo.mercator()
            .scale(1)
            .translate([0, 0]);
          // create path generator
          path = d3.geo.path().projection(projection);
          // compute bounds of the Drink Boundary, derive scale and tranlation
          var b = path.bounds(topojson.feature(json, json.objects.drinkStandsGeo));
              s = .95 / Math.max((b[1][0] - b[0][0]) / mapDivSideLength, (b[1][1] - b[0][1]) / mapDivSideLength);
              t = [(mapDivSideLength - s * (b[1][0] + b[0][0])) / 2, (mapDivSideLength - s * (b[1][1] + b[0][1])) / 2];
          // Update the projection to use computed scale & translate.
          projection
            .scale(s)
            .translate(t);
          
          // map the stands
          mapSVGgg.selectAll("path").data(topojson.feature(json, json.objects.drinkStandsGeo).features)
          .enter()
            .append("path")
              .attr("d", path)
              .attr("class", "feature")
              .attr("id", function(d){ return thisDivID + "-stand-" + d.id; })
              .style("fill", function(d){
                // fill color is a function of the map column, the frontier-solution identifier, the stand, the objective to be shown in the first and last columns
                if (mapCol === 0 || mapCol === numMapsPerRow - 1){
                  return initFinalMapObjColorScale(filldata[d.id].Value);
                } else {
                  if (filldata[d.id].Value > 0){
                    return "#000033";
                  }
                  return;
                }
              })
              .on("mouseover",standMousedOver)
              .on("mouseout",standMousedOut);
        });
        
        function zoomed() {
          var zoomt = d3.event.translate;
          var zooms = d3.event.scale;
          
         /*console.log(zoomt[0]*s*s + ", " + zoomt[1]*s*s);
          // bound horizontal panning
          if (t[0] > 0)  { t[0] = 0; }
          if (t[0] < -(width*s - width)) { t[0] = -(width*s - width); }
          // bound vertical panning
          if (t[1] > 0)  { t[1] = 0; }
          if (t[1] < -(height*s - height)) { t[1] = -(height*s - height); }*/
          
          zoom.translate(zoomt);
          
          mapSVGgg.attr("transform", "translate(" + zoomt + ")scale(" + zooms + ")");
        }
        
        function standMousedOver(d){
          d3.select(this).classed("activeStand", true)
          thisDivTooltip.text("Stand: " + d.id);
          if (mapCol === 0 || mapCol === numMapsPerRow - 1){
            if (initFinalMapObj.charAt(0) === "F"){
              thisDivTooltip2l.text("Fire Hazard: " + filldata[d.id].Value);
            } else {
              thisDivTooltip2l.text("Owl Habitat: " + (filldata[d.id].Value > 0));
            }
          } else {
            thisDivTooltip2l.text("Treated: " + (filldata[d.id].Value > 0));
          }
        }
        function standMousedOut(d){
          d3.select(this).classed("activeStand", false);
          thisDivTooltip.text("");
          thisDivTooltip2l.text("");
        }
      }
  }
  
  function drawTable(){
    generateTable(selected_solutions);
    updateTable(selected_solutions);
  }
    
    function generateTable(solutions) {
      var table = d3.select(".drilldownDiv")
          .append("table")
          .attr("id","solutionTable")
          .style("width","100%");
      table.append("caption").text("Selected Solutions");
          
      var thead = table.append("thead");
      var tbody = table.append("tbody");
      // create table header
      thead.append("tr")
        .selectAll("th")
        .data(scatterPlotCols)
        .enter()
        .append("th")
          .attr("id", function (d,i) {return "tableHeader" + i;})
          .style("cursor","pointer")
          .on("click", function(k,i){
            var currSortType = sortType[i];
            sortType[i] *= -1;
            var rowsToSort = tbody.selectAll("tr.solutionRow");
            rowsToSort.sort(function(a,b) {
              if (currSortType > 0) {return whichIsBigger(a[k],b[k]);}
              else{ return -whichIsBigger(a[k],b[k]);}
            })
          })
          .text(function(colName) { return colName + " ↕"; });
          
      // holder for table rows while selection emtpy
      tbody.append("tr").attr("class","tempRow")
        .append("td")
          .attr("colspan",scatterPlotCols.length)
          .style("text-align","center")
          .text("Data will populate when a selection is made");
          
      // prepend click-to-delete area
      table.selectAll("tr").insert("th",":first-child")
        .on("click",function (d,i){
          if (typeof d != 'undefined'){ clickToggleSelected(d); }
        })
        .text(function(d){
          if (typeof d != 'undefined'){ return "X"; }
          else{ return ""; }
        });
    
    }
    
    
    function updateTable(solutions) {
      var workingData = data.filter(function(d){
        return (selected_solutions.indexOf(d["UniqueID"]) > -1);
      });
      var table = d3.select("#solutionTable");
      var tbody = table.select("tbody");
        // if selection not empty...
      if (solutions.length > 0){
        // remove tempRow,
        d3.select(".tempRow").remove();
        // populate table,
        var rows = tbody.selectAll("tr.solutionRow").data(workingData, function(d) { return d["UniqueID"];});
        rows.enter()
          .append("tr")
            .attr("class","solutionRow")
            .attr("id", function(d) {
              return "siteRow-" + d["UniqueID"];
            })
            .insert("th",":first-child")
              .attr("class","deleteTableRowTrigger")
              .style("cursor","pointer")
              .on("click",function (d){
                if (typeof d != 'undefined'){ clickToggleSelected(d); }
              })
              .text(function(d){
                if (typeof d != 'undefined'){ return "X"; }
                else{ return ""; }
              });
        rows.exit().remove();
        var cells = rows.selectAll("td")
          .data(function(row){
            return scatterPlotCols.map(function(column) {
              return row[column];
            })
          })
          .enter()
          .append("td")
            .text(function(d){
              return d;
            });
        // sort rows first by solution index, then by frontier 
        tbody.selectAll("tr.solutionRow")
          .sort(function(a,b) {
            return whichIsBigger(a["SolutionIndex"], b["SolutionIndex"]);
          })
          .sort(function(a,b) {
            return whichIsBigger(a["Frontier"], b["Frontier"]);
          });
        
      } else {
        // new strategy for zero-length site selection
        d3.select(".drilldownDiv").html("");
        generateTable(solutions);
      }
    }
    
    function drawAboutPage(){
      d3.select(".drilldownDiv").append("div")
        .attr("class","drilldownTextContainer")
        .html(""+
          "<h2>About this study</h2>"+
          "<p>Normally shown would be a description of the problem. The data currently shown are test data used to help develop this tool.</p>"+
          "<p>For more information, contact <a href='mailto:nick.kullman@gmail.com'>Nicholas Kullman</a></p>"
        +"");
    }
    
    function drawHelpPage(){
      d3.select(".drilldownDiv").append("div")
        .attr("class","drilldownTextContainer")
        .html(""+
          "<h2>How to use this tool</h2>"+
          "<p>The point of the tool is to allow the comparison of solutions to multi-objective optimization problems.</p>"+
          "<p>Solutions can be selected in a couple of different ways:"+
            "<ul>"+
              "<li>By clicking on a point in the 2D or 3D scatterplots (3D only available if problem has 3 objectives)</li>"+
              "<li>By clicking and dragging (brushing) along one of the axes in the parallel coordinates plot</li>"+
            "</ul></p>"+
          "<p>Solutions may be deselected similarly, and also by clicking on the 'X' in the solutions' row in the table.</p>"+
          "<p>Click the axis labels on the 2D scatter plot to change the objective encoded on the axis.</p>"+
          "<p>Use the 'Toggle 2D/3D' button to view a 3D scatter plot (only available if the number of objectives is 3).</p>"+
          "<p>Use the other buttons to change chart type. Please note that this tool, especially the 'Maps' page, is still under construction.</p>"
        );
    }
    
  })
});

function whichIsBigger(a,b){
  // determine the numerical value of the arguments
  var firstNum, secondNum;
  if (!isNaN(+a)){
    firstNum = +a;
  } else {
    firstNum = +a.substring(0,a.length-1);
  }
  if (!isNaN(+b)){
    secondNum = +b;
  } else {
    secondNum = +b.substring(0,b.length-1);
  }
  // arguments' numeric values stored
  // return normal sort returns
  if (firstNum === secondNum) {
    // if numeric values are the same, there are three possible situations:
    // -1: the second input is larger bc it has a later letter appended to it
    //  1: the first input is larger bc it has a later letter appended to it
    //  0: the inputs have the same exact value
    if (a > b) return 1;
    else if (a < b) return -1;
    return 0;
  } else {
    // if numeric values are not the same, then we sort the larger of the numeric values
    if (firstNum > secondNum) return 1;
    else return -1; // (firstNum < secondNum). It is impossible to have equality here (would have been captured in outer if)
  }
}

function defineIntro(theIntro) {
  theIntro.setOptions({
            steps: [
              { 
                intro: "<h3>Welcome to FrontierViz</h3> We're working on a site tour to show you around, and how to take advantage of each of the components here."
              },
              {
                intro: "In the meantime, feel free to poke around. Try clicking on the axis labels on the scatterplot, and brushing along an axis on the parallel coordiantes view"
              },
              {
                intro: "More to come. If you have questions, <a href='mailto:nick.kullman@gmail.com'>send us an email</a> or view the <a href='https://github.com/nkullman/DeschutesNF'>source code</a>."
              }
              /*
              {
                element: document.getElementById('scatterPlotSVG'),
                intro: "<h4>2D Scatterplot</h4> Here you see a 2D cross-section of the frontier for the first two objectives in the study."
              },
              {
                element: document.getElementById('scatterPlotSVG'),
                intro: "Hover on a solution to see more information. Click to add it to the selection."
              },
              {
                element: document.querySelector('#scatterPlotSVG'),
                intro: "Scroll/pan in the scatterplot to zoom in and view the frontiers in more detail."
              },
              {
                element: document.querySelector('.yAxisLabel'),
                intro: "Click on the axis labels to cycle through objectives."
              },
              {
                element: document.querySelector('#encode3rdVar'),
                intro: "Add another dimension to the scatterplot by encoding a third objective to point size."
              },
              {
                element: document.querySelector('#toggle2D3D'),
                intro: "If the study is tri-objective, you can view the data in three dimensions"
              },
              {
                element: document.querySelector('#pcSVG'),
                intro: "View each solution's relative achievement in each objective"
              },
              {
                element: document.querySelector("#pcSVG"),
                intro: "Click and drag along an axis to select solutions, or click one of the lines"
              },
              {
                element: document.querySelector("#makeMapsButton"),
                intro: "When available, click here to see maps corresponing to solutions' prescriptions"
              },
              {
                element: document.querySelector('#drawTableButton'),
                intro: "View the data in tabular form. Click on a column header to sort the data"
              },
              {
                element: document.querySelector('#aboutStudyButton'),
                intro: "Learn more about the study underlying the data"
              },
              {
                element: document.querySelector("#aboutLink"),
                intro: "Want to learn more about this tool? Check out our about page."
              }*/
            ]
          });
}

function make3DScatterPlot(data){
  var scatterSeries = [];
  var frontiers = data.map(function(d){return d["Frontier"];}).filter(function(item, i, ar){ return ar.indexOf(item) === i; });
  frontiers.forEach(function(d){
    var currSeries = {};
    var workingData = data.filter(function(row){return row["Frontier"] === d;});
    currSeries.name = d;
    currSeries.color = colorScale(d);
    // format: [{x1,y1,z1,name1},{x2,y2,z2,name2},...]
    currSeries.data = workingData.map(function(row){
      var result = {};
      result.x = row[objectives[0]];
      result.y = row[objectives[1]];
      result.z = row[objectives[2]];
      result.name = row["UniqueID"];
      return result;})
    // add it to the scatterSeries array
    scatterSeries.push(currSeries);
  });
      
    $(function () {
  
      // Set up the chart
      var chart = new Highcharts.Chart({
          chart: {
              renderTo: 'threeDScatterDiv',
              margin: 100,
              type: 'scatter',
              options3d: {
                  enabled: true,
                  alpha: 10,
                  beta: 30,
                  depth: 250,
                  viewDistance: 5,
  
                  frame: {
                      bottom: { size: 1, color: 'rgba(0,0,0,0.02)' },
                      back: { size: 1, color: 'rgba(0,0,0,0.04)' },
                      side: { size: 1, color: 'rgba(0,0,0,0.06)' }
                  }
              }
          },
          title: {
              text: ""
          },
          subtitle: {
              text: 'Click and drag the plot area to rotate'
          },
          plotOptions: {
              scatter: {
                  width: 10,
                  height: 10,
                  depth: 10
              },
              series: {stickyTracking: false}
          },
          xAxis: {
              min: d3.min(data, function(d) { return d[objectives[0]] }),
              max: d3.max(data, function(d) { return d[objectives[0]] }),
              title: {enabled: true, text: objectives[0]},
              gridLineWidth: 1
          },
          yAxis: {
              min: d3.min(data, function(d) { return d[objectives[1]] }),
              max: d3.max(data, function(d) { return d[objectives[1]] }),
              title: {enabled: true, text: objectives[1]},
              gridLineWidth: 1
          },
          zAxis: {
              min: d3.min(data, function(d) { return d[objectives[2]] }),
              max: d3.max(data, function(d) { return d[objectives[2]] }),
              title: {enabled: true, text: objectives[2]},
              gridLineWidth: 1
          },
          legend: {
              enabled: true
          },
          series: scatterSeries
      });
      
      // assign IDs to 3D points similar to other grahpical objects
      var threeDpoints = d3.selectAll(".highcharts-markers path")
        .attr("id", function(){return "threeDpoint-" + this.point.name;})
        .attr("class","threeDpoint")
        .attr("opacity",0.4);
      
      // format tooltip
      chart.tooltip.options.formatter = function() {
        var result =
              '<strong>Frontier</strong>: ' + this.series.name + '<br>' +
              '<strong>' + objectives[0] + '</strong>: : ' + this.x + '<br>' +
              '<strong>' + objectives[1] + '</strong>: : ' + this.y + '<br>' +
              '<strong>' + objectives[2] + '</strong>: : ' + this.point.z;
        return result;
      }

      // Add mouse events for rotation
      $(chart.container).bind('mousedown.hc touchstart.hc', function (e) {
          e = chart.pointer.normalize(e);
  
          var posX = e.pageX,
              posY = e.pageY,
              alpha = chart.options.chart.options3d.alpha,
              beta = chart.options.chart.options3d.beta,
              newAlpha,
              newBeta,
              sensitivity = 5; // lower is more sensitive
  
          $(document).bind({
              'mousemove.hc touchdrag.hc': function (e) {
                  // Run beta
                  newBeta = beta + (posX - e.pageX) / sensitivity;
                  chart.options.chart.options3d.beta = newBeta;
  
                  // Run alpha
                  newAlpha = alpha + (e.pageY - posY) / sensitivity;
                  chart.options.chart.options3d.alpha = newAlpha;
  
                  chart.redraw(false);
              },
              'mouseup touchend': function () {
                  $(document).unbind('.hc');
              }
          });
      });
  
  });
}
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
