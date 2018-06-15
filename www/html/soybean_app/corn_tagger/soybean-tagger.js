//The Raphael drawing context
var paper;

/*
 Main data structure storing all data regarding drawn paths
 For each disease with a path, there will be a property with that disease ID 
	e.g. if there is a path for disease 'a', paths.a will be defined
 Each of these properties is an array of more objects
	e.g. paths.a = [{...}, {...},...]
 One object in the array per path drawn for the given disease 
 Inside this object there are two properties:
	pathObj: references the Raphael path object 
		- this reference is saved so it's fill can be toggled or 
			so it can be removed 
	pathArr: Stores array of path coordinates (SVG style)
		so they can be included in output file 
 */
var paths = [];

//Stores the array of path coordinates for the path currently being drawn 
var path = [];

//Flag indicating whether the area inside paths should be filled with color or not 
var fill = false;

//Flag indicating whether the user is holding down the left mouse button or not 
var mouseDown = false;

//Stores color to be used with currently selected disease 
var selectedColor = "#800080";

//Flag indicating if 'Healthy' is the only identified disease (i.e. no identified diseases)
var HealthyIdentified = true;

//Stores filename of image currently being used 
var curImageUrl = "";

//Width of path lines
var STROKE_WIDTH = 2;

//Dimension of drawing canvas:
var CANVAS_SIZE = 512;

//Default color options for marking:
var DEFAULT_COLORS = [
	"#800080",
	"#00FFFF",
	"#2222EE",
	"#74BAEC",
	"#FF00FF",
	"#CE93D8",
	"#FD8012",
	"#9A5656",
	"#57504B"
];

//If site structure is changed, this needs to be changed
var BASE_PATH = "https://baskar-group.me.iastate.edu/soybean_app/corn_tagger/api/";
var GET_PROGRESS_ENDPOINT = "getProgress.php";
var GET_NEXT_IMAGE_ENDPOINT = "getNextImage.php";
var UPLOAD_ENDPOINT = "upload.php";
//var GET_DISEASES_ENDPOINT = "getDiseases.php";
var GET_PREVIOUS_IMAGE_ENDPOINT = "getPreviousImage.php";
//var IMAGES_URL = "https://baskar-group.me.iastate.edu/soybean_tagger_images";



// //Will store all image names once a request to the above script is made
// // to get the names
// var imageFileNames = [];

//Stores index of current image being marked (based on above array)
var imageIndex = -1;
var curImageId = -1; 

