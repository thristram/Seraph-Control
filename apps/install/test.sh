#!/usr/bin/env bash


updateInstruction="update"
    while IFS='' read -r line || [[ -n "$line" ]]; do
    name="$line"
    echo "$line"
    done < "$updateInstruction"