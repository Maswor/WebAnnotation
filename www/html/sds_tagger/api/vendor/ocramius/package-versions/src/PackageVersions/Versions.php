<?php

namespace PackageVersions;

/**
 * This class is generated by ocramius/package-versions, specifically by
 * @see \PackageVersions\Installer
 *
 * This file is overwritten at every run of `composer install` or `composer update`.
 */
final class Versions
{
    const VERSIONS = array (
  'jean85/pretty-package-versions' => '1.2@75c7effcf3f77501d0e0caa75111aff4daa0dd48',
  'nette/bootstrap' => 'v2.4.6@268816e3f1bb7426c3a4ceec2bd38a036b532543',
  'nette/di' => 'v2.4.12@8e717aed2d182a26763be58c220eebaaa32917df',
  'nette/finder' => 'v2.4.1@4d43a66d072c57d585bf08a3ef68d3587f7e9547',
  'nette/neon' => 'v2.4.2@9eacd50553b26b53a3977bfb2fea2166d4331622',
  'nette/php-generator' => 'v3.0.4@b381ecacbf5a0b5f99cc0b303d5b0578d409f446',
  'nette/robot-loader' => 'v3.0.3@92d4b40b49d5e2d9e37fc736bbcebe6da55fa44a',
  'nette/utils' => 'v2.5.2@183069866dc477fcfbac393ed486aaa6d93d19a5',
  'nikic/php-parser' => 'v3.1.5@bb87e28e7d7b8d9a7fda231d37457c9210faf6ce',
  'ocramius/package-versions' => '1.2.0@ad8a245decad4897cc6b432743913dad0d69753c',
  'phpstan/phpdoc-parser' => '0.2@02f909f134fe06f0cd4790d8627ee24efbe84d6a',
  'phpstan/phpstan' => '0.9.2@e59541bcc7cac9b35ca54db6365bf377baf4a488',
  'psr/log' => '1.0.2@4ebe3a8bf773a19edfe0a84b6585ba3d401b724d',
  'symfony/console' => 'v3.4.11@36f83f642443c46f3cf751d4d2ee5d047d757a27',
  'symfony/debug' => 'v3.4.11@b28fd73fefbac341f673f5efd707d539d6a19f68',
  'symfony/finder' => 'v3.4.11@472a92f3df8b247b49ae364275fb32943b9656c6',
  'symfony/polyfill-mbstring' => 'v1.8.0@3296adf6a6454a050679cde90f95350ad604b171',
  '__root__' => 'dev-master@9d9eed666ef7b67d19351fbdf7b4301e398ebfd2',
);

    private function __construct()
    {
    }

    /**
     * @throws \OutOfBoundsException if a version cannot be located
     */
    public static function getVersion(string $packageName) : string
    {
        if (! isset(self::VERSIONS[$packageName])) {
            throw new \OutOfBoundsException(
                'Required package "' . $packageName . '" is not installed: cannot detect its version'
            );
        }

        return self::VERSIONS[$packageName];
    }
}