// The Raphael drawing context
let paper: RaphaelPaper;

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

/*
 Represents a stack of path ID's, where the top of the stack
  was the id of the last disease with a path drawn
  Only used for the 'undo' feature
*/
// let pathStack = [];

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
  '#725df1',
  '#06d561',
  '#f4e203',
  '#f25b05',
  '#f40704',
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
type InterfacePath = [number, number, number, number];
interface InterfacePathData {
  pathArr: InterfacePath;
  pathObj: RaphaelElement;
}
interface ICanvas {
  width?: number;
  height?: number;
  resizeRatio: number;
}

class AnnoStore {
  private mMouseStat: MouseStat;
  private path?: InterfacePath;
  private mPaths: { [key: string]: InterfacePathData[]; };
  private mPathStack: string[];
  private mRect: RaphaelElement;
  constructor(private mCanvasShape: ICanvas = { resizeRatio: 1 }) {
    this.mMouseStat = MouseStat.Up;
    this.mPaths = {}; // Stores the array of drawn rectangle
    this.mPathStack = []; // Stack of rectangle ID's, top: id of last disease with a path drawn, used for 'undo'
    this.clearSelected = this.clearSelected.bind(this);
  }
  get canvasShape() { return this.mCanvasShape; }
  set canvasShape(shape: ICanvas) {
    if (shape.resizeRatio < 0) { throw new Error('resizeRatio should be a positive number'); }
    if (shape.width < 0 || shape.height < 0) { throw new Error('Canvas sizes should be posite'); }
    this.mCanvasShape.width = shape.width;
    this.mCanvasShape.height = shape.height;
    this.mCanvasShape.resizeRatio = shape.resizeRatio;
  }
  get mouseStat() { return this.mMouseStat; }
  set mouseStat(curStat: MouseStat) { this.mMouseStat = curStat; }
  get paths() { return this.mPaths; }
  public downMouse(DomElem, pageX, pageY) {
    if (selected === 'Healthy' || this.mouseStat === MouseStat.Down) {
      return;
    } else {
      this.mouseStat = MouseStat.Down;
      const parentOffset = $(DomElem).parent().offset();
      const X = pageX - parentOffset.left;
      const Y = pageY - parentOffset.top;
      this.path = [X, Y, 0, 0];
    }
    this.mRect = paper.rect(this.path[0], this.path[1], this.path[2], this.path[3]).attr({
      'stroke': selectedColor, 'stroke-width': STROKE_WIDTH,
    });
  }

  public moveMouse(DomElem, pageX, pageY) {
    const parentOffset = $(DomElem).parent().offset();
    const X = pageX - parentOffset.left;
    const Y = pageY - parentOffset.top;

    if (this.mouseStat !== MouseStat.Down) { return; }
    // Hanle mouse/pencil going outside drawing area
    if (X < 0 || X > this.mCanvasShape.width || Y < 0 || Y > this.mCanvasShape.height) { return; }
    const [width, height] = [X - this.path[0], Y - this.path[1]];
    const absWidth = Math.abs(width);
    const absHeight = Math.abs(height);
    if (absWidth < 10 || absHeight < 10) { return; } // Handle accident mouse/pencil touch
    this.path.splice(2, 2, width, height);
    this.mRect.remove();
    let CornerX: number;
    let CornerY: number;
    if (width >= 0 && height >= 0) {
      CornerX = this.path[0];
      CornerY = this.path[1];
    } else if (width >= 0 && height < 0) {
      CornerX = this.path[0];
      CornerY = this.path[1] + height;
    } else if (width < 0 && height < 0) {
      CornerX = this.path[0] + width;
      CornerY = this.path[1] + height;
    } else {
      CornerX = this.path[0] + width;
      CornerY = this.path[1];
    }
    this.mRect = paper.rect(CornerX, CornerY, absWidth, absHeight).attr({
      'stroke': selectedColor, 'stroke-width': STROKE_WIDTH,
    });

  }

  public upMouse(DomElem) {
    if (this.mouseStat !== MouseStat.Down) { return; }
    this.mouseStat = MouseStat.Up;
    if (fill) {
      this.mRect.attr({ 'stroke': selectedColor, 'stroke-width': STROKE_WIDTH, 'fill': selectedColor });
    } else {
      this.mRect.attr({ 'stroke': selectedColor, 'stroke-width': STROKE_WIDTH });
    }

    if (!this.mPaths[selected]) { this.mPaths[selected] = []; }
    this.mPaths[selected].push({ pathArr: this.path, pathObj: this.mRect });
    this.path = null;
    this.mRect = null;
    this.mPathStack.push(selected);
  }

  public clearData() {
    this.mPaths = {};
    this.mPathStack = [];
    addItemToList('idList', 'Healthy'); // Add Healthy to identified diseases and remove all other selections
    removeDiseasesFromIdList();
    selected = 'Healthy';
    $('.selected').removeClass('selected');
  }