var username;

		
// Does initialization stuff and sets dom element event handling
// (trying to attach events before this is called may not work)
$( function() {

	//Sets the two lists to be sortable
	// Basically allows their elements to be dragged around 
	// and placed in either list in any order 
	$( "#idList, #opList" ).sortable({
	  connectWith: ".connectedSortable"
	}).disableSelection();
	
	
	//Configures the Login popup that appears on page load 
	var loginDialog = $("#loginModal").dialog({
		autoOpen: false,
		height: 400,
		width: 400,
		modal: true,	
		close: function() {
			
		},
		closeOnEscape: false,
		open: function(event, ui) {
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
		}
	}).dialog("open");
	
	
	//Callback for clicking 'Login'
	$("#loginBtn").click(function() {
		username = $("#username").val();
		if(!username || username.length <= 0){
			alert("Enter a username!");
			return;
		}
		
		var url = BASE_PATH + GET_PROGRESS_ENDPOINT;
		
		var test = false;
		
		if(test){
			loginDialog.dialog("close");
		}
		
		else {
			var dataToSend = { author: username };
			$.ajax({
				url: url,
				type: 'GET',
				data: dataToSend,
				contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				async: false,
				success: function(response) {
					
					//{marked: int, total: int}
					if(response.marked == 0){
						alert("Warning - your user has no results saved. If this is not your first time using the app, make sure you used the same username (refresh page to login again)");
					}
					
					$("#usernameDisplay").text("You are logged in as " + username + " (" + response.marked + "/" + response.total + " images marked)");
					loginDialog.dialog("close");
					
					nextImage();
				},
				error: function(msg){
					alert(msg);
				}
			});
		}
		
	});
	
	
	/*
	 Called when user clicks on Raphael drawing context (image)
	 basically inits the path with the mouse coord, 
	 and sets the mouseDown flag so other callbacks know 
	 if button is clicked or not 
	*/
	var onDown = function(pageX, pageY) {

		mouseDown = true;
		
		var parentOffset = $(this).parent().offset(); 
		var X = pageX - parentOffset.left;
		var Y = pageY - parentOffset.top;
		
		path.push(['M', X, Y]);
		paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH});
	};

	var onMove = function(pageX, pageY) {
		var parentOffset = $(this).parent().offset();
		var X = pageX - parentOffset.left;
		var Y = pageY - parentOffset.top;
		
		if(mouseDown) {
			paper.top.remove();
			path.push(['L', X, Y]);
			paper.path(path).attr({stroke: selectedColor, 'stroke-width': STROKE_WIDTH});
		}
	};

	var onUp = function() {

		path.push(['Z']);
		paper.top.remove();
		
		mouseDown = false;
		
		var obj;
		if(fill){
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH, fill: selectedColor});
		}
		else {
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH });
		}
		
		// if(!paths[selected]){
			// paths[selected] = [];
		// }
		paths.push( { pathArr: path, pathObj: obj});
		path = [];
	};

	var eventToPoint = function(e) {
		if (e.type === "touchstart" || e.type === "touchmove") {
			if(navigator.userAgent.toLowerCase().indexOf("android") > -1) {
				return {x: e.changedTouches[0].pageX + window.scrollX, y: e.changedTouches[0].pageY + window.scrollY};
			} else {
				return {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY};
			}
		} else {
			return {x: e.pageX, y: e.pageY};
		}
	};

	$("#canvas").bind("mousedown", function (e) {
		onDown.call(this, e.pageX, e.pageY);
	});
	
	/*
	 Called when mouse moves within the drawing canvas 
	 if mouse is down, adds current coordinate to current path, 
	 and redraws it (removing last drawn path from scene)
	*/
	$("#canvas").bind("mousemove", function (e) {
		onMove.call(this, e.pageX, e.pageY);
	});
	
	/*
	 Called when user releases mouse button in canvas.
	 Completes the current path, saves it to the data structures,
	 and prepares variables for a new path to be drawn
	*/
	//TODO - possibly change to document.mouseUp? in case user let's go slightly outside of canvas 
	$("#canvas").bind("mouseup", function (e) {
		onUp.call(this);
	});
	
	$("#canvas").bind("touchstart", function (e) {
		e.preventDefault();
		var pt = eventToPoint(e);
		onDown.call(this, pt.x, pt.y);
	});

	$("#canvas").bind("touchmove", function (e) {
		e.preventDefault();
		var pt = eventToPoint(e);
		onMove.call(this, pt.x, pt.y);
	});

	$("#canvas").bind("touchend", function (e) {
		e.preventDefault();
		onUp.call(this);
	});
	
	
	//Callback for 'Clear' button 
	// Removes all data and resets paper 
	$("#clear").click(function() {
		clearData();
		
		//paper.clear() removes image, so need to reset it:
		initRaphael(curImageUrl);
	});
	
	
	//Callback for 'undo' button 
	//Removes the last drawn path and associated data
	$("#undo").click(function() {
		if(paper.top) {
			paper.top.remove();
			paths.splice(paths.length - 1, 1);
		}
	});
	
	
	//Callback for 'save' button 
	// Converts the raphael drawing to a single image (raphael drawings are SVG's)
	// Puts that image in a <canvas> element, so it's URI can be extracted 
	// Then downloads image and JSON file containing output
	$("#save").click(function() {
		//var mycanvas = document.getElementById("outputCanvas");
		//var mycontext = mycanvas.getContext('2d');
		//var svg = paper.toSVG();
		
		//Takes an SVG image and renders it as an image in a canvas 
		//canvg(mycanvas, svg, { ignoreClear: true } );
		
		//TODO - is it possible to hide the output canvas 
		
		//Run after 100 ms in case image isn't converted to other canvas instantly 
		//setTimeout(downloadImage, 100);
		
		//createAndDownloadJSON();
		
		upload();
	});
	
	$("#backBtn").click(function(){
		previousImage();
	});
	
});

