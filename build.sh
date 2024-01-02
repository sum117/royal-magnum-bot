#!/bin/bash

src_dir="src/assets"
build_dir="build/assets"

if [ -d "$src_dir" ]; then
    mkdir -p "$build_dir"

    cp -r "$src_dir"/* "$build_dir"

    echo "Assets moved successfully."
else
    echo "Source directory '$src_dir' not found."
fi
