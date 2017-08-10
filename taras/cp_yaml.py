#!/usr/bin/env python
import sys
"""
cat bootkube-controller.yaml |
  ./cp_yaml.py --group etcd --user etcd assets/tls/etcd-* /etc/ssl/etcd/ |
  ./cp_yaml.py --group etcd --user etcd  assets/tls/etcd/* /etc/ssl/etcd/etcd/ | 
  ./cp_yaml.py assets/auth/kubeconfig /etc/kubernetes/kubeconfig |
  ./cp_yaml.py --fullname `find assets/` /opt/bootkube/ |
  sed 's/^#/ /' > ../examples/ignition/bootkube-controller.yaml
cat bootkube-worker.yaml | ./cp_yaml.py assets/auth/kubeconfig /etc/kubernetes/kubeconfig|sed 's/^#/ /' > ../examples/ignition/bootkube-worker.yaml
"""
import os
import os.path
import stat
import argparse
from ruamel import yaml

def stat_mode(file_stat):
  # can't return fancy 0700 type octals because python yaml outputs them as strings
  return file_stat.st_mode & 0777
  # return (oct(file_stat.st_mode & 0777))

"""
If dest ends with slash, means we are copying into a directory
"""
def maybe_join(dest, src, fullname):
  if dest.endswith('/'):
    leaf = src
    if not fullname:
      leaf = os.path.basename(leaf)
    return os.path.join(dest, leaf)
  else:
    return dest

def copy(src_files, dest_dir, opts):
  y = yaml.round_trip_load(sys.stdin)
  files = y['storage']['files']
  try:
    directories = y['storage']['directories']
  except KeyError:
    y['storage']['directories'] = directories = []

  for p in files:
    path = p['path']
    if path in src_files:
      raise KeyError("Refuse to overwrite file: " + path)
  for filename in src_files:
    file_stat = os.stat(filename)
    entry = {
        'path': maybe_join(dest_dir, filename, opts.fullname),
        'filesystem': 'root',
        'mode': stat_mode(file_stat),
    }
    if opts.user:
        entry['user'] = dict([('name', opts.user)])
    if opts.group:
        entry['group'] = dict([('group', opts.user)])

    if stat.S_ISDIR(file_stat.st_mode):
      directories.append(entry)
    else:
      entry['contents'] = dict([('inline', open(filename, 'rb').read())])
      files.append(entry)

  # print 
  yaml.round_trip_dump(y, sys.stdout)

def main():
  parser = argparse.ArgumentParser(description='Copy files into ignition yaml')
  parser.add_argument('--user', dest='user', help='file owner user')
  parser.add_argument('--group', dest='group', help='file owner group')
  parser.add_argument('--fullname',  action='store_true', dest='fullname', default=False, help='trim src file to basename before appending to destdir')

  (parsed, unparsed) = parser.parse_known_args()
  copy(unparsed[:-1], unparsed[-1], parsed)

main()
