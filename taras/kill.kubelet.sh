#!/bin/sh
set -x -e 
for node in 'node1' 'node2' 'node3' 'node4'; do
    ssh core@$node.example.com sudo pkill -f kubelet
done
#helm install stable/postgresql
ssh core@node1.example.com sudo systemctl start bootkube
