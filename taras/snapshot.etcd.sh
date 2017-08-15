set -x -e
ssh core@node1.example.com sudo systemctl stop etcd-member
ssh core@node1.example.com sudo tar -f backup.tar -C /var/lib/etcd/ -czv .
ssh core@node1.example.com sudo systemctl start etcd-member
