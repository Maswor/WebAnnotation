// The Raphael drawing context
let paper;

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
let paths: { [key: string]: any; } = {};

// Stores the array of path coordinates for the path currently being drawn
let path = [];

/*
 Represents a stack of path ID's, where the top of the stack
  was the id of the last disease with a path drawn
  Only used for the 'undo' feature
*/
let pathStack = [];

// Flag indicating whether the area inside paths should be filled with color or not
let fill = false;

// Flag indicating whether the user is holding down the left mouse button or not

// Stores the id of the currently selected disease
let selected = 'Healthy';

// Stores color to be used with currently selected disease
let selectedColor = '';

// Flag indicating if 'Healthy' is the only identified disease (i.e. no identified diseases)
let HealthyIdentified = true;

// Stores filename of image currently being used
let curImageUrl = '';
let curName = '';

// Width of path lines
const STROKE_WIDTH = 2;

// Constants for id's of the two html lists
const OP_LIST_ID = 'opList';
const ID_LIST_ID = 'idList';

// Dimension of drawing canvas:
const CANVAS_SIZE_SHORT = 512;
const CANVAS_SIZE_LONG = 768;

// Default color options for marking:
const DEFAULT_COLORS = [
  '#800080',
  '#00FFFF',
  '#2222EE',
  '#74BAEC',
  '#FF00FF',
  '#CE93D8',
  '#FD8012',
  '#9A5656',
  '#57504B',
];

// If site structure is changed, this needs to be changed
const BASE_PATH = 'api/';
const GET_PROGRESS_ENDPOINT = 'getProgress.php';
const GET_NEXT_IMAGE_ENDPOINT = 'getNextImage.php';
const UPLOAD_ENDPOINT = 'upload.php';
const GET_DISEASES_ENDPOINT = 'getDiseases.php';
const GET_PREVIOUS_IMAGE_ENDPOINT = 'getPreviousImage.php';
const GET_REMARK_IMAGE_ENDPOINT = 'getImageToReMark.php';
// var IMAGES_URL = "https://baskar-group.me.iastate.edu/soybean_tagger_images";

// //Will store all image names once a request to the above script is made
// // to get the names
// var imageFileNames = [];

// Stores index of current image being marked (based on above array)
const imageIndex = -1;
let curImageId = -1;

let username;

// Just stores a reference so it can be closed
let loginDialog;

// Does initialization stuff and sets dom element event handling
// (trying to attach events before this is called may not work)

enum MouseStat { Down, Up }
interface InterfaceAnnoStore {
  mouseStat: MouseStat;
  downMouse(DomElem, pageX, pageY): void;
  moveMouse(DomElem, pageX, pageY): void;
}

class AnnoStore implements InterfaceAnnoStore {
  private mMouseStat: MouseStat;
  constructor(private mResizeRatio: number = 1) {
    this.mMouseStat = MouseStat.Up;
  }
  get resizeRatio() { return this.mResizeRatio; }
  set resizeRatio(ratio: number) { this.mResizeRatio = ratio; }

  get mouseStat() { return this.mMouseStat; }
  set mouseStat(curStat: MouseStat) { this.mMouseStat = curStat; }

  public downMouse(DomElem, pageX, pageY) {
    this.mouseStat = MouseStat.Down;
    if (selected === 'Healthy') {
      return;
    }
    this.mouseStat = MouseStat.Down;
    const parentOffset = $(DomElem).parent().offset();
    const X = pageX - parentOffset.left;
    const Y = pageY - parentOffset.top;

    path.push(['M', X, Y]);
    paper.path(path)
      .attr({
        'stroke': selectedColor,
        'stroke-width': STROKE_WIDTH,
      });
  }

  public moveMouse(DomElem, pageX, pageY) {
    const parentOffset = $(DomElem).parent().offset();
    const X = pageX - parentOffset.left;
    const Y = pageY - parentOffset.top;

    if (this.mouseStat === MouseStat.Down) {
      paper.top.remove();
      path.push(['L', X, Y]);
      paper.path(path)
        .attr({
          'stroke': selectedColor,
          'stroke-width': STROKE_WIDTH,
        });
    }
  }
}

