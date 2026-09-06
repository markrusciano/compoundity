A = "23456789CFGHJMPQRVWX"
SEP = 8
PAIR = 10
GRID_ROWS, GRID_COLS = 5, 4

def encode(lat, lon, length=11):
    lat = min(max(lat, -90), 90)
    lon = ((lon + 180) % 360) - 180
    if lat == 90: lat = 90 - 1e-9
    la = lat + 90.0
    lo = lon + 180.0
    code = ""
    # pair section
    res = 20.0
    for i in range(PAIR // 2):
        d1 = int(la / res); d2 = int(lo / res)
        code += A[d1] + A[d2]
        la -= d1 * res; lo -= d2 * res
        res /= 20.0
    # grid section
    latres = 1/8000.0; lonres = 1/8000.0
    for i in range(length - PAIR):
        latres /= GRID_ROWS; lonres /= GRID_COLS
        r = int(la / latres); c = int(lo / lonres)
        code += A[r * GRID_COLS + c]
        la -= r * latres; lo -= c * lonres
    return code[:SEP] + "+" + code[SEP:length]

def decode(code):
    code = code.replace("+", "")
    la = -90.0; lo = -180.0
    res = 20.0
    n = len(code)
    i = 0
    while i < min(n, PAIR):
        la += A.index(code[i]) * res
        lo += A.index(code[i+1]) * res
        i += 2
        if i < PAIR: res /= 20.0
    latres, lonres = res, res
    for j in range(PAIR, n):
        latres /= GRID_ROWS; lonres /= GRID_COLS
        v = A.index(code[j])
        la += (v // GRID_COLS) * latres
        lo += (v % GRID_COLS) * lonres
    return la, lo, la + latres, lo + lonres

def recover(short, ref_lat, ref_lon):
    pad = 8 - (len(short) - 1 - short.index("+")) - short.index("+")
    # number of chars dropped from the front
    drop = SEP - short.index("+")
    prefix = encode(ref_lat, ref_lon, 11).replace("+", "")[:drop]
    full = prefix + short.replace("+", "")
    full = full[:SEP] + "+" + full[SEP:]
    lo_, la_, hi_, hb_ = decode(full)
    return full

# Washington DC reference
ref = (38.9072, -77.0369)
print("DC full code:", encode(ref[0], ref[1], 11))
full = recover("VXXJ+F6H", *ref)
print("recovered full:", full)
s_lat, s_lon, e_lat, e_lon = decode(full)
clat = (s_lat + e_lat) / 2; clon = (s_lon + e_lon) / 2
print("center lat/lon: %.6f, %.6f" % (clat, clon))
print("box: %.6f..%.6f , %.6f..%.6f" % (s_lat, e_lat, s_lon, e_lon))
