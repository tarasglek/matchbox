#!/bin/sh 
set -x -e
#bootkube render --asset-dir=assets --api-servers=https://node1.example.com:443 --api-server-alt-names=DNS=node1.example.com --etcd-servers=https://node1.example.com:2379
#We're ready to use bootkube to create a temporary control plane and bootstrap a self-hosted Kubernetes cluster.

#echo give kubelet few min to start
#sleep 120

#Secure copy the bootkube generated assets to any controller node and run bootkube-start (takes ~10 minutes).

scp -r assets core@node1.example.com:/home/core
ssh core@node1.example.com 'sudo systemctl start bootkube'
ssh core@node1.example.com 'sudo mv assets /opt/bootkube/assets && sudo systemctl start bootkube'

#ssh core@node1.example.com journalctl -f
until kubectl get pods -o wide; do
	sleep 30
done
./part3.sh