$(() => {
  // Begins by loading image filepaths from server
  // Once loaded, loads first image and initializes drawing context
  // getImageNames();

  getDiseases();

  loginDialog = $('#loginModal')
    .dialog({
      autoOpen: false,
      height: 400,
      width: 400,
      modal: true,
      closeOnEscape: false,
    });

  loginDialog.dialog('open');

  // Callback for clicking 'Login'
  $('#loginBtn')
    .click(() => {
      username = $('#username')
        .val();
      if (!username || username.length <= 0) {
        alert('Enter a username!');
        return;
      }

      loggedInAs(username);
    });

  const mAnnoStore = new AnnoStore(6.75);

  // CANVAS_SIZE = $("#canvas").width();

  // Sets the two lists to be sortable
  // Basically allows their elements to be dragged around
  // and placed in either list in any order
  $('#idList, #opList')
    .sortable({
      connectWith: '.connectedSortable',
    })
    .disableSelection();

  // Configures the Login popup that appears on page load
  $('#backBtn')
    .click(() => {
      previousImage();
    });

  $('#poorQualityBtn')
    .click(() => {
      const url = BASE_PATH + UPLOAD_ENDPOINT;

      const dataToSend = {
        image_id: `${curImageId}`,
        author: username,
        paths: '',
        severities: [],
        poor_quality: true,
      };

      // console.log(JSON.stringify(dataToSend));
      // alert(JSON.stringify(dataToSend));

      $.ajax({
        url,
        type: 'POST',
        data: JSON.stringify(dataToSend),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        async: true,
        success(response) {
          nextImage();

          updateProgress();
        },
        error(msg) {
          alert(JSON.stringify(msg));
        },
      });
    });

  // Called when a list element is dropped into the 'Identified Diseases' list
  // Adjusts styling of dropped element, sets it to be selected (if it's not 'Healthy')
  // If 'Healthy' is the one dropped, removes all other list elements and clears the scene
  $('#idList')
    .on('sortreceive', (event, ui) => {
      $('.selected')
        .removeClass('selected');
      ui.item.addClass('ui-state-highlight');
      ui.item.removeClass('ui-state-default');

      if (ui.item.attr('id') === 'Healthy') {
        // Healthy was moved to Identified disease,
        // so remove all other diseases from identified list
        removeDiseasesFromIdList();
        $('#clear')
          .click();
      } else {
        ui.item.bind('click', () => {
          onSelect(ui.item);
        });
        ui.item.trigger('click');

        addToSeverities(ui.item);

        // Move 'Healthy' to other list if not already there
        if (HealthyIdentified) {
          addItemToList(OP_LIST_ID, 'Healthy');
          HealthyIdentified = false;
        }
      }
    });

  // Called when a list element is dropped into the 'All Options' list
  // Just changes styling, and will put 'Healthy' into identified if it's empty
  $('#opList')
    .on('sortreceive', (event, ui) => {
      ui.item.addClass('ui-state-default');
      ui.item.removeClass('ui-state-highlight');
      ui.item.removeClass('selected');
      selected = 'Healthy';

      if (ui.item.attr('id') !== 'Healthy') {
        removeFromSeverities(ui.item);
      }

      if ($('#idList li')
        .length === 0) {
        addItemToList(ID_LIST_ID, 'Healthy');
        HealthyIdentified = true;
      }
    });

  /* Called when user clicks on Raphael drawing context (image)
   * basically inits the path with the mouse coord,
   * and sets the mouseDown flag so other callbacks know
   * if button is clicked or not */

  // function onMove(DomElem, pageX, pageY) {
  //   const parentOffset = $(DomElem)
  //     .parent()
  //     .offset();
  //   const X = pageX - parentOffset.left;
  //   const Y = pageY - parentOffset.top;

  //   if (mAnnoStore.mouseStat === MouseStat.Down) {
  //     paper.top.remove();
  //     path.push(['L', X, Y]);
  //     paper.path(path)
  //       .attr({
  //         'stroke': selectedColor,
  //         'stroke-width': STROKE_WIDTH,
  //       });
  //   }
  // }

  function onUp() {
    if (selected === 'Healthy') {
      return;
    }

    path.push(['Z']);
    paper.top.remove();

    mAnnoStore.mouseStat = MouseStat.Up;

    let obj;
    if (fill) {
      obj = paper.path(path)
        .attr({
          'stroke': selectedColor,
          'stroke-width': STROKE_WIDTH,
          'fill': selectedColor,
        });
    } else {
      obj = paper.path(path)
        .attr({
          'stroke': selectedColor,
          'stroke-width': STROKE_WIDTH,
        });
    }

    if (!paths[selected]) {
      paths[selected] = [];
    }
    paths[selected].push({
      pathArr: path,
      pathObj: obj,
    });
    path = [];
    pathStack.push(selected);
  }

  function eventToPoint(e: TouchEvent) {
    if (e.type === 'touchstart' || e.type === 'touchmove') {
      if (navigator.userAgent.toLowerCase()
        .indexOf('android') > -1) {
        return {
          x: e.changedTouches[0].pageX + window.scrollX,
          y: e.changedTouches[0].pageY + window.scrollY,
        };
      }
      return {
        x: e.changedTouches[0].pageX,
        y: e.changedTouches[0].pageY,
      };
    }
  }

  $('#canvas')
    .bind('mousedown', function(event) {
      const e = event as any as MouseEvent;
      mAnnoStore.downMouse(this, e.pageX, e.pageY);
    });

  /*
   Called when mouse moves within the drawing canvas
   if mouse is down, adds current coordinate to current path,
   and redraws it (removing last drawn path from scene)
  */
  $('#canvas')
    .bind('mousemove', function(event) {
      const e = event as any as MouseEvent;
      mAnnoStore.moveMouse(this, e.pageX, e.pageY);
    });

  /*
   Called when user releases mouse button in canvas.
   Completes the current path, saves it to the data structures,
   and prepares variables for a new path to be drawn
  */
  // TODO - possibly change to document.mouseUp? in case user let's go slightly outside of canvas
  $('#canvas')
    .bind('mouseup', function(e) {
      onUp.call(this);
    });

  $('#canvas')
    .bind('touchstart', function(event) {
      const e = event as any as TouchEvent;
      e.preventDefault();
      const pt = eventToPoint(e);
      mAnnoStore.downMouse(this, pt.x, pt.y);
    });

  $('#canvas')
    .bind('touchmove', function(event) {
      const e = event as any as TouchEvent;
      e.preventDefault();
      const pt = eventToPoint(e);
      mAnnoStore.moveMouse(this, pt.x, pt.y);
    });

  $('#canvas')
    .bind('touchend', function(event) {
      event.preventDefault();
      onUp.call(this);
    });

  // Called when the 'Show only Selected Disease' checkbox changes
  // Either shows all paths, or hides those that aren't for the
  // selected disease
  $('#displayToggle')
    .change(() => {
      const showAll = !($('#displayToggle').prop('checked'));
      for (const key in paths) {
        if (paths.hasOwnProperty(key)) {
          const value = paths[key];
          if (key !== selected && !showAll) {
            value.map((line) => line.pathObj.hide());
          } else {
            value.map((line) => line.pathObj.show());
          }
        }
      }
    });

  // Called when 'Fill selection' is toggled
  // Either adds or removes the fill for each path
  // And subsequent paths will have/not have fill based
  // on current value
  $('#fillSelection')
    .change(() => {
      fill = $('#fillSelection').prop('checked');
      for (const key in paths) {
        if (paths.hasOwnProperty(key)) {
          const value = paths[key];
          for (const mPath of value) {
            if (fill) {
              const color = mPath.pathObj.attr('stroke');
              mPath.pathObj.attr('fill', color);
            } else {
              // TODO have an array of fills. should be empty if fill is unchecked
              // if checked, add separate object for fill, with same path array
              // as the unfilled-path
              // Because unchecking fill after a path was drawn doesn't
              // remove the fill from the output image
              mPath.pathObj.attr('fill', '');
            }
          }
        }
      }
    });

  // Callback for 'Clear' button
  // Removes all data and resets paper
  $('#clear')
    .click(() => {
      clearData();

      // paper.clear() removes image, so need to reset it:
      initRaphael(curImageUrl);
    });

  // Callback for the 'Clear Selected Disease' button
  // Removes paths associated with that disease
  // and removes that data from the data structures
  $('#clearSelected')
    .click(() => {
      if (selected === 'Healthy') {
        return;
      }
      const selectedShapePaths = paths[selected];
      for (const line of selectedShapePaths) {
        line.pathObj.remove();
      }
      paths[selected] = [];
      clearFromPathStack();
    });

  // Callback for 'undo' button
  // Removes the last drawn path and associated data
  $('#undo')
    .click(() => {
      if (paper.top && pathStack.length > 0) {
        paper.top.remove();
        const lastId = pathStack[pathStack.length - 1];
        const customPathObjArray = paths[lastId];
        customPathObjArray.splice(customPathObjArray.length - 1, 1);
        pathStack.splice(pathStack.length - 1, 1);
      }
    });

  // Callback for 'save' button
  // Converts the raphael drawing to a single image (raphael drawings are SVG's)
  // Puts that image in a <canvas> element, so it's URI can be extracted
  // Then downloads image and JSON file containing output
  $('#save')
    .click(() => {
      // var mycanvas = document.getElementById("outputCanvas");
      // var mycontext = mycanvas.getContext('2d');
      // var svg = paper.toSVG();

      // Takes an SVG image and renders it as an image in a canvas
      // canvg(mycanvas, svg, { ignoreClear: true } );

      // TODO - is it possible to hide the output canvas

      // Run after 100 ms in case image isn't converted to other canvas instantly
      // setTimeout(downloadImage, 100);

      // createAndDownloadJSON();

      upload();
    });
});

