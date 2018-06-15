
GET getProgress.php?author=xxx -> {"marked": int, "total": int}

GET getNextImage.php?author=xxx -> {"next_image": int, "image_url": "0/xxx.jpg"}
  - image_url part still TODO
  - if no images left, next_image == -1

GET getDiseases.php -> [{"name": string, "id:" int}, ...]

POST upload.php
  {"image_id": int,
  "author": string,
  "paths": like, whatever, man,
  "severities": [
    {"1": int},
    ...
  ]};

  -> {"mark_id": int}

GET getImage.php?id=xxx -> raw image data

GET addNewImages.php -> add new images in $imgdir to the Images table (will skip duplicates), meant to be opened in a web browser (has UI + preview before adding)

on error, all API requests return {"errorMessage": "a potentially helpful error message"}
