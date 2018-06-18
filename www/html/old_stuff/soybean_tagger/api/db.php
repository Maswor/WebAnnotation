<?php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function db_connect() {
  static $conn;

  if (!isset($conn)) {
    $cfg = parse_ini_file('../../.ht_soybean_app_config.ini', true);
    $dbcfg = $cfg['database'];
    $conn = mysqli_connect('localhost', $dbcfg['username'], $dbcfg['password'], "soybean_tagger");

    assert($conn != false, "DB connection failed");
  }

  return $conn;
}

?>
