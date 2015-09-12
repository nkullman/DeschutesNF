var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
	
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
    
var xVar,
    yVar,
    scatterPlotCols,
    objectives,
    numObjectives,
    dotRadius = 4;
    
var drilldownTypeSelector = 0;
var selected_solutions = [];
var sortType = [];
    
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    var result = "";
    for (var col in scatterPlotCols){
      if (col !== "SolutionIndex" && col !== "UniqueID"){
        result += "<strong>" + scatterPlotCols[col] + ":</strong> <span style='color:#e8f4f8'>" + d[scatterPlotCols[col]] + "</span>"
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
    
var x3d = d3.select("#threeDScatterDiv").append("x3d")
    .attr("width",width)
    .attr("height",height);
var scene = x3d.append("scene");
    
d3.select("#scatterPlotSVG").call(tip);
    
d3.csv("visualization/data/frontiers.csv", function(error, data) {
  if (error) throw error;
    
  /** 2D Scatterplot zoom */
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
      .attr("r",dotRadius/d3.event.scale);
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
  d3.select("#scatterPlotSVG").call(zoomListener.x(xScale).y(yScale));

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
      .text(xVar);

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
      .text(yVar);

  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("id", function(d){ return "dot-" + d.UniqueID; })
      .classed("selected", false)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .on("click", function(d){
        clickToggleSelected(d);
      })
      .attr("r", dotRadius)
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
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", colorScale);

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
      
  d3.select(".legend").append("text")
      .attr("transform", "translate(0," + colorScale.domain().length*20 + ")")
      .attr("x", width - 6)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .style("text-decoration","underline")
      .style("cursor","pointer")
      .on("click", function(){
        selected_solutions = [];
        updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions);
        drawDrilldown(drilldownTypeSelector);
      })
      .text("Unselect all solutions")
    d3.select("#resetZoom2DButton")
      .on("click", function(){
        d3.select("#scatterPlotSVG").transition().call(zoomListener.translate([0,0]).scale(1).event);
      });
      
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
    
    /** To ensure robustness to the number of objectives,
     * breakout the functinoality that is specific to 3-dimensions */
    if (objectives.length === 3){
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
      // enable on-click selection of points -- this will have to be updated with new graphing approach
      d3.selectAll(".threeDpoint")
        .on("click", function(){
          clickToggleSelected(/*sth*/);
        });
      // ensure proper classing of selected points
      updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions)
    }

      
 function updateYAxis(){
   // update what the variable encoded is
    yVarCtr++;
    if (yVarCtr % numObjectives === xVarCtr % numObjectives){ yVarCtr++; }
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
   // update which variable is encoded
    xVarCtr++;
    if (xVarCtr % numObjectives === yVarCtr % numObjectives){ xVarCtr++; }
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
  // Ensure proper classing of paths
  function updateClassingOfSelectedSolutionsPathsAndDots(selected_solutions){
    d3.selectAll(".dot,.pcforegroundPath,.threeDpoint").classed("selected",false);
    selected_solutions.forEach(function(d,i){
      d3.selectAll("#path-" + d + ",#dot-" + d + ",#threeDpoint-" + d).classed("selected",true)
    });
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
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
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
    var mapwidth = 800;
    var mapheight = 400;
        
    var mapsvg = d3.select(".drilldownDiv").append("svg")
        .attr('id',"mapSVG")
        .attr('viewBox', "0 0 " + (mapwidth) + " " + (mapheight))
        .attr('preserveAspectRatio',"xMinYMin meet");
        
    var projection = d3.geo.albersUsa()
        .scale(500)
        .translate([mapwidth/2, mapheight/2])
    var mapPath = d3.geo.path()
        .projection(projection);
    
    d3.json("visualization/data/drinkboundary.json", function(error, drinkboundary) {
      if (error) return console.error(error);
      
      mapsvg.append("path")
        .datum(topojson.feature(drinkboundary,drinkboundary.objects.drinkboundaryGeo))
        .attr("d", mapPath);
    });
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

function make3DScatterPlot(data){
/*var x3d = parent  
    .append("x3d")
      .attr( "width", width )
      .attr( "height", height );
      
  var scene = x3d.append("scene");
  var cor = [d3.mean(d3.extent(data, function(d) { return d[objectives[0]]; })),
        d3.mean(d3.extent(data, function(d) { return d[objectives[1]]; })),
        d3.mean(d3.extent(data, function(d) { return d[objectives[2]]; }))];

  scene.append("viewpoint")
     .attr( "centerOfRotation", cor)
     .attr( "orientation", [-0.5, 1, 0.2, 1.12*Math.PI/4])
     .attr( "position", [cor[0]*3.5, cor[1]-30, cor[2]*1.5]);*/
     function randomData() {
        return d3.range(6).map( function() { return Math.random()*20; } )
      }
     
      scene.append("viewpoint")
           .attr( "centerOfRotation", "3.75 0 10")
           .attr( "position", "13.742265188709691 -27.453522975182366 16.816062840792625" )
           .attr( "orientation", "0.962043810961999 0.1696342804961945 0.21376603254551874 1.379433089729343" )
           ;

      function refresh( data ) {
        shapes = scene.selectAll("transform").data( data );
        shapesEnter = shapes
             .enter()
             .append( "transform" )
             .append( "shape" );
        // Enter and update
        shapes.transition()
              .attr("translation", function(d,i) { return i*10 + " 0.0 " + 1; } )
              .attr("scale", function(d) { return "1.0 1.0 1.0"; } );

        shapesEnter
            .append("appearance")
              .append("material")
              .attr("diffuseColor", "steelblue" );

        shapesEnter.append( "sphere" )
          .attr( "size", "1.0 1.0 1.0" );
      }

      refresh( randomData() )
}