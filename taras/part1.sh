#!/bin/sh 
set -x
sudo CONTAINER_RUNTIME=docker ../scripts/devnet destroy
sudo ../scripts/libvirt destroy
set -e
(cd ../ && sudo CONTAINER_RUNTIME=docker ./scripts/devnet create bootkube)
sudo ../scripts/libvirt create-docker

#sudo /sbin/iptables -t nat -I PREROUTING -p tcp --dport 443 -j DNAT --to 172.17.0.21:443