#!/bin/sh 
set -x -e
#bootkube render --asset-dir=assets --api-servers=https://node1.example.com:443 --api-server-alt-names=DNS=node1.example.com --etcd-servers=https://node1.example.com:2379
#We're ready to use bootkube to create a temporary control plane and bootstrap a self-hosted Kubernetes cluster.

#Secure copy the etcd TLS assets to /etc/ssl/etcd/* on every controller node.
for node in 'node1'; do
   scp -r assets/tls/etcd-* assets/tls/etcd core@$node.example.com:/home/core/
   ssh core@$node.example.com 'sudo mkdir -p /etc/ssl/etcd && sudo mv etcd-* etcd /etc/ssl/etcd/ && sudo chown -R etcd:etcd /etc/ssl/etcd && sudo chmod -R 500 /etc/ssl/etcd/'
done

#Secure copy the kubeconfig to /etc/kubernetes/kubeconfig on every node to path activate the kubelet.service.
for node in 'node1' 'node2' 'node3'; do
    scp assets/auth/kubeconfig core@$node.example.com:/home/core/kubeconfig
    ssh core@$node.example.com 'sudo mv kubeconfig /etc/kubernetes/kubeconfig'
    ssh core@$node.example.com sudo systemctl enable iscsid
    ssh core@$node.example.com sudo systemctl start iscsid
done

#echo give kubelet few min to start
#sleep 120

#Secure copy the bootkube generated assets to any controller node and run bootkube-start (takes ~10 minutes).

scp -r assets core@node1.example.com:/home/core
ssh core@node1.example.com 'sudo mv assets /opt/bootkube/assets && sudo systemctl start bootkube'

#ssh core@node1.example.com journalctl -f
until kubectl get pods -o wide; do
	sleep 30
done
./part3.sh
