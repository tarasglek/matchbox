import sys

"""
controller:
ipv6: fd69:726e:6574:3::1000/64
ipv4.data: 198.19.0.10/28
ipv4.admin: 10.201.123.140/27
ipv4.bond: 198.18.94.1
vlan.data: 4001
hostname: controller
"""

IPs = ["198.18.94.1", "198.18.94.10", "198.18.94.17"]
NFS_IPs = ["198.19.0.1", "198.19.0.17", "198.19.0.33"]
DATA_IPs = ["198.19.0.10", "198.19.0.27", "198.19.0.43"]
NAMEs = ["controller", "worker1", "worker2"]

def main():
    assert(len(sys.argv) == 2)
    node_number = int(sys.argv[1])
    node_index = node_number - 1
    ipv6 = "fd69:726e:6574:3::%d" % (1000 + node_index)
    ipv4_data = DATA_IPs[node_index]
    ipv4_admin = "10.201.123.%d" % (140 + node_index)
    bond_ip = IPs[node_index]
    vlan_data = str(4000 + node_number)
    hostname = NAMEs[node_index]
    nfs_server_ip = NFS_IPs[node_index]
    out = sys.stdin.read() 
    out = out.replace("TEMPLATE_NODE_IPV6", ipv6)
    out = out.replace("TEMPLATE_NODE_DATA_IP", ipv4_data)
    out = out.replace("TEMPLATE_NODE_ADMIN_IP", ipv4_admin)
    out = out.replace("TEMPLATE_NODE_BOND_IP", bond_ip)
    out = out.replace("TEMPLATE_NODE_VLAN_ID", vlan_data)
    out = out.replace("TEMPLATE_NODE_HOSTNAME", hostname)
    out = out.replace("TEMPLATE_NODE_NFS_SERVER", nfs_server_ip)
    sys.stdout.write(out)

main()