  public undo() {
    if (!paper.top || !this.mPathStack.length) { return; }
    paper.top.remove();
    const lastId = this.mPathStack.splice(-1);
    const customPathObjArray = this.mPaths[lastId[0]];
    customPathObjArray.splice(-1);

  }

  public clearSelected() {
    if (selected === 'Healthy') { return; }
    const selectedShapePaths = this.mPaths[selected];
    for (const line of selectedShapePaths) { line.pathObj.remove(); }
    this.mPaths[selected] = [];
    this.mPathStack = this.mPathStack.filter((path) => path !== selected);
  }

  public nextImage() {
    this.clearData();

    const url = BASE_PATH + GET_NEXT_IMAGE_ENDPOINT;
    const dataToSend = {
      author: username,
    };
    $.ajax({
      url, type: 'GET', data: dataToSend, contentType: 'application/json; charset=utf-8', dataType: 'json', async: true,
      success: (response) => {
        console.log(response);
        curImageId = response.next_image;
        if (curImageId === -1) {
          alert('You have marked all images!');
          return;
        }
        curImageUrl = response.image_url;
        curName = response.image_name;
        $('#filename').text(curName.substring(curName.indexOf('/')));
        this.initRaphael(curImageUrl);
      },
      error(msg) { alert(JSON.stringify(msg)); },
    });
  }

