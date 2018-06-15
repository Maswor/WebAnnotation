<?php

// relative path to this script on the server where image for $id is/should be saved
function get_image_path($id) {
  static $image_dir;
  if (!isset($image_dir)) {
    $cfg = parse_ini_file('../.ht_soybean_app_config.ini', true);
    $image_dir = $cfg['images']['directory'];
    if (!$image_dir)
      $image_dir = "images";
  }

  return $image_dir . '/' . $id;
}

// if we ever need to include the full URL instead of a relative one, use this
function get_image_url($id) {
  return get_image_path($id);
}

// take a base64-encoded image, decode it, and save it at get_image_path($id)
function save_image_base64($id, $b64_data) {
  // if the base64 string starts with something like "data:image/png;base64,",
  // filter that out before we try to decode it
  if (strpos($b64_data, 'data:image') === 0)
    $b64_data = explode(',', $b64_data)[1];

  $img_data = base64_decode($b64_data);
  $path = get_image_path($id);
  $fp = fopen($path, 'xb');
  if ($fp === false)
    throw new Exception("Could not open file '" . $path . "' to save image");

  if (fwrite($fp, $img_data) === false)
    throw new Exception("Could not write file '" . $path . "' to save image");

  fclose($fp);
}

?>
