import urllib.request
import json
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://urban-intelligence-ocmo.onrender.com/?t=check', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=30, context=ctx) as res:
        html = res.read().decode('utf-8')
        scripts = re.findall(r'src="([^"]+)"', html)
        print("HTML Status:", res.status)
        print("Scripts deployed:", scripts)
except Exception as e:
    print("Error:", e)
