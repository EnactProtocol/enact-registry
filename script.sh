#!/bin/bash

# iterate over "packages" directory, cd into each package and run "bun link" for each package and then cd out of the path
for package in packages/*; do
    echo "[...] Linking $package to bun"
    # $package is "packages/pkgdir"
    cd $package
    # get the "pkgdir" part from the string
    package_name=$(echo $package | cut -d'/' -f2)
    # ensure that this matches the "name" in each package.json in your local packages.
    # this only works if your package name matches the dir name ex. "ui" for dir "ui" etc.
    bun link "@enact/$package_name"
    cd ../..
    echo "[+] Done linking $package to bun"
done
