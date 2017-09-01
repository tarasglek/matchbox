/*
docker run --rm -ti -v `pwd`/dns_hosts:/etc/hosts -v  `pwd`/ignition_dns.js:/ignition_dns.js --name ignition_dns --network=host  node:8.4-alpine node ignition_dns.js /etc/hosts 8081
docker kill ignition_dns ; docker rm ignition_dns
docker run --rm -ti -v `pwd`/node_modules:/node_modules -v `pwd`/package.json:/package.json -v  `pwd`/ignition_dns.js:/ignition_dns.js --name ignition_dns --network=host  node:8.4-alpine yarn add ip
*/
var http = require('http')
var fs = require('fs')
var os = require('os')
var child_process = require('child_process')

const IGNITION_OBJ =
{
    "ignition": {
      "version": "2.0.0",
      "config": {
        "append": [
            {
              "source": "http://DNS_NAMESERVER:8080/ignition?k8s=NODE_TYPE",
              "verification": {}
            }
        ]
      }
    },
    "storage": {
      "files": [
        {
          "filesystem": "root",
          "path": "/etc/resolv.conf",
          "contents": {
            "source": "data:,search%20DNS_DOMAIN%0Anameserver%20DNS_NAMESERVER%0A",
            "verification": {}
          },
          "mode": 420,
          "user": {},
          "group": {}
        },
        {
          "filesystem": "root",
          "path": "/etc/hostname",
          "contents": {
            "source": "data:,DNS_NODE.DNS_DOMAIN",
            "verification": {}
          },
          "mode": 420,
          "user": {},
          "group": {}
        }
      ]
    },
    "systemd": {},
    "networkd": {},
    "passwd": {}
}

const IGNITION = JSON.stringify(IGNITION_OBJ)

function writeLine(fd, line) {
    fs.writeSync(fd, line + "\n")
    fs.fsyncSync(fd)
    console.log(line)
}

function get_default_route_interface() {
    const route = fs.readFileSync('/proc/net/route');
    var line = route.toString().split("\n")[1]
    var interface = line.split("\t")[0]
    return interface
}

function main() {
    if (process.argv.length != 6) {
        console.error(`Usage ${process.argv[0]} <my_short_hostname> <my_domain> <hosts_file> <listen_port>`)
        process.exit(1)
    }
    var arg = 2;
    var my_hostname = process.argv[arg++]
    var domain = process.argv[arg++]
    var hosts_fd = fs.openSync(process.argv[arg++], 'w')
    var listen_port = process.argv[arg++] * 1

    var counters = {}
    var my_ip = os.networkInterfaces()[get_default_route_interface()][0].address
    var nodes = {}
    nodes[my_hostname] = my_ip
    writeLine(hosts_fd, my_ip + " " + my_hostname)

    http.createServer(function (req, res) {
        var reqip = req.connection.remoteAddress
        var client_hostname = null
        var node_type = req.url.substring(1)
        if (reqip in nodes) {
            client_hostname = nodes[reqip]
        } else {
            if (!(node_type in counters)) {
                counters[node_type] = 1
            }
            nodes[reqip] = client_hostname = node_type + counters[node_type]++
            writeLine(hosts_fd, reqip + " " + client_hostname)
        }


        var str = IGNITION.replace(/DNS_NODE/g, client_hostname).
            replace(/DNS_DOMAIN/g, domain).
            replace(/DNS_NAMESERVER/g, my_ip).
            replace(/NODE_TYPE/g, node_type)
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': str.length,
        })
        res.end(str)
        child_process.exec("pkill -HUP dnsmasq")
    }).listen(listen_port, '0.0.0.0')

    console.error("Listening on port " + listen_port);
}
main()