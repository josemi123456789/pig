import urllib.request
import io
import mimetypes

url = "http://localhost:8000/predict/batch/"
filepath = "data/dataset_desercion_final.csv"

with open(filepath, 'rb') as f:
    file_data = f.read()

boundary = 'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T'
headers = {'Content-type': f'multipart/form-data; boundary={boundary}'}

data = []
data.append(f'--{boundary}')
data.append(f'Content-Disposition: form-data; name="file"; filename="dataset_desercion_final.csv"')
data.append('Content-Type: text/csv')
data.append('')
data.append(file_data.decode('utf-8'))
data.append(f'--{boundary}--')
data.append('')
body = '\r\n'.join(data).encode('utf-8')

req = urllib.request.Request(url, data=body, headers=headers)
try:
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
    print("BODY:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("BODY:", e.read().decode('utf-8'))
