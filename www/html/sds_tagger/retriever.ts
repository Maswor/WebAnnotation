export { };
const BASE_PATH = 'api/';
const GET_DATA_ENDPOINT = 'getOutput.php';
const GET_DISEASES_ENDPOINT = 'getDiseases.php';

const CANVAS_SIZE_SHORT = 512;
const CANVAS_SIZE_LONG = 768;

const DEFAULT_COLORS = [
  '#725df1',
  '#06d561',
  '#f4e203',
  '#f25b05',
  '#f40704',
];
const diseases = [];

let username;

function get(name) {
  const mRegex = new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)').exec(location.search);
  if (mRegex) {
    return decodeURIComponent(mRegex[1]);
  }
}

$(() => {

  const author = get('author');
  if (!author) {
    alert('Invalid URL - no author specified');
    return;
  }

  username = author;
  getDiseases();

  function getDiseases() {

    const url = BASE_PATH + GET_DISEASES_ENDPOINT;
    $.ajax({
      url, type: 'GET', contentType: 'application/json; charset=utf-8', dataType: 'json', async: true,
      success: (response) => {
        for (let i = 1; i < response.length; ++i) {
          diseases.push({
            id: response[i].id, name: response[i].name, color: DEFAULT_COLORS[i],
          });
        }

        getImagesForAuthor();
      },
      error: (msg) => { alert(msg); },
    });

  }
});

function getImagesForAuthor() {
  const markedId = $('#mark_id').val();
  const url = BASE_PATH + GET_DATA_ENDPOINT;
  const dataToSend = { author: username };
  $.ajax({
    url, type: 'GET', data: dataToSend, contentType: 'application/json; charset=utf-8', dataType: 'json',
    async: true,
    success: (responses) => {
      const slice = responses.slice(-10);
      for (let r = 0; r < slice.length; r++) {
        const response = slice[r];
        console.log(response);
        addToTable(response, r);
      }
    },
    error: (msg) => {
      alert(JSON.stringify(msg));
    },
  });
}

function addToTable(response, index) {
  const originalId = response.image_id;
  const imageUrl = BASE_PATH + 'getImage.php?id=' + originalId;
  // console.log(imageUrl);
  const tr = $('<tr>');
  const tdMarked = $('<td>', { witdh: 512, height: 512 });
  const id = 'canvas' + index;
  $('<div>', { id, width: 512, height: 512 }).appendTo(tdMarked);
  tdMarked.appendTo(tr);
  const btnTd = $('<td>');
  const link = $('<a>', { href: 'index.html?remark_id=' + originalId + '&author=' + username }).appendTo(btnTd);

  $('<button>', { text: 'Re-mark this image' }).appendTo(link);
  btnTd.appendTo(tr);
  const inlineBtnTd = $('<td>');
  const inlineBtn = $('<button>', { text: 'Remark inline' });

  inlineBtn.click(() => {
    const trWrapper = $('<tr>', {});

    const iframe = $('<iframe>', {
      src: 'index.html?remark_id=' + originalId + '&author=' + username, width: '100%', height: '100%',
    });
    const iframeTd = $('<td>', { colspan: 3, height: '1000px' });
    iframe.appendTo(iframeTd);
    iframeTd.appendTo(trWrapper);
    tr.after(trWrapper);

    inlineBtn.html('Close re-mark window');
    inlineBtn.unbind('click');
    inlineBtn.click(() => { trWrapper.remove(); });
  });
  inlineBtn.appendTo(inlineBtnTd);
  inlineBtnTd.appendTo(tr);

  tr.appendTo('#table');

  // const paper = Raphael(id, 512, 512);
  // paper.image(imageUrl, 0, 0, 512, 512);

  const img = new Image();
  let paper;
  img.onload = () => {
    const { height, width } = img;
    if (width <= height) {
      paper = Raphael(id, CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
      paper.image(imageUrl, 0, 0, CANVAS_SIZE_SHORT, CANVAS_SIZE_LONG);
      const resizeRatio = width / CANVAS_SIZE_SHORT;
    } else {
      paper = Raphael(id, CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
      paper.image(imageUrl, 0, 0, CANVAS_SIZE_LONG, CANVAS_SIZE_SHORT);
      const resizeRatio = height / CANVAS_SIZE_SHORT;
    }

    console.log(JSON.stringify(response.severities));

    if (response.path && response.path.length > 2) {
      const path = JSON.parse(response.path);
      for (const property in path) {
        if (path.hasOwnProperty(property)) {
          const pathsArray = path[property];
          const color = colorForDisease(property);

          for (const mPath of pathsArray) {
            const x1 = mPath[0];
            const y1 = mPath[1];
            const x2 = x1 + mPath[2];
            const y2 = y1 + mPath[3];
            const startX = Math.min(x1, x2);
            const startY = Math.min(y1, y2);
            paper.rect(startX, startY, Math.abs(mPath[2]), Math.abs(mPath[3]))
              .attr({ 'stroke': color, 'stroke-width': 2 });
          }
        }
      }
    }
  };
  img.src = imageUrl;

}

function colorForDisease(disease) {
  for (const dis of disease) {
    if (dis.id === disease) {
      return dis.color;
    }
  }
  return diseases[diseases.length - 1].color;
}