  public initRaphael(filename) {
    if (typeof paper !== 'undefined') { paper.remove(); }
    const url = `${BASE_PATH}getImage.php?id=${curImageId}`;
    const img = new Image();
    const mCanvas = document.getElementById('canvas');
    img.onload = () => {
      const { height, width } = img;
      if (width <= height) {
        mCanvas.setAttribute('style', `width: ${CANVAS_SIZE_SHORT}px; height: ${CANVAS_SIZE_LONG}px;`);
        paper = Raphael('canvas', CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
        paper.image(url, 0, 0, CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
        const resizeRatio = width / CANVAS_SIZE_SHORT;
        this.canvasShape = { width: CANVAS_SIZE_SHORT, height: CANVAS_SIZE_LONG, resizeRatio };
      } else {
        mCanvas.setAttribute('style', `width: ${CANVAS_SIZE_LONG}px; height: ${CANVAS_SIZE_SHORT}px;`);
        paper = Raphael('canvas', CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
        paper.image(url, 0, 0, CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
        const resizeRatio = height / CANVAS_SIZE_SHORT;
        this.canvasShape = { width: CANVAS_SIZE_LONG, height: CANVAS_SIZE_SHORT, resizeRatio };
      }
    };
    img.src = url;

    $('img').on('dragstart', (event) => { event.preventDefault(); });
    $(document).on('dragstart', (e) => {
      const nodeName = e.target.nodeName.toUpperCase();
      if (nodeName === 'IMG' || nodeName === 'SVG' || nodeName === 'IMAGE') {
        if (e.preventDefault) { e.preventDefault(); }
        return false;
      }
    });
    $('#canvas').css('webkitTapHighlightColor', 'rgba(0,0,0,0)');
    $('#canvas').css('webkitTouchCallout', 'none');
  }

  public upload() {
    const url = BASE_PATH + UPLOAD_ENDPOINT;
    const pPaths = this.getPathsString();
    const dataToSend = {
      image_id: `${curImageId}`, author: username, paths: pPaths, severities: [], poor_quality: false,
    };
    console.log(JSON.stringify(dataToSend));
    $.ajax({
      url, type: 'POST', data: JSON.stringify(dataToSend), contentType: 'application/json; charset=utf-8',
      dataType: 'json', async: true,
      success: (response) => {
        // console.log(`mark_id: ${response.mark_id}`); // TODO Log upload respond
        this.nextImage();
        updateProgress();
      },
      error(msg) {
        alert(JSON.stringify(msg));
      },
    });
  }

  private getPathsString() {
    const contentObj = {};

    $('#idList li').each((index, elem) => {
      const key = elem.id;
      if (key === 'Healthy') { return false; }

      const value = this.paths[key];
      if (value && value.length > 0) {
        contentObj[key] = [];
        for (const select of value) {
          // TODO: multiply by resize ratio
          const myArr = select.pathArr.map((e) => e * this.canvasShape.resizeRatio);
          contentObj[key].push(myArr);
        }
      }
    });

    const str = JSON.stringify(contentObj);
    // console.log(str); // TODO log path string
    return str;
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

  const mAnnoStore = new AnnoStore();
  // Theming
  $('button').addClass('ui-button ui-corner-all');

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
          mAnnoStore.nextImage();

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
  $('#idList').on('sortreceive', (event, ui) => {
    $('.selected').removeClass('selected');
    ui.item.addClass('ui-state-highlight');
    ui.item.removeClass('ui-state-default');

    if (ui.item.attr('id') === 'Healthy') {
      // Healthy was moved to Identified disease,
      // so remove all other diseases from identified list
      removeDiseasesFromIdList();
      $('#clear').click();
    } else {
      ui.item.on('click touchstart', () => { onSelect(ui.item); }); // TODO: add listener for touch
      ui.item.trigger('click');

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

      if ($('#idList li')
        .length === 0) {
        addItemToList(ID_LIST_ID, 'Healthy');
        HealthyIdentified = true;
      }
    });

  function eventToPoint(e: TouchEvent) {
    return {
      x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY,
    };
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
      mAnnoStore.upMouse(this);
    });

  $('#canvas')
    .bind('touchstart', function(event) {
      const e = event as any as TouchEvent;
      // e.preventDefault();
      const pt = eventToPoint(e);
      mAnnoStore.downMouse(this, pt.x, pt.y);
    });

  $('#canvas').on('touchmove', function(event) {
    const e = event as any as TouchEvent;
    const canvasElem = $('#canvas')[0];
    e.preventDefault();
    const pt = eventToPoint(e);
    mAnnoStore.moveMouse(this, pt.x, pt.y);
  });

  $('#canvas').on('touchend touchcancel', function(event) {
    event.preventDefault();
    mAnnoStore.upMouse(this);
  });

  // Called when the 'Show only Selected Disease' checkbox changes
  // Either shows all paths, or hides those that aren't for the
  // selected disease
  $('#displayToggle')
    .change(() => {
      const showAll = !($('#displayToggle').prop('checked'));
      for (const key in mAnnoStore.paths) {
        if (mAnnoStore.paths.hasOwnProperty(key)) {
          const value = mAnnoStore.paths[key];
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
      for (const key in mAnnoStore.paths) {
        if (mAnnoStore.paths.hasOwnProperty(key)) {
          const value = mAnnoStore.paths[key];
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
  $('#clear').click(() => {
    mAnnoStore.clearData();
    mAnnoStore.initRaphael(curImageUrl);
  });

  // Callback for the 'Clear Selected Disease' button
  // Removes paths associated with that disease
  // and removes that data from the data structures
  $('#clearSelected').click(mAnnoStore.clearSelected);

  // Callback for 'undo' button
  // Removes the last drawn path and associated data
  $('#undo').click(() => mAnnoStore.undo());

  // Callback for 'save' button
  // Converts the raphael drawing to a single image (raphael drawings are SVG's)
  // Puts that image in a <canvas> element, so it's URI can be extracted
  // Then downloads image and JSON file containing output
  $('#save').click(() => {
    mAnnoStore.upload();
  });

  function getImageToReMark(remarkId) {
    mAnnoStore.clearData();

    const url = BASE_PATH + GET_REMARK_IMAGE_ENDPOINT;
    const dataToSend = {
      image_id: remarkId,
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

        mAnnoStore.initRaphael(curImageUrl);
      },
      error(msg) {
        alert(JSON.stringify(msg));
      },
    });
  }

  function previousImage() {
    mAnnoStore.clearData();

    const url = BASE_PATH + GET_PREVIOUS_IMAGE_ENDPOINT;
    const dataToSend = { author: username };
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

        mAnnoStore.initRaphael(curImageUrl);

        // $("#nextBtnRow").remove();
      },
      error(msg) {
        alert(JSON.stringify(msg));
      },
    });
  }

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
      async: true,
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
        mAnnoStore.nextImage();
      },
      error(msg) {
        alert(msg);
      },
    });
  }

  // Sets up the Raphael paper (drawing context)
  // initializes it if it doesn't exist,
  // clears it otherwise
  // Then sets the given image to be the background
  // Finally prevents dragging on the image, which
  // would otherwise cause issues in FireFox
  // TODO: We're not done with this
});

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
    async: true,
    success(response) {
      $('#usernameDisplay')
        .text(`You are logged in as ${username} (${response.marked}/${response.total} images marked)`);
    },
    error(msg) {
      alert(JSON.stringify(msg));
    },
  });
}

// Called when 'Clear Selected Disease' is pressed
// Removes instances of the selected disease from the pathStack (the 'undo' stack)

// Resets all selections, markings, and path data

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

// Adds an option from a user's options JSON file to the 'All options' list
// index is used just for default colors
function addOptionToOptions(optionObj, index) {
  // Overall li element that wraps color-box and disease name
  const li = $('<li>', { id: optionObj.id, class: 'ui-state-default' });

  // Goes around the color box to make it sized and centered correctly:
  const colorWrapper = $('<span>', { class: 'input-color' });

  // If user supplied a color, use it, otherwise use a default
  let colorStr = 'background-color: ';
  if (optionObj.color) { colorStr += optionObj.color; } else {
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
      $('#opList').empty();
      for (let i = 0; i < response.length; i++) {
        addOptionToOptions(response[i], i);
      }
    },
    error(msg) {
      alert(msg);
    },
  });
}
