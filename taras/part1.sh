#!/bin/sh 
set -x
sudo CONTAINER_RUNTIME=docker ../scripts/devnet destroy
sudo ../scripts/libvirt destroy
set -e
(cd ../ && sudo CONTAINER_RUNTIME=docker ./scripts/devnet create bootkube)
sudo ../scripts/libvirt create-docker