function loggedInAs(privateUserName) {
  const url = BASE_PATH + GET_PROGRESS_ENDPOINT;

  const dataToSend = {
    author: privateUserName,
  };
  $.ajax({
    url,
    type: 'GET',
    data: dataToSend,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: false,
    // doesn't return from 'createAndDownloadJSON'
    success(response) {
      // {marked: int, total: int}
      if (response.marked === 0) {
        alert('Warning: New User, if not, checked Username again');
      }

      $('<a>', {
        'href': `retriever.html?author=${privateUserName}`,
        'text': 'View marked images',
        'margin-left': 3,
      })
        .appendTo('#topLinks');

      $('#usernameDisplay')
        .text(`You are logged in as ${privateUserName} (${response.marked}/${response.total} images marked)`);
      loginDialog.dialog('close');
      nextImage();
    },
    error(msg) {
      alert(msg);
    },
  });
}

function upload() {
  const url = BASE_PATH + UPLOAD_ENDPOINT;

  const pPaths = getPathsString();

  const severities = getSeverities();

  const dataToSend = {
    image_id: `${curImageId}`,
    author: username,
    paths: pPaths,
    severities,
    poor_quality: false,
  };

  // console.log(JSON.stringify(dataToSend));
  // alert(JSON.stringify(dataToSend));

  $.ajax({
    url,
    type: 'POST',
    data: JSON.stringify(dataToSend),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success(response) {
      console.log(`mark_id: ${response.mark_id}`);
      nextImage();

      updateProgress();
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

function updateProgress() {
  const url = BASE_PATH + GET_PROGRESS_ENDPOINT;
  const dataToSend = {
    author: username,
  };
  $.ajax({
    url,
    type: 'GET',
    data: dataToSend,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: false,
    success(response) {
      $('#usernameDisplay')
        .text(`You are logged in as ${username} (${response.marked}/${response.total} images marked)`);
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

function getPathsString() {
  const contentObj = {};

  $('#idList li')
    .each(function() {
      const key = this.id;
      console.log(key);

      if (key === 'Healthy') {
        return false;
      }

      const value = paths[key];
      if (value && value.length > 0) {
        contentObj[key] = [];
        for (const select of value) {
          contentObj[key].push(select.pathArr);
        }
      }
    });

  const str = JSON.stringify(contentObj);
  console.log(str);
  return str;
}

function getSeverities() {
  const arr = [];

  $('#diseaseSeverities div')
    .each(function() {
      const c = $(this)
        .attr('class');
      const id = c.substring(c.indexOf('_') + 1);

      // var idStr = "" + id + "";
      const obj = {};
      const value = $(this)
        .find(`#severity${id}`)
        .val();
      obj[id] = value;

      arr.push(obj);
    });

  console.log(arr);
  return arr;
}

// Called when 'Clear Selected Disease' is pressed
// Removes instances of the selected disease from the pathStack (the 'undo' stack)
function clearFromPathStack() {
  let restart = false;
  for (let i = 0; i < pathStack.length; i++) {
    if (pathStack[i] === selected) {
      pathStack.splice(i, 1);
      restart = true;
      break;
    }
  }
  if (restart) {
    clearFromPathStack();
  }
}

// Resets all selections, markings, and path data
function clearData() {
  paths = {};
  pathStack = [];

  // Add Healthy to identified diseases and remove all other selections
  addItemToList('idList', 'Healthy');
  removeDiseasesFromIdList();
  selected = 'Healthy';
  $('.selected')
    .removeClass('selected');

  // Clear severities:
  $('#diseaseSeverities')
    .empty();
}

// Removes every disease from the 'Identified diseases' list
function removeDiseasesFromIdList() {
  $('#idList li')
    .each((i, li) => {
      const element = $(li);
      const id = element.attr('id');
      if (id !== 'Healthy') {
        addItemToList(OP_LIST_ID, id);
      }
    });
  HealthyIdentified = true;
}

// Callback for when a disease option is clicked
// Gives it a red border and sets
// the selected and selectedColor vars appropriately
function onSelect(li) {
  $('.selected')
    .removeClass('selected');
  li.addClass('selected');
  selected = li.attr('id');
  const selectedColorBox = $(`#${selected} .color-box`);
  selectedColor = selectedColorBox.first()
    .css('background-color');

  $('#displayToggle')
    .change();
}

// Removes the element with the given id from it's current spot
// Places a clone of that removed element (with same id)
// into the list with the specified listID
function addItemToList(listId, id) {
  const clone = $(`#${id}`)
    .clone();

  let classToAdd = 'ui-state-default';
  let classToRemove = 'ui-state-highlight';
  if (listId === 'idList') {
    const temp = classToAdd;
    classToAdd = classToRemove;
    classToRemove = temp;
  }

  clone.addClass(classToAdd);
  clone.removeClass(classToRemove);

  $(`#${id}`)
    .remove();
  clone.appendTo(`#${listId}`);
}

// Sets up the Raphael paper (drawing context)
// initializes it if it doesn't exist,
// clears it otherwise
// Then sets the given image to be the background
// Finally prevents dragging on the image, which
// would otherwise cause issues in FireFox
// TODO: We're not done with this
function initRaphael(filename) {
  if (typeof paper !== 'undefined') {
    paper.remove();
  }

  // var imagePath = IMAGES_URL + filename;
  // alert(imagePath);
  const url = `${BASE_PATH}getImage.php?id=${curImageId}`;
  const img = new Image();
  const mCanvas = document.getElementById('canvas');
  img.onload = () => {
    const {
      height,
      width,
    } = img;
    if (height === 5184) {
      mCanvas.setAttribute('style', `width: ${CANVAS_SIZE_SHORT}px; height: ${CANVAS_SIZE_LONG}px;`);
      paper = Raphael('canvas', CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
      paper.image(url, 0, 0, CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
    } else if (height === 3456) {
      mCanvas.setAttribute('style', `width: ${CANVAS_SIZE_LONG}px; height: ${CANVAS_SIZE_SHORT}px;`);
      paper = Raphael('canvas', CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
      paper.image(url, 0, 0, CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
    } else {
      alert(`Unregular height of ${height}`);
    }
  };
  img.src = url;

  $('img')
    .on('dragstart', (event) => {
      event.preventDefault();
    });
  $(document)
    .on('dragstart', (e) => {
      const nodeName = e.target.nodeName.toUpperCase();
      if (nodeName === 'IMG' || nodeName === 'SVG' || nodeName === 'IMAGE') {
        if (e.preventDefault) {
          e.preventDefault();
        }
        return false;
      }
    });
  $('#canvas')
    .css('webkitTapHighlightColor', 'rgba(0,0,0,0)');
  $('#canvas')
    .css('webkitTouchCallout', 'none');
}

// Adds an option from a user's options JSON file to the 'All options' list
// index is used just for default colors
function addOptionToOptions(optionObj, index) {
  // Overall li element that wraps color-box and disease name
  const li = $('<li>', {
    id: optionObj.id,
    class: 'ui-state-default',

  });

  // Goes around the color box to make it sized and centered correctly:
  const colorWrapper = $('<span>', {
    class: 'input-color',
  });

  // If user supplied a color, use it, otherwise use a default
  let colorStr = 'background-color: ';
  if (optionObj.color) {
    colorStr += optionObj.color;
  } else {
    colorStr += DEFAULT_COLORS[index];
  }
  const colorBox = $('<span>', {
    class: 'color-box',
    style: colorStr,
  })
    .appendTo(colorWrapper);

  // For displaying disease name:
  const diseaseName = $('<span>', {
    class: 'diseaseName',
  });

  diseaseName.text(optionObj.name);

  colorWrapper.appendTo(li);
  diseaseName.appendTo(li);

  li.appendTo('#opList');
}
function nextImage() {
  clearData();

  const url = BASE_PATH + GET_NEXT_IMAGE_ENDPOINT;
  const dataToSend = {
    author: username,
  };
  $.ajax({
    url,
    type: 'GET',
    data: dataToSend,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success(response) {
      console.log(response);
      // alert(JSON.stringify(response));
      curImageId = response.next_image;

      if (curImageId === -1) {
        alert('You have marked all images!');
        return;
      }

      curImageUrl = response.image_url;

      curName = response.image_name;

      $('#filename')
        .text(curName.substring(curName.indexOf('/')));

      initRaphael(curImageUrl);
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

function getImageToReMark(remark_id) {
  clearData();

  const url = BASE_PATH + GET_REMARK_IMAGE_ENDPOINT;
  const dataToSend = {
    image_id: remark_id
  };
  $.ajax({
    url,
    type: 'GET',
    data: dataToSend,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success(response) {
      curImageId = response.image_id;

      curImageUrl = response.image_url;

      curName = response.image_name;

      $('#filename')
        .text(curName.substring(curName.indexOf('/')));

      initRaphael(curImageUrl);
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

function previousImage() {
  clearData();

  const url = BASE_PATH + GET_PREVIOUS_IMAGE_ENDPOINT;
  const dataToSend = {
    author: username
  };
  $.ajax({
    url,
    type: 'GET',
    data: dataToSend,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success(response) {
      // alert(JSON.stringify(response));
      curImageId = response.prev_image;

      if (curImageId === -1) {
        alert('You have marked no images!');
        return;
      }

      curImageUrl = response.image_url;

      curName = response.image_name;

      $('#filename')
        .text(curName.substring(curName.indexOf('/')));

      initRaphael(curImageUrl);

      // $("#nextBtnRow").remove();
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

function addToSeverities(liItem) {
  const id = liItem.attr('id');
  const name = liItem.find('.diseaseName')
    .text();

  // alert("id: " + id + ", " + name );

  const wrapper = $('<div>', {
    class: `severityWrapper_${id}`,
  });
  const label = $('<label>')
    .text(`${name}: `);
  const input = $('<input>', {
    type: 'text',
    value: 0,
    id: `severity${id}`,
  })
    .appendTo(label);

  label.appendTo(wrapper);

  $('#diseaseSeverities')
    .append('<br>');
  wrapper.appendTo('#diseaseSeverities');
}

function getDiseases() {
  const url = BASE_PATH + GET_DISEASES_ENDPOINT;
  $.ajax({
    url,
    type: 'GET',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success(response) {
      // Remove default options:
      $('#opList')
        .empty();

      for (let i = 0; i < response.length; i++) {
        addOptionToOptions(response[i], i);
      }
    },
    error(msg) {
      alert(msg);
    },
  });
}

function removeFromSeverities(liItem) {
  const id = liItem.attr('id');

  const wrapperId = `#severityWrapper${id}`;

  $(wrapperId)
    .remove();
}
