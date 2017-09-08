/*
This serves ignition pointing at own ip for dns, sets node hostname and adds it to dnsmasq
docker run --rm -ti -v `pwd`/dns_hosts:/etc/hosts -v  `pwd`/dns-helper.js:/dns-helper.js --name dns-helper --network=host  node:8.4-alpine node dns-helper.js bootstrap example.com /etc/hosts 8081
docker kill dns-helper ; docker rm dns-helper
docker run --rm -ti -v `pwd`/node_modules:/node_modules -v `pwd`/package.json:/package.json -v  `pwd`/dns-helper.js:/dns-helper.js --name dns-helpper --network=host  node:8.4-alpine yarn add ip
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

function get_default_route_interface() {
    const route = fs.readFileSync('/proc/net/route');
    var line = route.toString().split("\n")[1]
    var interface = line.split("\t")[0]
    return interface
}

function read_hosts(filename) {
    var contents = null
    try {
        var contents = fs.readFileSync(filename).toString()
    } catch(e) {
        if (e.code == "ENOENT")
            return {}
        throw e
    }
    var hosts = {}
    var ips = {}
    contents.split("\n").forEach(line => {
        var space_index = line.search(/\s+/)
        // skip incomplete lines
        if (space_index < 7) // less than minimum entry length, eg of '1.2.3.4'
            return
        var ip = line.substr(0, space_index)
        var hostname = line.substr(space_index + 1).trimLeft()
        hosts[ip] = hostname
        ips[hostname] = ip
        console.log(`${ip} ${hostname} added from ${filename}`)
    })
    return [hosts, ips]
}
function main() {
    if (process.argv.length != 6) {
        console.error(`Usage ${process.argv[0]} ${process.argv[1]} <my_short_hostname> <my_domain> <hosts_file> <listen_port>`)
        process.exit(1)
    }
    var arg = 2;
    var my_hostname = process.argv[arg++]
    var domain = process.argv[arg++]
    var hosts_filename = process.argv[arg++]
    var [hosts, ips] = read_hosts(hosts_filename)
    var listen_port = process.argv[arg++] * 1
    var my_ip = os.networkInterfaces()[get_default_route_interface()][0].address

    function flush() {
        var str = ""
        Object.entries(hosts).forEach(([ip, hostname]) => {
            str += ip + " " + hostname + "\n"
        })
        fs.writeFileSync(hosts_filename, str)
    }
    function commitEntry(ip, hostname) {
        hosts[ip] = hostname
        ips[hostname] = ip
        flush()
    }
    commitEntry(my_ip, my_hostname)

    http.createServer(function (req, res) {
        var reqip = req.connection.remoteAddress
        var client_hostname = null
        var node_type = req.url.substring(1)
        if (reqip in hosts) {
            client_hostname = hosts[reqip]
        } else {
            var client_hostname = null
            var counter = 1
            do {
                client_hostname = node_type + counter++
            } while(client_hostname in ips)
            commitEntry(reqip, client_hostname)
        }
        console.log(`Response to ${reqip}: ${client_hostname}`)
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