function upload() {
	var url = BASE_PATH + UPLOAD_ENDPOINT;
	
	var paths = getPathsString();
	
	var dataToSend = { "image_id": "" + curImageId, "author": username, "paths": paths	};
	
	//console.log(JSON.stringify(dataToSend));
	//alert(JSON.stringify(dataToSend));
	
	$.ajax({
		url: url,
		type: 'POST',
		data: JSON.stringify(dataToSend),
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			console.log("mark_id: " + response.mark_id);
			nextImage();
			
			updateProgress();
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}


function updateProgress() {
	var url = BASE_PATH + GET_PROGRESS_ENDPOINT;
	var dataToSend = { author: username };
	$.ajax({
		url: url,
		type: 'GET',
		data: dataToSend,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: false,
		success: function(response) {
			
			$("#usernameDisplay").text("You are logged in as " + username + " (" + response.marked + "/" + response.total + " images marked)");
			
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}

function getPathsString(){
	var contentObj = [];
	
	for(var i=0; i<paths.length; i++){
		contentObj.push(paths[i].pathArr);
	}
	
	return JSON.stringify(contentObj);
}

//Resets all selections, markings, and path data
function clearData() {
	paths = [];
}


//Sets up the Raphael paper (drawing context)
//	initializes it if it doesn't exist,
//  clears it otherwise 
//Then sets the given image to be the background
//Finally prevents dragging on the image, which 
// would otherwise cause issues in FireFox
function initRaphael(filename) {
	if(typeof paper == 'undefined'){
		paper = Raphael("canvas", CANVAS_SIZE,CANVAS_SIZE);
	}
	else {
		paper.clear();
	}
	
	// var imagePath = IMAGES_URL + filename;
	// alert(imagePath);
	var url = BASE_PATH + "getImage.php?id=" + curImageId;
	paper.image(url, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
	
	$('img').on('dragstart', function(event) { event.preventDefault(); });
	$(document).on("dragstart", function(e) {
		var nodeName = e.target.nodeName.toUpperCase();
		if (nodeName == "IMG" || nodeName == "SVG" || nodeName == "IMAGE") {
			if(e.preventDefault){
				e.preventDefault();
			}
			return false;
		}
	});
	$("#canvas").css("webkitTapHighlightColor", "rgba(0,0,0,0)");
	$("#canvas").css("webkitTouchCallout", "none");
}


/*
	Increments the current image index,
	and retrieves the next one for marking, if there are more.
	Clears existing data from previous image, too 
*/
function nextImage() {
	clearData();
	
	var url = BASE_PATH + GET_NEXT_IMAGE_ENDPOINT;
	var dataToSend = { author: username };
	$.ajax({
		url: url,
		type: 'GET',
		data: dataToSend,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			//alert(JSON.stringify(response));
			curImageId = response.next_image;
			
			if(curImageId === -1){
				alert("You have marked all images!");
				return;
			}
			
			curImageUrl = response.image_url;
			
			curName = response.image_name;
			
			$("#filename").text(curName.substring(curName.indexOf("/")));
			
			initRaphael(curImageUrl);
	
			$("#nextBtnRow").remove();
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}

function previousImage() {
	clearData();
	
	var url = BASE_PATH + GET_PREVIOUS_IMAGE_ENDPOINT;
	var dataToSend = { author: username };
	$.ajax({
		url: url,
		type: 'GET',
		data: dataToSend,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			//alert(JSON.stringify(response));
			curImageId = response.prev_image;
			
			console.log(response);
			
			if(curImageId === -1){
				alert("You have marked all images!");
				return;
			}
			
			curImageUrl = response.image_url;
			
			curName = response.image_name;
			
			$("#filename").text(curName.substring(curName.indexOf("/")));
			
			initRaphael(curImageUrl);
	
			//$("#nextBtnRow").remove();
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}